/**
 * Danny's 40th ticket backend.
 *
 * Consolidated version: booking, attendee, payment audit, and fallback RSVP data
 * are all stored on the single Bookings sheet.
 *
 * Deploy as a Google Apps Script Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 */

const SPREADSHEET_ID = "1gm092BqUFt9eI2Yy9whVMyGyXDzWTkNY4uoGoGl5SCU";
const BOOKINGS_SHEET_NAME = "Bookings";
const TALLY_SHEET_NAME = "Danny's 40th Summer Weekender - 24th - 27th July";
const DASHBOARD_SHEET_NAME = "Dashboard";
const DASHBOARD_TITLE = "Danny's 40th Dashboard (live)";
const DASHBOARD_LAST_ROW = 2000;
const FALLBACK_TALLY_SHEET_NAMES = [
  TALLY_SHEET_NAME,
  "Sheet1"
];
const PROTECTED_SHEET_NAMES = [
  TALLY_SHEET_NAME,
  "Budget",
  DASHBOARD_SHEET_NAME,
  BOOKINGS_SHEET_NAME
];
const GENERATED_SHEETS_TO_REVIEW = [
  "Attendees",
  "Cost Tally",
  "Sheet1"
];
const GENERATED_SHEETS_SAFE_TO_ARCHIVE = [
  "Attendees",
  "Cost Tally"
];

const BREAK_EVEN_TARGET = 1500;
const ADULT_CAMPING_PER_NIGHT = 15;
const CHILD_CAMPING_PER_NIGHT = 7.5;
const PAYMENT_LINK = "https://settleup.starlingbank.com/daniel-page-e74b5b";

const HEADERS = [
  "Submitted At",
  "Booking ID",
  "Attendee Numbers",
  "Lead First Name",
  "Lead Last Name",
  "Lead Nickname",
  "Name",
  "Email",
  "Phone",
  "Adult Count",
  "Child Count",
  "Under 5 Count",
  "Total People",
  "Donation Per Adult",
  "Donation Total",
  "Accommodation Type",
  "Friday Night",
  "Saturday Night",
  "Sunday Night",
  "Camping Nights Charged",
  "Adult Camping Total",
  "Child Camping Total",
  "Camping Total",
  "Tent Camping Payment Route",
  "Camping Payable To Danny",
  "Total Payable To Danny",
  "Grand Total",
  "Payment Status",
  "Payment Reference",
  "Donation Paid",
  "Camping Paid",
  "Amount Paid Total",
  "Balance Remaining",
  "Tally Email Found",
  "Tally Lookup Done",
  "Tally Row Number",
  "Previous Tally Name",
  "Trust Confirm",
  "Details Confirm",
  "Manual Payment Confirm",
  "Ticket Emailed At",
  "Danny Emailed At",
  "Payment Link",
  "Page URL",
  "User Agent",
  "Attendees JSON",
  "Tally Fallback JSON",
  "Extra Nights Note",
  "Notes"
];

function doGet(e) {
  const action = String((e && e.parameter && e.parameter.action) || "summary");

  if (action === "summary") {
    ensureDashboardSetup();
    return json({
      donationRaised: getDonationRaised(),
      eventFundTarget: BREAK_EVEN_TARGET,
      breakEvenTarget: BREAK_EVEN_TARGET
    });
  }

  if (action === "checkTally") {
    const email = normalizeEmail((e && e.parameter && e.parameter.email) || "");
    const result = email ? findTallyByEmail(email) : { tallyFound: false };
    return json({
      email,
      tallyFound: Boolean(result.tallyFound),
      rowNumber: result.rowNumber || "",
      sheetName: result.sheetName || "",
      name: result.name || ""
    });
  }

  if (action === "checkBooking") {
    const email = normalizeEmail((e && e.parameter && e.parameter.email) || "");
    const result = email ? findBookingByEmail(email) : { bookingFound: false };
    return json({
      email,
      bookingFound: Boolean(result.bookingFound),
      bookingId: result.bookingId || "",
      submittedAt: result.submittedAt || "",
      name: result.name || ""
    });
  }

  return json({ ok: false, error: "Unknown action." });
}

