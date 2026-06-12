# Danny's 40th ticket page template v3

This version includes the latest logic and UX updates.

Your API URL is already inserted into `index.html`:

```js
const API_URL = "https://script.google.com/macros/s/AKfycbwikYFfvDMF-tvkkRLA0JOM1rRznUK0y-zdlMKTl-iP6FiI45-NHHlCNmYiwGhEES-V-g/exec";
```

Payment URL:

```js
const PAYMENT_URL = "https://settleup.starlingbank.com/daniel-page-e74b5b";
```

## Files

- `index.html` — public form/calculator.
- `apps-script.gs` — Google Apps Script backend.
- `README.md` — setup guide.

## Important deployment reminder

After replacing the Apps Script code, saving is not enough.

Use:

```text
Deploy → Manage deployments → Edit pencil → Version → New version → Deploy
```

The Web App URL can stay the same, but it must be redeployed to use the new backend.

## Main updates in v3

- Lead booker has separate:
  - first name
  - last name
  - nickname
- Adult 1 auto-fills from lead booker first name / last name / nickname.
- Every attendee has:
  - first name
  - last name
  - nickname
  - allergies or dietary preferences
- Required fields now show a visible `*`.
- “Might you stay extra nights?” is no longer a required question.
- Extra nights are now a reminder plus optional note.
- “Not sure” nights are logged but not charged as camping.
- Payment via Starling is much more prominent.
- After successful submit, the page shows the booking reference and redirects to Starling after a few seconds.
- Ticket email says payment is pending manual confirmation.
- Frontend validation now says exactly which attendee is missing first/last name.
- Backend validation also returns more specific attendee-name errors.
- Backend accepts old fallback keys like `name`, `email`, `phone` during testing, but the main payload uses the new lead fields.
- Tally check runs automatically when the email field loses focus, with the manual check button kept as backup.

## Current form logic

The form asks for:

1. Lead booker first name, last name, nickname, email, phone.
2. RSVP/helper lookup against `Sheet1`.
3. Fallback RSVP/helper questions if that email is not already in `Sheet1`.
4. Adult / child / under-5 counts.
5. Separate attendee first names, last names, nicknames and dietary notes generated from those counts.
6. Accommodation type:
   - Tent camping
   - Glamping — book direct with venue
   - Van / campervan / motorhome — book direct with venue
   - Not staying overnight
   - Not sure yet
7. Expected Friday / Saturday / Sunday nights:
   - Yes
   - No
   - Not sure
8. Optional extra nights note.
9. Tent camping payment route:
   - Pay camping through this form — Danny forwards it to the venue
   - Pay venue directly before the event
   - Pay venue directly when arriving
   - Already paid the venue
   - Decide later
10. Ticket/event-fund donation per adult, defaulting to £20.
11. Final trust/payment confirmations.
12. Debug mode via `?debug=1`.

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

## Manual payment columns

In `Cost Tally`, update these when checking payments:

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

## Testing

Open the page with:

```text
?debug=1
```

Debug mode shows the live payload and blocks submission by default:

```js
const ALLOW_DEBUG_SUBMIT = false;
```

Set it to `true` only if you intentionally want debug submissions to hit the spreadsheet.

## Payment redirect

After a successful submit, the form redirects to Starling after 3.5 seconds:

```js
const REDIRECT_TO_PAYMENT_AFTER_SUBMIT = true;
const PAYMENT_REDIRECT_DELAY_MS = 3500;
```

Set `REDIRECT_TO_PAYMENT_AFTER_SUBMIT = false` if you want to disable automatic redirect during testing.
