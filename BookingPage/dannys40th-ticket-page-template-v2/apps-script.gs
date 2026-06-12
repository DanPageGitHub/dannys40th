/**
 * Danny's 40th ticket/backend script.
 *
 * Spreadsheet tabs created/used:
 * - Dashboard: formula-driven overview
 * - Budget: editable budget model
 * - Bookings: one row per booking submission
 * - Attendees: one row per person
 * - Cost Tally: payment checking dashboard
 * - Sheet1: existing Tally RSVP/helper sheet; read-first, append fallback rows only when needed
 *
 * Deploy as Web App:
 * - Execute as: Me
 * - Who has access: Anyone
 */

const SPREADSHEET_ID = "1gm092BqUFt9eI2Yy9whVMyGyXDzWTkNY4uoGoGl5SCU";

const DASHBOARD_SHEET_NAME = "Dashboard";
const BUDGET_SHEET_NAME = "Budget";
const BOOKINGS_SHEET_NAME = "Bookings";
const ATTENDEES_SHEET_NAME = "Attendees";
const COST_TALLY_SHEET_NAME = "Cost Tally";
const TALLY_SHEET_NAME = "Sheet1";

const ADULT_CAMPING_PER_NIGHT = 15;
const CHILD_CAMPING_PER_NIGHT = 7.5;

const BOOKING_HEADERS = [
  "Booking ID",
  "Submitted At",
  "Lead Name",
  "Lead Email",
  "Lead Phone",
  "Adult Count",
  "Child Count",
  "Under 5 Count",
  "Total People",
  "Accommodation Type",
  "Venue Direct Confirmation",
  "Friday Night",
  "Saturday Night",
  "Sunday Night",
  "Extra Nights Possible",
  "Tent Camping Payment Route",
  "Donation Per Adult",
  "Ticket Donation Owed",
  "Tent Camping Cost Calculated",
  "Tent Camping Payable To Danny",
  "Total Payable To Danny",
  "Previous Tally Found",
  "Previous Tally Row",
  "Previous Tally Name",
  "Tally Created By Booking Form",
  "Trust Confirm",
  "Details Confirm",
  "Manual Payment Confirm",
  "Ticket Emailed At",
  "Payment Link",
  "Page URL",
  "User Agent",
  "Booking Review Status",
  "Notes"
];

const ATTENDEE_HEADERS = [
  "Booking ID",
  "Attendee Number",
  "Lead Name",
  "Lead Email",
  "Attendee Type",
  "Attendee Name",
  "Age Band",
  "Accommodation Type",
  "Friday Night",
  "Saturday Night",
  "Sunday Night",
  "Extra Nights Possible",
  "Naughty Corner Eligible",
  "Notes"
];

const COST_HEADERS = [
  "Booking ID",
  "Lead Name",
  "Lead Email",
  "Lead Phone",
  "Total People",
  "Ticket Donation Owed",
  "Tent Camping Cost Calculated",
  "Tent Camping Payable To Danny",
  "Total Payable To Danny",
  "Ticket Donation Paid",
  "Tent Camping Paid To Danny",
  "Total Paid To Danny",
  "Balance Remaining",
  "Payment Status",
  "Payment Reference",
  "Last Checked",
  "Chase Payment?",
  "Tent Camping Sent To Venue",
  "Tent Camping Still To Send To Venue",
  "Money Notes"
];

const TALLY_APPEND_HEADERS_ROW_2 = [
  "Email",
  "Name",
  "Are you free that weekend?",
  "Are you up for getting involved in any way?",
  "If you'd like to be involved, please let me know how below",
  "Event Planning",
  "DJing / live sets",
  "Band",
  "Solo playing",
  "Jam band",
  "Decor",
  "Lighting",
  "BBQ Chefs",
  "Cinema",
  "General help over weekend",
  "Join up celebrating!",
  "Other",
  "Respondent ID",
  "Submission ID",
  "Submitted at"
];

function doGet(e) {
  ensureWorkbook();

  const action = String(e.parameter.action || "summary");

  if (action === "summary") {
    return json({
      donationRaised: getDonationRaised(),
      eventFundTarget: getEventFundTarget()
    });
  }

  if (action === "checkTally") {
    const email = normalizeEmail(e.parameter.email || "");
    const match = email ? findTallyByEmail(email) : null;
    return json({
      email,
      tallyFound: Boolean(match),
      rowNumber: match ? match.rowNumber : "",
      name: match ? match.name : ""
    });
  }

  return json({ ok: false, error: "Unknown action." });
}