function doPost(e) {
  let lock = null;
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || "{}");

    if (payload.website) return json({ ok: false, error: "Spam detected." });

    const elapsed = Date.now() - Number(payload.formLoadTime || 0);
    if (elapsed < 3000) return json({ ok: false, error: "Submission too fast." });

    const clean = validateAndCleanPayload(payload);
    const bookingId = createBookingId();
    const tallyResult = findTallyByEmail(clean.email);

    lock = LockService.getScriptLock();
    lock.waitLock(30000);

    const sheet = getBookingsSheet();
    const attendeeNumbers = getNextAttendeeNumbers(sheet, clean.totalPeople);
    const row = buildBookingRow(clean, bookingId, attendeeNumbers, tallyResult);
    appendRowObject(sheet, row);

    const rowNumber = sheet.getLastRow();
    lock.releaseLock();
    lock = null;

    const emailWarnings = [];

    try {
      sendTicketEmail(clean, bookingId, attendeeNumbers);
      setCellByHeader(sheet, rowNumber, "Ticket Emailed At", new Date().toISOString());
    } catch (ticketErr) {
      emailWarnings.push("Ticket email failed: " + ticketErr.message);
    }

    try {
      sendAdminBookingEmail(clean, bookingId, attendeeNumbers, tallyResult);
      setCellByHeader(sheet, rowNumber, "Danny Emailed At", new Date().toISOString());
    } catch (adminErr) {
      emailWarnings.push("Admin email failed: " + adminErr.message);
    }

    if (emailWarnings.length) {
      appendCellByHeader(sheet, rowNumber, "Notes", emailWarnings.join(" | "));
    }

    return json({
      ok: true,
      bookingId,
      attendeeNumbers,
      donationTotal: clean.donationTotal,
      ticketDonationOwed: clean.donationTotal,
      campingTotal: clean.campingTotal,
      tentCampingCost: clean.campingTotal,
      campingPayableToDanny: clean.campingPayableToDanny,
      tentCampingPayableToDanny: clean.campingPayableToDanny,
      totalPayableToDanny: clean.totalPayableToDanny,
      grandTotal: clean.totalPayableToDanny,
      paymentStatus: clean.paymentStatus,
      tallyFound: Boolean(tallyResult.tallyFound),
      tallyCreatedByBookingForm: false,
      warnings: emailWarnings
    });
  } catch (err) {
    return json({ ok: false, error: err.message });
  } finally {
    if (lock) {
      try {
        lock.releaseLock();
      } catch (releaseErr) {
        // Ignore release errors if the lock has already gone away.
      }
    }
  }
}

function validateAndCleanPayload(payload) {
  const adultCount = Math.max(1, parseInt(payload.adultCount, 10) || 1);
  const childCount = Math.max(0, parseInt(payload.childCount, 10) || 0);
  const under5Count = Math.max(0, parseInt(payload.under5Count, 10) || 0);
  const totalPeople = adultCount + childCount + under5Count;

  const donationPerAdult = Math.max(0, Number(payload.donationPerAdult || 0));
  const donationTotal = adultCount * donationPerAdult;

  const fridayNight = normalizeNight(payload.fridayNight, payload.stayFriday);
  const saturdayNight = normalizeNight(payload.saturdayNight, payload.staySaturday);
  const sundayNight = normalizeNight(payload.sundayNight, payload.staySunday);
  const campingNights = [fridayNight, saturdayNight, sundayNight].filter(v => v === "yes").length;

  const accommodationType = String(payload.accommodationType || "").trim();
  const tentCampingPaymentRoute = String(
    payload.tentCampingPaymentRoute ||
    (payload.includeCampingInPayment ? "pay_through_danny" : "not_applicable")
  ).trim();
  const isTentCamping = accommodationType === "tent" || tentCampingPaymentRoute === "pay_through_danny";

  const adultCampingTotal = isTentCamping ? adultCount * campingNights * ADULT_CAMPING_PER_NIGHT : 0;
  const childCampingTotal = isTentCamping ? childCount * campingNights * CHILD_CAMPING_PER_NIGHT : 0;
  const campingTotal = adultCampingTotal + childCampingTotal;
  const campingPayableToDanny = tentCampingPaymentRoute === "pay_through_danny" ? campingTotal : 0;
  const totalPayableToDanny = donationTotal + campingPayableToDanny;

  const leadFirstName = String(payload.leadFirstName || "").trim();
  const leadLastName = String(payload.leadLastName || "").trim();
  const leadNickname = String(payload.leadNickname || "").trim();
  const name = String(payload.name || payload.leadName || [leadFirstName, leadLastName].filter(Boolean).join(" ")).trim();
  const email = normalizeEmail(payload.email || payload.leadEmail || "");
  const phone = String(payload.phone || payload.leadPhone || "").trim();

  if (!name) throw new Error("Name is required.");
  if (!email || !email.includes("@")) throw new Error("Valid email is required.");
  if (!phone) throw new Error("Phone number is required.");
  if (!Boolean(payload.trustConfirm)) throw new Error("Trust/payment confirmation is required.");
  if (!Boolean(payload.detailsConfirm)) throw new Error("Details confirmation is required.");
  if (totalPayableToDanny > 0 && !Boolean(payload.manualPaymentConfirm)) {
    throw new Error("Payment confirmation is required.");
  }

  return {
    submittedAt: String(payload.submittedAt || new Date().toISOString()),
    leadFirstName,
    leadLastName,
    leadNickname,
    name,
    email,
    phone,
    adultCount,
    childCount,
    under5Count,
    totalPeople,
    donationPerAdult,
    donationTotal,
    accommodationType,
    fridayNight,
    saturdayNight,
    sundayNight,
    campingNights,
    adultCampingTotal,
    childCampingTotal,
    campingTotal,
    campingPayableToDanny,
    tentCampingPaymentRoute,
    totalPayableToDanny,
    paymentStatus: totalPayableToDanny > 0 ? "Assumed paid - check Starling" : "Nothing owed",
    paymentReference: "",
    donationPaid: donationTotal,
    campingPaid: campingPayableToDanny,
    amountPaidTotal: totalPayableToDanny,
    balanceRemaining: 0,
    tallyLookupDone: Boolean(payload.tallyLookupDone),
    trustConfirm: Boolean(payload.trustConfirm),
    detailsConfirm: Boolean(payload.detailsConfirm),
    manualPaymentConfirm: Boolean(payload.manualPaymentConfirm),
    paymentLink: PAYMENT_LINK,
    pageUrl: String(payload.pageUrl || ""),
    userAgent: String(payload.userAgent || ""),
    attendees: Array.isArray(payload.attendees) ? payload.attendees : [],
    tallyFallback: payload.tallyFallback || {},
    extraNightsNote: String(payload.extraNightsNote || "")
  };
}

