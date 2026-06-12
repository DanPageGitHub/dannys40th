# Danny's 40th Ticket Backend Notes

## Files

- `index.html`: old bare-bones form/template, not the live styled page.
- `apps-script.gs`: Google Apps Script backend used by the ticket form.

## Spreadsheet Setup

The backend writes booking, attendee, and payment audit data into one generated tab:

```js
const BOOKINGS_SHEET_NAME = "Bookings";
```

It reads the existing RSVP/tally sheet:

```js
const TALLY_SHEET_NAME = "Danny's 40th Summer Weekender - 24th - 27th July";
```

Keep these sheets:

- `Danny's 40th Summer Weekender - 24th - 27th July`
- `Budget`
- `Dashboard`
- `Bookings`

Older template versions may also have created `Attendees` and `Cost Tally`. The current backend stores attendee details and payment audit fields on `Bookings` instead.

## Maths

- `totalPeople = adults + children + under5s`
- `donationTotal = adults * donationPerAdult`
- `adultCampingTotal = adults * selectedCampingNights * 15`
- `childCampingTotal = children * selectedCampingNights * 7.5`
- `campingTotal = adultCampingTotal + childCampingTotal`
- `campingPayableToDanny = campingTotal` only when the tent camping payment route is `pay_through_danny`
- `totalPayableToDanny = donationTotal + campingPayableToDanny`

Only event-fund donation money counts toward the public event-fund bar. Camping money is separate.

## Payment Assumption

New bookings autofill:

- `Donation Paid`
- `Camping Paid`
- `Amount Paid Total`
- `Balance Remaining`

This assumes people pay what they said after submitting. Use `Payment Status` and `Payment Reference` when checking Starling. If a booking should stop counting toward the event fund, mark its payment status as cancelled, refunded, or void.

## Emails

On successful booking, the backend sends:

- a ticket/receipt email to the lead booker;
- a booking notification email to the Apps Script owner.

Starling payment confirmation emails are separate and are not controlled by this code.

## Spreadsheet Cleanup Helpers

The backend includes:

```js
listGeneratedSheetsForCleanup()
```

Use that first to review non-protected sheets.

There is also a non-destructive archive helper:

```js
archiveKnownGeneratedSheetsAfterManualReview("archive old generated ticket sheets")
```

It only renames old generated `Attendees` and `Cost Tally` tabs to `Archive - ...`. It does not touch the tally sheet, `Budget`, `Dashboard`, or `Bookings`, and it does not delete anything.

## Deployment Reminder

After replacing Apps Script code, saving is not enough.

Use:

```text
Deploy -> Manage deployments -> Edit pencil -> Version -> New version -> Deploy
```

The Web App URL can stay the same, but it must be redeployed to use the new backend.
