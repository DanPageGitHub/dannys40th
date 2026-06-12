# Danny's 40th ticket page template v2

This zip contains a static ticket page and a Google Apps Script backend.

Your API URL has already been inserted into `index.html`:

```js
const API_URL = "https://script.google.com/macros/s/AKfycbwikYFfvDMF-tvkkRLA0JOM1rRznUK0y-zdlMKTl-iP6FiI45-NHHlCNmYiwGhEES-V-g/exec";
```

## Files

- `index.html` — public form/calculator.
- `apps-script.gs` — Google Apps Script backend.
- `README.md` — this setup guide.

## Current form logic

The form now asks for:

1. Lead booker name, email and phone.
2. RSVP/helper lookup against `Sheet1`.
3. Fallback RSVP/helper questions if that email is not already in `Sheet1`.
4. Adult / child / under-5 counts.
5. Separate attendee names generated from those counts.
6. Accommodation type:
   - Tent camping
   - Glamping — book direct with venue
   - Van / campervan / motorhome — book direct with venue
   - Not staying overnight
   - Not sure yet
7. Expected Friday / Saturday / Sunday nights, each with:
   - Yes
   - No
   - Not sure
8. Tent camping payment route:
   - Pay camping through this form — Danny forwards it to the venue
   - Pay venue directly before the event
   - Pay venue directly when arriving
   - Already paid the venue
   - Decide later
9. Ticket/event-fund donation per adult, defaulting to £20.
10. Final trust/payment confirmations.
11. Debug mode via `?debug=1`.

## Maths

Ticket/event fund:

```text
Ticket Donation Owed = adults × donation per adult
```

Tent camping cost:

```text
Adult tent camping = adults × confirmed yes nights × £15
Child tent camping = children aged 5+ × confirmed yes nights × £7.50
Under-5 tent camping = £0
Tent Camping Cost Calculated = adult tent camping + child tent camping
```

Tent camping payable to Danny:

```text
If payment route = pay_through_danny:
  Tent Camping Payable To Danny = Tent Camping Cost Calculated
Otherwise:
  Tent Camping Payable To Danny = £0
```

Total payable to Danny:

```text
Total Payable To Danny = Ticket Donation Owed + Tent Camping Payable To Danny
```

Venue camping forwarding dashboard figure:

```text
Total I need to send to venue for camping
= Tent Camping Paid To Danny - Tent Camping Sent To Venue
```

That means it only counts camping money Danny is actually holding, not camping money people are paying direct to the venue.

## Spreadsheet tabs

The backend creates/uses:

```text
Dashboard
Budget
Bookings
Attendees
Cost Tally
Sheet1
```

### Dashboard

Formula-driven overview for:

- event fund target;
- ticket donation paid;
- tent camping paid to Danny;
- tent camping sent to venue;
- total still to send to venue for camping;
- total outstanding to Danny;
- total people/adults/children/under-5s;
- accommodation type totals;
- night totals.

### Budget

Editable budget model based on your current numbers:

```text
Selected lineup cost (£)  0
Lights                    400
Venue Cost                500
Other expenses            600
Average ticket price (£)  20
Tickets sold              60
Total Cost                formula
Projected ticket revenue  formula
Break-even tickets        formula
Break-even ticket price   formula
Projected surplus/deficit formula
```

The public progress bar target is read from Budget → Total Cost.

### Bookings

One row per booking submission. Mostly an audit log.

### Attendees

One row per person. Used for headcount, nights, accommodation totals and attendee numbers.

### Cost Tally

The working payment checker.

Manual columns to update when checking payments:

```text
Ticket Donation Paid
Tent Camping Paid To Danny
Payment Reference
Last Checked
Chase Payment?
Tent Camping Sent To Venue
Money Notes
```

Formula columns:

```text
Total Paid To Danny
Balance Remaining
Payment Status
Tent Camping Still To Send To Venue
```

### Sheet1

Existing Tally RSVP/helper sheet.

The script assumes:

- `Sheet1` contains the previous Tally data.
- Email is in column A.
- Name is in column B.
- The first two rows are headers.
- Data starts on row 3.

If an email is already found in `Sheet1`, the booking form does not ask the helper questions again.

If an email is not found, the booking form opens the helper questions and appends a new row to `Sheet1`.

## Deployment

1. Open your Google Sheet.
2. Go to Extensions → Apps Script.
3. Paste `apps-script.gs`.
4. Save.
5. Deploy → Manage deployments.
6. Edit your existing Web App deployment.
7. Replace the code and deploy a new version.
8. Keep access as:
   - Execute as: Me
   - Who has access: Anyone

## Testing

Open the page with:

```text
?debug=1
```

Debug mode shows the live payload and blocks submission by default:

```js
const ALLOW_DEBUG_SUBMIT = false;
```

Set it to `true` temporarily only if you intentionally want debug submissions to hit the spreadsheet.