function normalizeNight(value, legacyBoolean) {
  const str = String(value || "").trim().toLowerCase();
  if (str === "yes" || str === "no" || str === "not_sure") return str;
  if (legacyBoolean === true) return "yes";
  if (legacyBoolean === false) return "no";
  return "";
}

function buildBookingRow(clean, bookingId, attendeeNumbers, tallyResult) {
  return {
    "Submitted At": clean.submittedAt,
    "Booking ID": bookingId,
    "Attendee Numbers": attendeeNumbers.join(", "),
    "Lead First Name": clean.leadFirstName,
    "Lead Last Name": clean.leadLastName,
    "Lead Nickname": clean.leadNickname,
    "Name": clean.name,
    "Email": clean.email,
    "Phone": clean.phone,
    "Adult Count": clean.adultCount,
    "Child Count": clean.childCount,
    "Under 5 Count": clean.under5Count,
    "Total People": clean.totalPeople,
    "Donation Per Adult": clean.donationPerAdult,
    "Donation Total": clean.donationTotal,
    "Accommodation Type": clean.accommodationType,
    "Friday Night": clean.fridayNight,
    "Saturday Night": clean.saturdayNight,
    "Sunday Night": clean.sundayNight,
    "Camping Nights Charged": clean.campingNights,
    "Adult Camping Total": clean.adultCampingTotal,
    "Child Camping Total": clean.childCampingTotal,
    "Camping Total": clean.campingTotal,
    "Tent Camping Payment Route": clean.tentCampingPaymentRoute,
    "Camping Payable To Danny": clean.campingPayableToDanny,
    "Total Payable To Danny": clean.totalPayableToDanny,
    "Grand Total": clean.totalPayableToDanny,
    "Payment Status": clean.paymentStatus,
    "Payment Reference": clean.paymentReference,
    "Donation Paid": clean.donationPaid,
    "Camping Paid": clean.campingPaid,
    "Amount Paid Total": clean.amountPaidTotal,
    "Balance Remaining": clean.balanceRemaining,
    "Tally Email Found": Boolean(tallyResult.tallyFound),
    "Tally Lookup Done": clean.tallyLookupDone,
    "Tally Row Number": tallyResult.rowNumber || "",
    "Previous Tally Name": tallyResult.name || "",
    "Trust Confirm": clean.trustConfirm,
    "Details Confirm": clean.detailsConfirm,
    "Manual Payment Confirm": clean.manualPaymentConfirm,
    "Payment Link": clean.paymentLink,
    "Page URL": clean.pageUrl,
    "User Agent": clean.userAgent,
    "Attendees JSON": JSON.stringify(clean.attendees),
    "Tally Fallback JSON": JSON.stringify(clean.tallyFallback),
    "Extra Nights Note": clean.extraNightsNote,
    "Notes": ""
  };
}

function getBookingsSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(BOOKINGS_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(BOOKINGS_SHEET_NAME);
  }

  ensureHeaders(sheet);
  return sheet;
}

function getDashboardSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  let sheet = ss.getSheetByName(DASHBOARD_SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(DASHBOARD_SHEET_NAME);
  }

  return sheet;
}

function listGeneratedSheetsForCleanup() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const protectedNames = new Set(PROTECTED_SHEET_NAMES);
  return ss.getSheets()
    .map(sheet => sheet.getName())
    .filter(name => !protectedNames.has(name))
    .map(name => ({
      sheetName: name,
      generatedByOldTicketBackend: GENERATED_SHEETS_TO_REVIEW.indexOf(name) !== -1,
      action: GENERATED_SHEETS_TO_REVIEW.indexOf(name) !== -1 ? "review before archiving" : "leave unless you recognise it as generated"
    }));
}

function archiveKnownGeneratedSheetsAfterManualReview(confirmText) {
  if (confirmText !== "archive old generated ticket sheets") {
    throw new Error('Pass confirmText = "archive old generated ticket sheets" to archive Attendees and Cost Tally.');
  }

  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const protectedNames = new Set(PROTECTED_SHEET_NAMES);
  const archived = [];
  GENERATED_SHEETS_SAFE_TO_ARCHIVE.forEach(name => {
    if (protectedNames.has(name)) return;
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const archiveName = "Archive - " + name;
    let finalName = archiveName;
    let suffix = 2;
    while (ss.getSheetByName(finalName)) {
      finalName = archiveName + " " + suffix;
      suffix++;
    }
    sheet.setName(finalName);
    archived.push({ from: name, to: finalName });
  });
  return archived;
}