function doPost(e) {
  try {
    ensureWorkbook();

    const payload = JSON.parse(e.postData.contents || "{}");
    const clean = validateAndCleanPayload(payload);

    const bookingId = createBookingId();
    const attendeeNumbers = getNextAttendeeNumbers(clean.totalPeople);
    let tallyMatch = findTallyByEmail(clean.leadEmail);
    let tallyCreated = false;

    if (!tallyMatch) {
      const appended = appendTallyFallback(clean);
      tallyMatch = appended;
      tallyCreated = true;
    }

    appendBookingRow(clean, bookingId, attendeeNumbers, tallyMatch, tallyCreated);
    appendAttendeeRows(clean, bookingId, attendeeNumbers);
    appendCostTallyRow(clean, bookingId);

    sendTicketEmail(clean, bookingId, attendeeNumbers);

    markTicketEmailed(bookingId);

    return json({
      ok: true,
      bookingId,
      attendeeNumbers,
      ticketDonationOwed: clean.donationTotal,
      tentCampingCost: clean.tentCampingCost,
      tentCampingPayableToDanny: clean.tentCampingPayableToDanny,
      totalPayableToDanny: clean.totalPayableToDanny,
      tallyFound: Boolean(tallyMatch),
      tallyCreatedByBookingForm: tallyCreated
    });
  } catch (err) {
    return json({ ok: false, error: err.message });
  }
}

function validateAndCleanPayload(payload) {
  const adultCount = Math.max(1, parseInt(payload.adults || payload.adultCount, 10) || 1);
  const childCount = Math.max(0, parseInt(payload.children || payload.childCount, 10) || 0);
  const under5Count = Math.max(0, parseInt(payload.under5s || payload.under5Count, 10) || 0);
  const totalPeople = adultCount + childCount + under5Count;

  const donationPerAdult = Math.max(0, Number(payload.donationPerAdult || 0));
  const donationTotal = adultCount * donationPerAdult;

  const accommodationType = String(payload.accommodationType || "");
  const fridayNight = String(payload.fridayNight || "");
  const saturdayNight = String(payload.saturdayNight || "");
  const sundayNight = String(payload.sundayNight || "");
  const extraNightsPossible = String(payload.extraNightsPossible || "");
  const selectedCampingNights = [fridayNight, saturdayNight, sundayNight].filter(v => v === "yes").length;

  const tentRelevant = accommodationType === "tent";
  const adultCampingTotal = tentRelevant ? adultCount * selectedCampingNights * ADULT_CAMPING_PER_NIGHT : 0;
  const childCampingTotal = tentRelevant ? childCount * selectedCampingNights * CHILD_CAMPING_PER_NIGHT : 0;
  const tentCampingCost = adultCampingTotal + childCampingTotal;

  const tentCampingPaymentRoute = tentRelevant ? String(payload.tentCampingPaymentRoute || "") : "not_applicable";
  const tentCampingPayableToDanny = tentCampingPaymentRoute === "pay_through_danny" ? tentCampingCost : 0;
  const totalPayableToDanny = donationTotal + tentCampingPayableToDanny;

  const leadName = String(payload.leadName || "").trim();
  const leadEmail = normalizeEmail(payload.leadEmail || "");
  const leadPhone = String(payload.leadPhone || "").trim();

  const attendees = Array.isArray(payload.attendees) ? payload.attendees : [];

  if (!leadName) throw new Error("Lead name is required.");
  if (!leadEmail || !leadEmail.includes("@")) throw new Error("Valid lead email is required.");
  if (!leadPhone) throw new Error("Lead phone is required.");
  if (!accommodationType) throw new Error("Accommodation type is required.");
  if (!fridayNight || !saturdayNight || !sundayNight || !extraNightsPossible) throw new Error("Night answers are required.");
  if ((accommodationType === "glamping" || accommodationType === "van") && !Boolean(payload.venueDirectConfirm)) {
    throw new Error("Venue-direct confirmation is required for glamping/van/campervan/motorhome.");
  }
  if (tentRelevant && !tentCampingPaymentRoute) throw new Error("Tent camping payment route is required.");
  if (!Boolean(payload.trustConfirm)) throw new Error("Trust confirmation is required.");
  if (!Boolean(payload.detailsConfirm)) throw new Error("Details confirmation is required.");
  if (!Boolean(payload.manualPaymentConfirm)) throw new Error("Manual payment confirmation is required.");
  if (attendees.length !== totalPeople) throw new Error("Attendee detail count does not match people count.");
  if (attendees.some(a => !String(a.name || "").trim())) throw new Error("Every attendee needs a name.");

  return {
    submittedAt: String(payload.submittedAt || new Date().toISOString()),
    leadName,
    leadEmail,
    leadPhone,
    adultCount,
    childCount,
    under5Count,
    totalPeople,
    donationPerAdult,
    donationTotal,
    accommodationType,
    venueDirectConfirm: Boolean(payload.venueDirectConfirm),
    fridayNight,
    saturdayNight,
    sundayNight,
    extraNightsPossible,
    selectedCampingNights,
    adultCampingTotal,
    childCampingTotal,
    tentCampingCost,
    tentCampingPaymentRoute,
    tentCampingPayableToDanny,
    totalPayableToDanny,
    trustConfirm: Boolean(payload.trustConfirm),
    detailsConfirm: Boolean(payload.detailsConfirm),
    manualPaymentConfirm: Boolean(payload.manualPaymentConfirm),
    tallyFallback: payload.tallyFallback || {},
    attendees,
    paymentLink: "https://settleup.starlingbank.com/daniel-page-e74b5b",
    pageUrl: String(payload.pageUrl || ""),
    userAgent: String(payload.userAgent || "")
  };
}

