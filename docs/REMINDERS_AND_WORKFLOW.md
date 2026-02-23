# Tenant Reminders & Global Workflow Testing

## Tenant rent reminders

Tenants can set **personalized, automatic reminders** for rent with:

- **Custom lead times**: 1 day, 3 days, 1 week, 2 weeks, or 1 month before the due date.
- **Notification channels**: Email, SMS, and/or in-app alerts (selectable per reminder).
- **Recurring**: Optional monthly repeat.
- **Locale**: All amounts use the tenant’s chosen country and currency (Settings / registration).

### In-app alerts

- When a reminder’s “notify date” (due date − lead time) is **today** and **In-app** is enabled, the app shows a toast once per day (per reminder) when the tenant opens the app.
- Stored under `users/{tenantUid}/reminders` with `createdBy: 'tenant'`, `leadTimeDays`, `notifyEmail`, `notifySms`, `notifyInApp`.

### Email and SMS

Email and SMS require a **backend** (e.g. Firebase Cloud Functions):

1. Run a **scheduled function** (e.g. daily) that:
   - Reads reminders from Firestore where:
     - `createdBy === 'tenant'`
     - `status !== 'paid'`
     - **Notify date** = `dueDate - leadTimeDays` is today (or tomorrow, if you want advance send).
   - For each reminder:
     - If `notifyEmail`, send an email (e.g. SendGrid, Resend) to `tenantEmail`.
     - If `notifySms`, send an SMS (e.g. Twilio) to the tenant’s phone (store `tenantPhone` on the user profile if needed).
   - Optionally set a field like `lastEmailSentAt` / `lastSmsSentAt` to avoid duplicate sends.

2. Reminder documents include: `tenantEmail`, `tenantName`, `propertyName`, `amount`, `dueDate`, `leadTimeDays`, `notifyEmail`, `notifySms`, `notifyInApp`, `recurring`, `propertyId`.

---

## Workflow tests (tenant and landlord, global)

Use these to verify that tenants and landlords can manage payments, set reminders, and oversee properties in their preferred language and currency.

### 1. Registration and locale

- [ ] **Landlord**: Register with role “Landlord / Manager”, choose **country and currency** (e.g. Nigeria/NGN, UK/GBP, US/USD). Confirm dashboard and all amounts use that currency and formatting.
- [ ] **Tenant**: Register with role “Tenant”, choose **country and currency**. Confirm tenant dashboard and payments use that currency.

### 2. Landlord: property and tenant link

- [ ] Add a property with status “Occupied”, enter **tenant name**, **tenant email**, and **tenant phone**.
- [ ] Confirm the property appears on the landlord’s Dashboard, Properties, and (when applicable) Reminders.

### 3. Tenant: homes and payments

- [ ] Log in as the **tenant** (same email as on the property). Confirm **My Homes** lists that property with correct rent and currency.
- [ ] Open **Payments**. Confirm any existing payments for that property appear with correct amount and currency.
- [ ] (If payment gateway is configured) Start a payment for one home; complete or cancel and confirm behaviour.

### 4. Tenant: reminders (lead time and channels)

- [ ] Go to **Reminders** and create a new reminder:
  - Select a **home** (property).
  - Set **due date** and **amount** (pre-filled from property).
  - Choose **lead time** (e.g. “2 weeks before”).
  - Enable **Email**, **SMS**, and/or **In-app**.
  - Optionally enable **Repeat every month**.
- [ ] Save and confirm the reminder appears in the list with correct due date, amount (in user currency), and “Notify: …” text.
- [ ] Edit the reminder (change lead time or channels), save, and confirm changes.
- [ ] (Optional) Set a reminder whose notify date is **today**; reload the app and confirm an **in-app toast** appears once.

### 5. Tenant dashboard: upcoming reminders

- [ ] With at least one active (unpaid) reminder, open **My Homes**. Confirm **Upcoming reminders** shows the next reminders with amount in user currency and a link to **Reminders**.

### 6. Landlord: reminders and payments

- [ ] As landlord, open **Reminders** and create a reminder linked to a property/tenant. Confirm it appears and can be marked paid.
- [ ] As landlord, open a **property** and **Record payment** (manual). Confirm it appears under that property and in **Payments** with correct tenant/property and currency.
- [ ] Confirm **Payments** page shows totals and filters (all/paid/pending/late, by property) in the landlord’s currency.

### 7. Settings: language and currency

- [ ] In **Settings**, change **Country & currency** to another region. Confirm all relevant pages (dashboard, properties, payments, reminders) update to the new currency and number/date formatting for that locale.
- [ ] (If you add full i18n later) Switch language and confirm key labels and messages use the selected language.

### 8. End-to-end (tenant + landlord)

- [ ] Landlord adds property with tenant email; tenant logs in and sees the home.
- [ ] Tenant creates a reminder (e.g. 1 week before, in-app + email).
- [ ] Tenant pays (if gateway is on) or landlord records payment; landlord sees payment on property and in Payments.
- [ ] All amounts and dates respect each user’s country/currency and locale.

---

## Firestore reminder shape (tenant-created)

```json
{
  "propertyId": "...",
  "propertyName": "Sunset Apartments 4B",
  "amount": 250000,
  "dueDate": "<Timestamp>",
  "leadTimeDays": 14,
  "recurring": true,
  "notifyEmail": true,
  "notifySms": false,
  "notifyInApp": true,
  "notes": "",
  "createdBy": "tenant",
  "tenantName": "Jane Doe",
  "tenantEmail": "jane@example.com",
  "status": "pending",
  "createdAt": "<Timestamp>"
}
```

Use `dueDate` and `leadTimeDays` to compute the notify date and trigger email/SMS from your backend.