function ensureHeaders(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const existing = sheet.getRange(1, 1, 1, lastColumn).getValues()[0].map(v => String(v || "").trim());
  const hasAnyHeader = existing.some(Boolean);

  if (!hasAnyHeader) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }

  const headersToAdd = HEADERS.filter(header => existing.indexOf(header) === -1);
  if (headersToAdd.length) {
    sheet.getRange(1, existing.length + 1, 1, headersToAdd.length).setValues([headersToAdd]);
  }

  sheet.setFrozenRows(1);
}

function appendRowObject(sheet, rowObj) {
  const headers = getSheetHeaders(sheet);
  const row = headers.map(header => Object.prototype.hasOwnProperty.call(rowObj, header) ? rowObj[header] : "");
  sheet.appendRow(row);
}

function setCellByHeader(sheet, rowNumber, header, value) {
  const headers = getSheetHeaders(sheet);
  const index = headers.indexOf(header);
  if (index === -1) return;
  sheet.getRange(rowNumber, index + 1).setValue(value);
}

function appendCellByHeader(sheet, rowNumber, header, value) {
  const headers = getSheetHeaders(sheet);
  const index = headers.indexOf(header);
  if (index === -1) return;

  const range = sheet.getRange(rowNumber, index + 1);
  const existing = String(range.getValue() || "").trim();
  range.setValue(existing ? existing + " | " + value : value);
}

function getSheetHeaders(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(v => String(v || "").trim());
}

function getDonationRaised() {
  const sheet = getBookingsSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;

  const headers = values[0].map(h => String(h || "").trim());
  const donationPaidIndex = headers.indexOf("Donation Paid");
  const donationTotalIndex = headers.indexOf("Donation Total");
  const paymentStatusIndex = headers.indexOf("Payment Status");

  return values.slice(1).reduce((sum, row) => {
    const status = paymentStatusIndex >= 0 ? String(row[paymentStatusIndex] || "").toLowerCase() : "";
    if (status.includes("cancel") || status.includes("refund") || status.includes("void")) return sum;

    const donationPaid = donationPaidIndex >= 0 ? Number(row[donationPaidIndex] || 0) : 0;
    if (donationPaid > 0) return sum + donationPaid;

    const donationTotal = donationTotalIndex >= 0 ? Number(row[donationTotalIndex] || 0) : 0;
    return sum + donationTotal;
  }, 0);
}

// Write the Dashboard once as live formulas that read straight from the Bookings
// sheet. After this runs, Google Sheets keeps every figure up to date itself, so
// the booking flow never writes numbers into the Dashboard again.
function ensureDashboardSetup() {
  const dashboardSheet = getDashboardSheet();
  const a1 = String(dashboardSheet.getRange("A1").getValue() || "").trim();
  // B2 (Bookings Count) must be a live formula. getFormula() returns "" for a
  // static value, so an older dashboard that baked in dead numbers gets rebuilt
  // into live formulas the next time the website asks for the summary.
  const hasLiveFormulas = Boolean(dashboardSheet.getRange("B2").getFormula());
  if (a1 !== DASHBOARD_TITLE || !hasLiveFormulas) setupDashboardSheet();
}

function setupDashboardSheet() {
  const bookingsSheet = getBookingsSheet();
  const dashboardSheet = getDashboardSheet();
  const headers = getSheetHeaders(bookingsSheet);

  const sheetRef = "'" + BOOKINGS_SHEET_NAME + "'!";

  function colRange(header) {
    const index = headers.indexOf(header);
    if (index === -1) return null;
    const letter = columnToLetter(index + 1);
    return sheetRef + letter + 2 + ":" + letter + DASHBOARD_LAST_ROW;
  }

  // Factor that zeroes out rows whose Payment Status mentions cancel/refund/void.
  const statusRange = colRange("Payment Status");
  const exclusion = statusRange
    ? '*(ISNUMBER(SEARCH("cancel",' + statusRange + '))=FALSE)' +
      '*(ISNUMBER(SEARCH("refund",' + statusRange + '))=FALSE)' +
      '*(ISNUMBER(SEARCH("void",' + statusRange + '))=FALSE)'
    : '';

  function sumFormula(header) {
    const range = colRange(header);
    if (!range) return 0;
    return '=SUMPRODUCT(N(' + range + ')' + exclusion + ')';
  }

  const bookingIdRange = colRange("Booking ID");
  const bookingsCountFormula = bookingIdRange
    ? '=SUMPRODUCT((' + bookingIdRange + '<>"")' + exclusion + ')'
    : 0;

  const rows = [
    [DASHBOARD_TITLE, ""],
    ["Bookings Count", bookingsCountFormula],
    ["Total People", sumFormula("Total People")],
    ["Donation Raised", sumFormula("Donation Paid")],
    ["Camping Committed", sumFormula("Camping Paid")],
    ["Total Committed To Danny", sumFormula("Amount Paid Total")],
    ["Outstanding Balance", sumFormula("Balance Remaining")],
    ["Event Fund Target", BREAK_EVEN_TARGET],
    ["Remaining To Target", "=MAX(0,B8-B4)"]
  ];

  dashboardSheet.clear();
  dashboardSheet.getRange(1, 1, rows.length, 2).setValues(rows);
  dashboardSheet.setFrozenRows(1);
  dashboardSheet.getRange("A11").setValue(
    "Live — recalculates automatically from the Bookings sheet. Re-run setupDashboardSheet() only if Bookings columns are added or reordered."
  );
}

