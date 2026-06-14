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
const FALLBACK_TALLY_SHEET_NAMES = [
  TALLY_SHEET_NAME,
  "Sheet1"
];
const PROTECTED_SHEET_NAMES = [
  TALLY_SHEET_NAME,
  "Budget",
  "Dashboard",
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

function sendTicketEmail(clean, bookingId, attendeeNumbers) {
  const subject = "Danny's 40th ticket - " + bookingId;
  const body = buildTicketEmailBody(clean, bookingId, attendeeNumbers);

  MailApp.sendEmail({
    to: clean.email,
    subject,
    body,
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

function buildTicketEmailBody(clean, bookingId, attendeeNumbers) {
  const nights = [
    clean.fridayNight === "yes" ? "Friday" : null,
    clean.saturdayNight === "yes" ? "Saturday" : null,
    clean.sundayNight === "yes" ? "Sunday" : null
  ].filter(Boolean);

  return [
    "Hi " + clean.name + ",",
    "",
    "You're booked for Danny's 40th.",
    "",
    "Booking reference: " + bookingId,
    "Attendee number(s): " + attendeeNumbers.join(", "),
    "",
    "Adults: " + clean.adultCount,
    "Children aged 5+: " + clean.childCount,
    "Under-5s: " + clean.under5Count,
    "",
    "Event fund donation: " + formatCurrency(clean.donationTotal),
    "Tent camping cost: " + formatCurrency(clean.campingTotal),
    "Camping payable to Danny now: " + formatCurrency(clean.campingPayableToDanny),
    "Total to pay Danny now: " + formatCurrency(clean.totalPayableToDanny),
    "",
    "Tent camping nights through this form: " + (nights.length ? nights.join(", ") : "None"),
    "",
    "Payment link:",
    clean.paymentLink,
    "",
    "Where the money goes:",
    "- Event fund donations go toward the event costs.",
    "- Tent camping money is separate. If you included camping in this payment, Danny will forward that camping money to the venue.",
    "- Glamping, vans, campervans, motorhomes, and electric hookups are not booked through Danny.",
    "",
    "Food and weekend plan:",
    "- Friday night: pub option, outdoor games, and a bring-a-dish shared campsite meal at 8pm.",
    "- Saturday: daytime games, installations, breakcore machines, audio electronics jam, then DJs later.",
    "- Sunday: roast at The Barge, Avebury if people have the energy, and cinema time in the barn.",
    "",
    "See you there,",
    "Danny"
  ].join("\n");
}

function createBookingId() {
  return "D40-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function formatCurrency(value) {
  return "GBP " + Number(value || 0).toFixed(2);
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