function ensureWorkbook() {
  ensureBudgetSheet();
  ensureDashboardSheet();
  ensureSheet(BOOKINGS_SHEET_NAME, BOOKING_HEADERS);
  ensureSheet(ATTENDEES_SHEET_NAME, ATTENDEE_HEADERS);
  ensureSheet(COST_TALLY_SHEET_NAME, COST_HEADERS);
}

function ss() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSheet(name, headers) {
  const spreadsheet = ss();
  let sheet = spreadsheet.getSheetByName(name);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(name);
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== headers[0]) {
    sheet.insertRowBefore(1);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    sheet.setFrozenRows(1);
  } else {
    const existing = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), headers.length)).getValues()[0];
    headers.forEach((h, idx) => {
      if (!existing.includes(h)) {
        sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
      }
    });
  }
  return sheet;
}

function ensureBudgetSheet() {
  const spreadsheet = ss();
  let sheet = spreadsheet.getSheetByName(BUDGET_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(BUDGET_SHEET_NAME);
    sheet.getRange(1, 1, 1, 3).setValues([["Budget Item", "Value", "Notes"]]);
    sheet.getRange(2, 1, 10, 3).setValues([
      ["Selected lineup cost (£)", 0, ""],
      ["Lights", 400, ""],
      ["Venue Cost", 500, ""],
      ["Other expenses", 600, "Projector hire, expenses, room upstairs etc."],
      ["Average ticket price (£)", 20, "Enter planned average paid ticket"],
      ["Tickets sold", 60, "Use realistic sold count, not capacity"],
      ["Total Cost", "=SUM(B2:B5)", ""],
      ["Projected ticket revenue (£)", "=B6*B7", ""],
      ["Break-even tickets", "=IF(B6=0,0,ROUNDUP(B8/B6,0))", ""],
      ["Break-even ticket price (£)", "=IF(B7=0,0,B8/B7)", ""],
      ["Projected surplus / deficit (£)", "=B9-B8", ""]
    ]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function ensureDashboardSheet() {
  const spreadsheet = ss();
  let sheet = spreadsheet.getSheetByName(DASHBOARD_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(DASHBOARD_SHEET_NAME, 0);
  }
  sheet.clear();

  const rows = [
    ["Danny's 40th Dashboard", "", ""],
    ["Money", "", ""],
    ["Event fund target", "=Budget!B8", ""],
    ["Ticket donation paid", "='Cost Tally'!J2", "Formula below replaced after Cost Tally rows exist"],
    ["Tent camping paid to Danny", "='Cost Tally'!K2", ""],
    ["Tent camping sent to venue", "='Cost Tally'!R2", ""],
    ["Total I need to send to venue for camping", "='Cost Tally'!S2", "Camping paid to Danny minus camping already sent"],
    ["Total outstanding to Danny", "='Cost Tally'!M2", ""],
    ["", "", ""],
    ["Attendance", "", ""],
    ["Total people", "=COUNTA(Attendees!B2:B)", ""],
    ["Adults", "=COUNTIF(Attendees!E2:E,\"adult\")", ""],
    ["Children aged 5+", "=COUNTIF(Attendees!E2:E,\"child\")", ""],
    ["Under-5s", "=COUNTIF(Attendees!E2:E,\"under5\")", ""],
    ["", "", ""],
    ["Accommodation type", "People", "Bookings"],
    ["Tent camping", "=COUNTIF(Attendees!H2:H,\"tent\")", "=COUNTIF(Bookings!J2:J,\"tent\")"],
    ["Glamping", "=COUNTIF(Attendees!H2:H,\"glamping\")", "=COUNTIF(Bookings!J2:J,\"glamping\")"],
    ["Van / campervan / motorhome", "=COUNTIF(Attendees!H2:H,\"van\")", "=COUNTIF(Bookings!J2:J,\"van\")"],
    ["Not staying overnight", "=COUNTIF(Attendees!H2:H,\"not_staying\")", "=COUNTIF(Bookings!J2:J,\"not_staying\")"],
    ["Not sure yet", "=COUNTIF(Attendees!H2:H,\"not_sure\")", "=COUNTIF(Bookings!J2:J,\"not_sure\")"],
    ["", "", ""],
    ["Night", "Total staying", "Not sure"],
    ["Friday", "=COUNTIF(Attendees!I2:I,\"yes\")", "=COUNTIF(Attendees!I2:I,\"not_sure\")"],
    ["Saturday", "=COUNTIF(Attendees!J2:J,\"yes\")", "=COUNTIF(Attendees!J2:J,\"not_sure\")"],
    ["Sunday", "=COUNTIF(Attendees!K2:K,\"yes\")", "=COUNTIF(Attendees!K2:K,\"not_sure\")"]
  ];
  sheet.getRange(1, 1, rows.length, 3).setValues(rows);

  // Replace money formulas with SUMs over full columns.
  sheet.getRange("B4").setFormula("=SUM('Cost Tally'!J2:J)");
  sheet.getRange("B5").setFormula("=SUM('Cost Tally'!K2:K)");
  sheet.getRange("B6").setFormula("=SUM('Cost Tally'!R2:R)");
  sheet.getRange("B7").setFormula("=MAX(0,B5-B6)");
  sheet.getRange("B8").setFormula("=SUM('Cost Tally'!M2:M)");

  sheet.setFrozenRows(1);
  return sheet;
}

function appendBookingRow(clean, bookingId, attendeeNumbers, tallyMatch, tallyCreated) {
  const sheet = ensureSheet(BOOKINGS_SHEET_NAME, BOOKING_HEADERS);
  sheet.appendRow([
    bookingId,
    clean.submittedAt,
    clean.leadName,
    clean.leadEmail,
    clean.leadPhone,
    clean.adultCount,
    clean.childCount,
    clean.under5Count,
    clean.totalPeople,
    clean.accommodationType,
    clean.venueDirectConfirm,
    clean.fridayNight,
    clean.saturdayNight,
    clean.sundayNight,
    clean.extraNightsPossible,
    clean.tentCampingPaymentRoute,
    clean.donationPerAdult,
    clean.donationTotal,
    clean.tentCampingCost,
    clean.tentCampingPayableToDanny,
    clean.totalPayableToDanny,
    Boolean(tallyMatch),
    tallyMatch ? tallyMatch.rowNumber : "",
    tallyMatch ? tallyMatch.name : "",
    tallyCreated,
    clean.trustConfirm,
    clean.detailsConfirm,
    clean.manualPaymentConfirm,
    "",
    clean.paymentLink,
    clean.pageUrl,
    clean.userAgent,
    "Not reviewed",
    ""
  ]);
}

function appendAttendeeRows(clean, bookingId, attendeeNumbers) {
  const sheet = ensureSheet(ATTENDEES_SHEET_NAME, ATTENDEE_HEADERS);
  const rows = clean.attendees.map((a, idx) => [
    bookingId,
    attendeeNumbers[idx],
    clean.leadName,
    clean.leadEmail,
    String(a.attendeeType || ""),
    String(a.name || "").trim(),
    String(a.ageBand || ""),
    clean.accommodationType,
    clean.fridayNight,
    clean.saturdayNight,
    clean.sundayNight,
    clean.extraNightsPossible,
    clean.accommodationType === "tent" && String(a.attendeeType || "") === "adult" ? "Yes" : "No",
    String(a.notes || "")
  ]);
  if (rows.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, ATTENDEE_HEADERS.length).setValues(rows);
  }
}

function appendCostTallyRow(clean, bookingId) {
  const sheet = ensureSheet(COST_TALLY_SHEET_NAME, COST_HEADERS);
  const rowNum = sheet.getLastRow() + 1;
  sheet.appendRow([
    bookingId,
    clean.leadName,
    clean.leadEmail,
    clean.leadPhone,
    clean.totalPeople,
    clean.donationTotal,
    clean.tentCampingCost,
    clean.tentCampingPayableToDanny,
    clean.totalPayableToDanny,
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    "",
    ""
  ]);

  sheet.getRange(rowNum, 12).setFormula(`=N(J${rowNum})+N(K${rowNum})`);
  sheet.getRange(rowNum, 13).setFormula(`=I${rowNum}-L${rowNum}`);
  sheet.getRange(rowNum, 14).setFormula(`=IF(I${rowNum}=0,"Nothing owed",IF(M${rowNum}<0,"Overpaid",IF(M${rowNum}=0,"Paid",IF(L${rowNum}>0,"Part-paid","Not paid"))))`);
  sheet.getRange(rowNum, 19).setFormula(`=MAX(0,N(K${rowNum})-N(R${rowNum}))`);
}

function markTicketEmailed(bookingId) {
  const sheet = ensureSheet(BOOKINGS_SHEET_NAME, BOOKING_HEADERS);
  const values = sheet.getDataRange().getValues();
  const idCol = BOOKING_HEADERS.indexOf("Booking ID");
  const emailedCol = BOOKING_HEADERS.indexOf("Ticket Emailed At") + 1;

  for (let r = 1; r < values.length; r++) {
    if (values[r][idCol] === bookingId) {
      sheet.getRange(r + 1, emailedCol).setValue(new Date().toISOString());
      return;
    }
  }
}

function getDonationRaised() {
  const sheet = ensureSheet(COST_TALLY_SHEET_NAME, COST_HEADERS);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;

  const headers = values[0];
  const paidIndex = headers.indexOf("Ticket Donation Paid");
  return values.slice(1).reduce((sum, row) => sum + Number(row[paidIndex] || 0), 0);
}

function getEventFundTarget() {
  const sheet = ensureBudgetSheet();
  const values = sheet.getRange(1, 1, Math.max(1, sheet.getLastRow()), 2).getValues();
  const row = values.find(r => String(r[0]).trim().toLowerCase() === "total cost");
  return row ? Number(row[1] || 1500) : 1500;
}

function findTallyByEmail(email) {
  const spreadsheet = ss();
  const sheet = spreadsheet.getSheetByName(TALLY_SHEET_NAME);
  if (!sheet) return null;

  const lastRow = sheet.getLastRow();
  if (lastRow < 3) return null;

  // Existing Tally data has Email in column A and data starts after two header rows.
  const values = sheet.getRange(3, 1, lastRow - 2, Math.max(2, sheet.getLastColumn())).getValues();

  for (let i = 0; i < values.length; i++) {
    if (normalizeEmail(values[i][0]) === email) {
      return {
        rowNumber: i + 3,
        email,
        name: String(values[i][1] || "")
      };
    }
  }
  return null;
}

function appendTallyFallback(clean) {
  const spreadsheet = ss();
  let sheet = spreadsheet.getSheetByName(TALLY_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(TALLY_SHEET_NAME);
    sheet.getRange(1, 1, 1, TALLY_APPEND_HEADERS_ROW_2.length).setValues([TALLY_APPEND_HEADERS_ROW_2]);
    sheet.getRange(2, 1, 1, TALLY_APPEND_HEADERS_ROW_2.length).setValues([TALLY_APPEND_HEADERS_ROW_2]);
  }

  const fallback = clean.tallyFallback || {};
  const id = createShortId();
  const row = [
    clean.leadEmail,
    clean.leadName,
    String(fallback.rsvpFree || ""),
    String(fallback.rsvpInvolved || ""),
    String(fallback.rsvpInvolvementText || ""),
    Boolean(fallback.helpEventPlanning),
    Boolean(fallback.helpDj),
    Boolean(fallback.helpBand),
    Boolean(fallback.helpSolo),
    Boolean(fallback.helpJam),
    Boolean(fallback.helpDecor),
    Boolean(fallback.helpLighting),
    Boolean(fallback.helpBbq),
    Boolean(fallback.helpCinema),
    Boolean(fallback.helpGeneral),
    Boolean(fallback.helpCelebrate),
    Boolean(fallback.helpOther),
    "BOOKING-FORM-RESP-" + id,
    "BOOKING-FORM-SUB-" + id,
    new Date().toISOString()
  ];

  sheet.appendRow(row);
  return {
    rowNumber: sheet.getLastRow(),
    email: clean.leadEmail,
    name: clean.leadName
  };
}

function getNextAttendeeNumbers(totalPeople) {
  const sheet = ensureSheet(ATTENDEES_SHEET_NAME, ATTENDEE_HEADERS);
  const values = sheet.getDataRange().getValues();
  const attendeeIndex = ATTENDEE_HEADERS.indexOf("Attendee Number");
  let maxNumber = 0;

  values.slice(1).forEach(row => {
    const n = parseInt(row[attendeeIndex], 10);
    if (Number.isFinite(n) && n > maxNumber) maxNumber = n;
  });

  return Array.from({ length: totalPeople }, (_, i) => maxNumber + i + 1);
}

function sendTicketEmail(clean, bookingId, attendeeNumbers) {
  const accommodationLabels = {
    tent: "Tent camping",
    glamping: "Glamping — booked direct with venue",
    van: "Van / campervan / motorhome — booked direct with venue",
    not_staying: "Not staying overnight",
    not_sure: "Not sure yet"
  };

  const routeLabels = {
    pay_through_danny: "Pay camping through Danny; Danny forwards it to the venue",
    pay_venue_before: "Pay venue directly before the event",
    pay_venue_arrival: "Pay venue directly when arriving",
    already_paid_venue: "Already paid the venue",
    decide_later: "Decide later",
    not_applicable: "Not applicable"
  };

  const subject = `Danny's 40th ticket — ${bookingId}`;
  const attendeeList = clean.attendees.map((a, idx) => `${attendeeNumbers[idx]}. ${a.name} (${a.ageBand || a.attendeeType})`).join("\n");

  const body = `
Hi ${clean.leadName},

You're booked for Danny's 40th.

Booking reference: ${bookingId}
Attendee number(s): ${attendeeNumbers.join(", ")}

Attendees:
${attendeeList}

Accommodation:
${accommodationLabels[clean.accommodationType] || clean.accommodationType}

Expected nights:
Friday: ${clean.fridayNight}
Saturday: ${clean.saturdayNight}
Sunday: ${clean.sundayNight}
Might stay extra nights / decide later: ${clean.extraNightsPossible}

Ticket/event-fund donation: £${clean.donationTotal}
Tent camping cost calculated: £${clean.tentCampingCost}
Tent camping payment route: ${routeLabels[clean.tentCampingPaymentRoute] || clean.tentCampingPaymentRoute}
Tent camping payable to Danny now: £${clean.tentCampingPayableToDanny}
Total to pay Danny now: £${clean.totalPayableToDanny}

Payment link:
${clean.paymentLink}

Where the money goes:
- Ticket/event-fund money goes toward the event costs.
- The total spend is still a rough guess.
- If the event breaks even, any extra event-fund money will go toward helper expenses, food and drink for the campsite, joint meals, or a shared bar tab for us.
- Tent camping money is separate. If you included camping in this payment, Danny will forward that camping money to the venue.

Food plan:
- Friday evening is bring a dish for a shared campsite meal.
- Saturday afternoon is barbecue time. Bring BBQ food, but Danny will try to cover some costs if the event fund allows.
- Sunday plan is a roast at The Barge. They have a carvery.
- Breakfast can be bought onsite or at the nearby affordable cafe. If enough money is raised, Danny will try to cover making breakfast for at least one morning.

Important venue notes:
- Vans, campervans, motorhomes, electric hookup and glamping are not booked through this form.
- Vans, campervans, motorhomes, electric hookup and glamping must be booked separately through the Barge Inn Honey Street camping page:
  https://thebargeinnhoneystreet.uk/camping/
- You can book camping yourself, pay camping when you arrive, book closer to the time, stay more nights, come a night earlier, or sort camping when you arrive.
- When you arrive, tell the venue you're with Danny's 40th and they'll point you in the right direction.
- There will be quiet camping and a Naughty Corner for louder camping.
- No kids in the Naughty Corner, but it is all the same field.

See you there,
Danny
`.trim();

  MailApp.sendEmail(clean.leadEmail, subject, body);
}

function createBookingId() {
  return "D40-" + Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900 + 100);
}

function createShortId() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyyMMdd-HHmmss") + "-" + Math.floor(Math.random() * 900000 + 100000);
}

function normalizeEmail(value) {
  return String(value || "").trim().toLowerCase();
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