function columnToLetter(column) {
  let letter = "";
  while (column > 0) {
    const remainder = (column - 1) % 26;
    letter = String.fromCharCode(remainder + 65) + letter;
    column = Math.floor((column - remainder - 1) / 26);
  }
  return letter;
}

function getNextAttendeeNumbers(sheet, totalPeople) {
  const values = sheet.getDataRange().getValues();
  const headers = values[0] || HEADERS;
  const attendeeIndex = headers.indexOf("Attendee Numbers");
  let maxNumber = 0;

  if (attendeeIndex === -1) return Array.from({ length: totalPeople }, (_, i) => i + 1);

  values.slice(1).forEach(row => {
    String(row[attendeeIndex] || "")
      .split(",")
      .map(s => parseInt(s.trim(), 10))
      .filter(n => Number.isFinite(n))
      .forEach(n => { if (n > maxNumber) maxNumber = n; });
  });

  return Array.from({ length: totalPeople }, (_, i) => maxNumber + i + 1);
}

function findTallyByEmail(email) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const candidateSheets = [];

  FALLBACK_TALLY_SHEET_NAMES.forEach(name => {
    const sheet = ss.getSheetByName(name);
    if (sheet && candidateSheets.indexOf(sheet) === -1) {
      candidateSheets.push(sheet);
    }
  });

  const firstSheet = ss.getSheets()[0];
  if (firstSheet && candidateSheets.indexOf(firstSheet) === -1) {
    candidateSheets.push(firstSheet);
  }

  for (let s = 0; s < candidateSheets.length; s++) {
    const tallySheet = candidateSheets[s];
    const values = tallySheet.getDataRange().getValues();
    if (values.length < 2) continue;

    const headers = values[0].map(h => String(h || "").trim().toLowerCase());
    const emailCol = headers.findIndex(h => h === "email" || h.includes("email"));
    const nameCol = headers.findIndex(h => h === "name" || h.includes("name"));
    if (emailCol === -1) continue;

    for (let i = 1; i < values.length; i++) {
      if (normalizeEmail(values[i][emailCol]) === email) {
        return {
          tallyFound: true,
          rowNumber: i + 1,
          sheetName: tallySheet.getName(),
          name: nameCol >= 0 ? String(values[i][nameCol] || "") : ""
        };
      }
    }
  }

  return { tallyFound: false };
}

function findBookingByEmail(email) {
  const sheet = getBookingsSheet();
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return { bookingFound: false };

  const headers = values[0].map(h => String(h || "").trim());
  const emailIndex = headers.indexOf("Email");
  const bookingIdIndex = headers.indexOf("Booking ID");
  const submittedAtIndex = headers.indexOf("Submitted At");
  const nameIndex = headers.indexOf("Name");
  if (emailIndex === -1) return { bookingFound: false };

  for (let i = values.length - 1; i >= 1; i--) {
    if (normalizeEmail(values[i][emailIndex]) === email) {
      return {
        bookingFound: true,
        bookingId: bookingIdIndex >= 0 ? String(values[i][bookingIdIndex] || "") : "",
        submittedAt: submittedAtIndex >= 0 ? String(values[i][submittedAtIndex] || "") : "",
        name: nameIndex >= 0 ? String(values[i][nameIndex] || "") : ""
      };
    }
  }

  return { bookingFound: false };
}

function sendTicketEmail(clean, bookingId, attendeeNumbers) {
  const subject = "Danny's 40th ticket - " + bookingId;
  const attachments = [
    htmlToPdf(buildTicketPdfHtml(clean, bookingId, attendeeNumbers), "Danny40th-Ticket-" + bookingId),
    htmlToPdf(buildWeekendGuidePdfHtml(), "Danny40th-Weekend-Guide")
  ];

  MailApp.sendEmail({
    to: clean.email,
    subject,
    body: buildTicketEmailBody(clean, bookingId, attendeeNumbers),
    htmlBody: buildTicketEmailHtml(clean, bookingId, attendeeNumbers),
    attachments,
    name: "Danny's 40th"
  });
}

function sendAdminBookingEmail(clean, bookingId, attendeeNumbers, tallyResult) {
  const adminEmail = Session.getEffectiveUser().getEmail();
  if (!adminEmail) return;

  const subject = "Danny's 40th booking received - " + clean.name + " - " + formatCurrency(clean.totalPayableToDanny);
  const body = [
    "New booking received.",
    "",
    "Booking reference: " + bookingId,
    "Name: " + clean.name,
    "Email: " + clean.email,
    "Phone: " + clean.phone,
    "Attendee numbers: " + attendeeNumbers.join(", "),
    "",
    "Adults: " + clean.adultCount,
    "Children aged 5+: " + clean.childCount,
    "Under-5s: " + clean.under5Count,
    "",
    "Donation total: " + formatCurrency(clean.donationTotal),
    "Camping payable to Danny: " + formatCurrency(clean.campingPayableToDanny),
    "Total payable to Danny: " + formatCurrency(clean.totalPayableToDanny),
    "Payment status: " + clean.paymentStatus,
    "",
    "Accommodation type: " + clean.accommodationType,
    "Tent camping payment route: " + clean.tentCampingPaymentRoute,
    "Nights: Friday " + clean.fridayNight + ", Saturday " + clean.saturdayNight + ", Sunday " + clean.sundayNight,
    "",
    "Tally email found: " + Boolean(tallyResult.tallyFound),
    "Tally row: " + (tallyResult.rowNumber || ""),
    "Previous tally name: " + (tallyResult.name || ""),
    "",
    "Payment link:",
    clean.paymentLink
  ].join("\n");

  MailApp.sendEmail({
    to: adminEmail,
    subject,
    body,
    name: "Danny's 40th"
  });
}

function getEmailSummaries(clean) {
  const nights = [
    clean.fridayNight === "yes" ? "Friday" : null,
    clean.saturdayNight === "yes" ? "Saturday" : null,
    clean.sundayNight === "yes" ? "Sunday" : null
  ].filter(Boolean);

  const attendeeSummary = [];
  if (clean.adultCount) attendeeSummary.push(clean.adultCount + " adult" + (clean.adultCount === 1 ? "" : "s"));
  if (clean.childCount) attendeeSummary.push(clean.childCount + " child" + (clean.childCount === 1 ? "" : "ren"));
  if (clean.under5Count) attendeeSummary.push(clean.under5Count + " under-5" + (clean.under5Count === 1 ? "" : "s"));

  const accommodationSummary = [];
  if (clean.accommodationType === "tent") accommodationSummary.push("Tent camping");
  else if (clean.accommodationType === "glamping") accommodationSummary.push("Glamping");
  else if (clean.accommodationType === "van") accommodationSummary.push("Van / campervan / motorhome");
  else if (clean.accommodationType === "not_staying") accommodationSummary.push("Not staying overnight");
  else if (clean.accommodationType === "not_sure") accommodationSummary.push("Not sure yet");
  else accommodationSummary.push(clean.accommodationType || "Not specified");
  if (nights.length) accommodationSummary.push(nights.join(" and ") + " night" + (nights.length === 1 ? "" : "s"));

  return { nights, attendeeSummary, accommodationSummary };
}


// Plain-text fallback for mail clients that won't render HTML.
function buildTicketEmailBody(clean, bookingId, attendeeNumbers) {
  const s = getEmailSummaries(clean);
  const pay = clean.totalPayableToDanny;
  return [
    "Hi " + clean.name + ",",
    "",
    "You're booked for Danny's 40th. Keep this email for your reference and payment details.",
    "",
    "--- YOUR BOOKING ---",
    "Booking reference: " + bookingId,
    "Who: " + (s.attendeeSummary.join(", ") || "-"),
    "Sleeping in: " + s.accommodationSummary.join(", "),
    "Total to pay Danny now: " + formatCurrency(pay),
    "  - " + formatCurrency(clean.donationTotal) + " ticket / event-fund contribution",
    "  - " + formatCurrency(clean.campingPayableToDanny) + " tent camping",
    "",
    pay > 0 ? ("Pay via Starling: " + clean.paymentLink) : "Nothing to pay right now - you're all set.",
    "Danny matches your payment to your booking reference by hand, and forwards any camping money to the venue.",
    "",
    "Glamping, vans, campervans, motorhomes and electric hookups must be booked directly with The Barge: https://thebargeinnhoneystreet.uk/camping/",
    "",
    "Two PDFs are attached: your ticket, and the full weekend guide (plan, lineup, costumes and what to bring). Save them to your phone.",
    "",
    "See you there,",
    "Danny",
    "The Barge Inn, Honey Street, Pewsey SN9 5PS - 24-27 July 2026"
  ].join("\n");
}

// HTML email: important booking info only. The weekend plan rides along as a PDF.
function buildTicketEmailHtml(clean, bookingId, attendeeNumbers) {
  const s = getEmailSummaries(clean);
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pay = clean.totalPayableToDanny;
  const p = (t) => `<p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:15px;line-height:1.6;color:#2b2118;">${t}</p>`;

  const payBlock = pay > 0
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:16px 0 6px;"><tr><td style="border-radius:4px;background:#a85a1f;"><a href="${esc(clean.paymentLink)}" style="display:inline-block;padding:14px 32px;font-family:Georgia,serif;font-size:17px;font-weight:bold;color:#ffffff;text-decoration:none;">Pay ${esc(formatCurrency(pay))} via Starling &rarr;</a></td></tr></table>`
      + `<p style="margin:4px 0 0;font-family:Georgia,serif;font-size:13px;line-height:1.5;color:#6b5d4a;">Danny matches your payment to your booking reference by hand, and forwards any camping money to the venue. If the button doesn't work: <a href="${esc(clean.paymentLink)}" style="color:#a85a1f;">${esc(clean.paymentLink)}</a></p>`
    : `<p style="margin:12px 0 0;font-family:Georgia,serif;font-size:16px;font-weight:bold;color:#2e7b7a;">Nothing to pay right now &mdash; you're all set.</p>`;

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#e7dcc6;padding:24px 12px;">`
    + `<tr><td align="center">`
    + `<table role="presentation" width="640" cellpadding="0" cellspacing="0" border="0" style="max-width:640px;width:100%;background:#fbf7ec;border:1px solid #d8c8a6;border-radius:8px;overflow:hidden;">`
    + `<tr><td style="background:#2b2118;padding:26px 32px;text-align:center;">`
    + `<div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;letter-spacing:1px;color:#e8c98a;">Danny's 40th</div>`
    + `<div style="font-family:Georgia,serif;font-size:13px;color:#b9a98a;margin-top:4px;">The Barge Inn, Honey Street &middot; 24&ndash;27 July 2026</div>`
    + `</td></tr>`
    + `<tr><td style="padding:26px 32px 28px;">`
    + p(`Hi ${esc(clean.name)}, you're booked in. Here are the important bits &mdash; keep this email so you can always find your reference and payment details.`)
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-left:4px solid #a85a1f;background:#f3ead6;border-radius:0 6px 6px 0;">`
    + `<tr><td style="padding:18px 20px;">`
    + `<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#8a6d3b;">Booking reference</p>`
    + `<p style="margin:0 0 14px;font-family:Georgia,serif;font-size:26px;font-weight:bold;color:#2b2118;">${esc(bookingId)}</p>`
    + `<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;color:#2b2118;"><strong>Who:</strong> ${esc(s.attendeeSummary.join(", ") || "—")}</p>`
    + `<p style="margin:0 0 4px;font-family:Georgia,serif;font-size:15px;color:#2b2118;"><strong>Sleeping in:</strong> ${esc(s.accommodationSummary.join(", "))}</p>`
    + `<p style="margin:14px 0 2px;font-family:Georgia,serif;font-size:15px;color:#2b2118;"><strong>Total to pay Danny now: ${esc(formatCurrency(pay))}</strong></p>`
    + `<p style="margin:0;font-family:Georgia,serif;font-size:14px;color:#5c4f3c;">${esc(formatCurrency(clean.donationTotal))} ticket / event-fund &middot; ${esc(formatCurrency(clean.campingPayableToDanny))} tent camping</p>`
    + payBlock
    + `</td></tr></table>`
    + p(`<span style="color:#8a6d3b;">Glamping, vans, campervans, motorhomes and electric hookups aren't covered by this booking &mdash; please book those <a href="https://thebargeinnhoneystreet.uk/camping/" style="color:#a85a1f;">directly with The Barge</a>.</span>`)
    + `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:6px;border:1px solid #d8c8a6;background:#ffffff;border-radius:6px;"><tr><td style="padding:14px 18px;">`
    + `<p style="margin:0;font-family:Georgia,serif;font-size:14px;line-height:1.6;color:#2b2118;">&#128206; Two PDFs are attached &mdash; <strong>your ticket</strong> and <strong>the weekend guide</strong> (plan, lineup, costumes and what to bring). Save them to your phone; you can always find this email again by searching <em>Danny's 40th</em>.</p>`
    + `</td></tr></table>`
    + `<p style="margin:18px 0 0;font-family:Georgia,serif;font-size:14px;line-height:1.6;color:#5c4f3c;">See you there &mdash; Danny</p>`
    + `</td></tr>`
    + `</table>`
    + `</td></tr>`
    + `</table>`;
}

// Shared weekend content (mirrors Tickets.html) used by the Weekend Guide PDF.
function weekendSectionsHtml() {
  const head = (t) => `<h2 style="margin:20px 0 6px;font-family:Georgia,'Times New Roman',serif;font-size:18px;color:#a85a1f;">${t}</h2>`;
  const p = (t) => `<p style="margin:0 0 12px;font-family:Georgia,'Times New Roman',serif;font-size:14px;line-height:1.55;color:#2b2118;">${t}</p>`;
  const ul = (items) => `<ul style="margin:4px 0 12px;padding-left:20px;font-family:Georgia,serif;font-size:14px;line-height:1.5;color:#2b2118;">${items}</ul>`;
  const lineup = ["Open Decks B2B2B", "Algorithmic", "Anorak", "Gizmode &amp; Breakwhore", "Golgot", "Myr", "Salander", "S.Murk", "The Mighty Rick", "The Panger"].map((n) => `<li>${n}</li>`).join("");
  const gazebos = ["Fairy lights / nice lighting", "Rugs / blankets / cushions", "Folding tables", "Camping chairs", "Bunting / fabric / decor", "Battery lights", "Tarps / ground sheets"].map((n) => `<li>${n}</li>`).join("");
  return head("Arrival")
    + p(`When you get there, tell the staff at the check-in hut you've arrived and they'll point you in the right direction. If you don't mind a load of noise, camp in The Naughty Corner (I promise I didn't name it) &mdash; but don't complain if we keep you up. Everyone else: head for Family Camping, or choose your own adventure.`)
    + p(`<strong>Lifts:</strong> need one, or offering one? Sort it in the lift pool at d40-lift-pool.jimmybreeze.workers.dev (ask Danny for the password).`)
    + head("Friday night &mdash; bring a dish")
    + p(`Bring something to add to a big shared meal at the campsite, 8pm in the Naughty Corner. There's a night on at The Barge too if you fancy dipping in, plus the pub and a campsite firepit to hang around.`)
    + head("Saturday daytime &mdash; games, installations &amp; jams")
    + p(`Get there nice and early if you're arriving Saturday. Duncan runs his Altogether Games, there'll be interactive installations in the barn and campsite, and an audio-electronics jam anyone can join in the late afternoon / early evening.`)
    + head("Saturday night &mdash; loadsa music!")
    + p(`DJs in the barn. Current lineup:`)
    + ul(lineup)
    + p(`<strong>Get dressed up!</strong> Go shiny, or work from the what3words costume list at dannys40th.com/Costumes.html. Expect lights, nonsense and a lot of strange machinery.`)
    + head("Sunday daytime &mdash; roast &amp; Avebury")
    + p(`A carvery at the pub (lots of dietary allowances &mdash; ring ahead with questions, we may do a big preorder), then a wander round the stones at nearby Avebury for anyone with the energy.`)
    + head("Sunday evening &mdash; cinema in the barn")
    + p(`We'll watch some stoopid B-movies and BangFace-TV madness. We'll work out closer to the time whether we need a watershed!`)
    + head("Gazebos please! Help build the Naughty Corner")
    + p(`I want the Naughty Corner to be a really nice place to hang out. Gazebos are the big one &mdash; if you can bring one, please do. Also handy:`)
    + ul(gazebos)
    + p(`Vans will probably need to stay in the main field rather than the Naughty Corner, so we can't rely on van awnings for shelter there. Once again &mdash; please bring gazebos!`);
}

function pdfDocShell(title, innerHtml) {
  return `<html><head><meta charset="utf-8"></head>`
    + `<body style="margin:0;padding:32px 36px;font-family:Georgia,'Times New Roman',serif;color:#2b2118;">`
    + `<div style="border-bottom:2px solid #a85a1f;padding-bottom:10px;margin-bottom:18px;">`
    + `<div style="font-size:24px;color:#2b2118;">Danny's 40th</div>`
    + `<div style="font-size:12px;color:#8a6d3b;">The Barge Inn, Honey Street, Pewsey SN9 5PS &middot; 24&ndash;27 July 2026</div>`
    + `</div>`
    + `<h1 style="font-size:22px;color:#a85a1f;margin:0 0 14px;">${title}</h1>`
    + innerHtml
    + `</body></html>`;
}

function buildTicketPdfHtml(clean, bookingId, attendeeNumbers) {
  const s = getEmailSummaries(clean);
  const esc = (v) => String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const pay = clean.totalPayableToDanny;
  const row = (label, value) => `<tr><td style="padding:6px 10px;border:1px solid #d8c8a6;font-size:13px;color:#8a6d3b;width:38%;">${label}</td><td style="padding:6px 10px;border:1px solid #d8c8a6;font-size:14px;color:#2b2118;">${value}</td></tr>`;
  const inner = `<div style="font-size:13px;color:#8a6d3b;text-transform:uppercase;letter-spacing:1px;margin-bottom:2px;">Booking reference</div>`
    + `<div style="font-size:30px;font-weight:bold;margin-bottom:16px;">${esc(bookingId)}</div>`
    + `<table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;width:100%;max-width:520px;">`
    + row("Name", esc(clean.name))
    + row("Who", esc(s.attendeeSummary.join(", ") || "—"))
    + row("Sleeping in", esc(s.accommodationSummary.join(", ")))
    + row("Ticket / event-fund", esc(formatCurrency(clean.donationTotal)))
    + row("Tent camping", esc(formatCurrency(clean.campingPayableToDanny)))
    + row("<strong>Total to pay Danny now</strong>", `<strong>${esc(formatCurrency(pay))}</strong>`)
    + `</table>`
    + (pay > 0
        ? `<p style="font-size:14px;margin:18px 0 4px;">Pay via Starling: <a href="${esc(clean.paymentLink)}" style="color:#a85a1f;">${esc(clean.paymentLink)}</a></p>`
          + `<p style="font-size:12px;color:#6b5d4a;margin:0;">Danny matches your payment to this reference by hand and forwards any camping money to the venue.</p>`
        : `<p style="font-size:14px;color:#2e7b7a;margin:18px 0 0;font-weight:bold;">Nothing to pay right now &mdash; you're all set.</p>`)
    + `<p style="font-size:12px;color:#8a6d3b;margin:18px 0 0;">Glamping, vans, campervans, motorhomes and electric hookups are booked directly with The Barge (thebargeinnhoneystreet.uk/camping).</p>`;
  return pdfDocShell("Your ticket", inner);
}

function buildWeekendGuidePdfHtml() {
  return pdfDocShell("Weekend guide", weekendSectionsHtml());
}

function htmlToPdf(html, name) {
  return Utilities.newBlob(html, "text/html", name + ".html").getAs("application/pdf").setName(name + ".pdf");
}

function createBookingId() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let token = "";
  for (let i = 0; i < 6; i++) {
    token += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }
  return "D40-" + token;
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function formatCurrency(value) {
  return "£" + Number(value || 0).toFixed(2);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
