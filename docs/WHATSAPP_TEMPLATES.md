# WhatsApp Business notifications

Applicants who tick **“Send me updates on WhatsApp as well”** receive WhatsApp messages in addition to email. The site uses the official **WhatsApp Business Cloud API** (Meta). WhatsApp only allows business-initiated messages through **pre-approved templates**, so the templates below must be created in Meta Business Manager with exactly these names, languages and variables.

## 1. Connect the number

1. In [Meta for Developers](https://developers.facebook.com/) create an app of type **Business** and add the **WhatsApp** product.
2. Add and verify the institute's business phone number. Copy its **Phone number ID**.
3. Create a **System User** in Business Settings, give it the `whatsapp_business_messaging` permission for the app and generate a **permanent access token**.
4. Copy the app's **App secret** (App settings → Basic).
5. Choose a random **verify token** (any long random string).
6. Set the environment variables and restart:

   ```
   WHATSAPP_TOKEN=…              # system-user token
   WHATSAPP_PHONE_NUMBER_ID=…
   WHATSAPP_APP_SECRET=…         # used to verify webhook signatures
   WHATSAPP_VERIFY_TOKEN=…
   ```

7. In the WhatsApp product → **Configuration → Webhook**, enter `https://<your domain>/api/whatsapp/webhook` and the verify token, then subscribe to **messages**. Delivery failures then show up in **Admin → Notifications**, and replies from applicants are stored (and deleted automatically after 180 days).

## 2. Create the templates

Create each template **twice: English (`en`) and German (`de`)**, category **Utility**. Variables are numbered `{{1}}`, `{{2}}` … in this order. Every template uses the same frame, so the messages look like one family and match the emails:

| Part | Content |
|---|---|
| Header | *Text*: `Annemarie-Schimmel-Haus` (or *Image*: upload `public/brand/og-image.jpg`) |
| Body | the text below — WhatsApp renders `*bold*` and `_italic_` |
| Footer | EN `German Cultural Centre · Lahore` · DE `Deutsches Kulturzentrum · Lahore` |
| Button | *Visit website*, **dynamic URL** `https://www.schimmel.com.pk/en/track?ref={{1}}` (DE: `/de/track?ref={{1}}`), label EN `Track application` · DE `Antrag verfolgen`. The app always sends the reference as the button value. |

When Meta asks for samples, use the synthetic values `Sara`, `ASH-C-7K3M9Q`, `German A1.1`, `Seat confirmed`.

### `ash_application_received`
Course application received.

| # | Value |
|---|---|
| 1 | First name |
| 2 | Application number (e.g. ASH-C-7K3M9Q) |
| 3 | Course |

> EN:
> *Hello {{1}},* 👋
> thank you for applying for *{{3}}*. ✅
>
> 📄 Application number: *{{2}}*
> Please keep it — you need it for every enquiry.
>
> Our course office reviews applications on working days and will send you the next steps here and by email.

> DE:
> *Guten Tag {{1}},* 👋
> vielen Dank für Ihre Anmeldung zu *{{3}}*. ✅
>
> 📄 Antragsnummer: *{{2}}*
> Bitte bewahren Sie sie für alle Rückfragen auf.
>
> Unser Kursbüro prüft Anmeldungen an Werktagen und sendet Ihnen die nächsten Schritte hier und per E-Mail.

### `ash_application_status`
Every later step: payment request, payment being checked, seat confirmed, waitlist, seat offered, reminders, cancellation, test result.

| # | Value |
|---|---|
| 1 | First name |
| 2 | Reference |
| 3 | Course / event / “Placement test” |
| 4 | New status (e.g. “Seat confirmed”, “Please pay by 24 Oct, 14:00”) |

> EN:
> *Hello {{1}},*
> there is an update for *{{3}}*:
>
> 🔔 *{{4}}*
>
> 📄 Reference: {{2}}
> Tap the button for the full details and next steps.

> DE:
> *Guten Tag {{1}},*
> es gibt Neuigkeiten zu *{{3}}*:
>
> 🔔 *{{4}}*
>
> 📄 Referenz: {{2}}
> Alle Details und nächsten Schritte finden Sie über den Button.

### `ash_event_registration`
Event ticket.

| # | Value |
|---|---|
| 1 | First name |
| 2 | Event |
| 3 | Date and time |
| 4 | Ticket number |

> EN:
> *Hello {{1}},* 🎟️
> you are registered for *{{2}}*.
>
> 🗓️ {{3}}
> 🎫 Ticket: *{{4}}*
>
> Show the ticket number or the QR code from your email at the entrance. We look forward to seeing you!

> DE:
> *Guten Tag {{1}},* 🎟️
> Sie sind für *{{2}}* angemeldet.
>
> 🗓️ {{3}}
> 🎫 Ticket: *{{4}}*
>
> Zeigen Sie am Eingang die Ticketnummer oder den QR-Code aus Ihrer E-Mail. Wir freuen uns auf Sie!

Note: this template's button value is the ticket number, i.e. `{{4}}` again.

### `ash_placement_registration`
Placement test registration.

| # | Value |
|---|---|
| 1 | First name |
| 2 | Date and time |
| 3 | Reference |

> EN:
> *Hello {{1}},* 📝
> your placement test is booked.
>
> 🗓️ {{2}}
> 📄 Reference: *{{3}}*
>
> Please arrive 15 minutes early and bring your *original CNIC* and the test fee.

> DE:
> *Guten Tag {{1}},* 📝
> Ihr Einstufungstest ist gebucht.
>
> 🗓️ {{2}}
> 📄 Referenz: *{{3}}*
>
> Bitte kommen Sie 15 Minuten früher und bringen Sie Ihre *Original-CNIC* und die Testgebühr mit.

### Which step sends what

| Step | Email | WhatsApp |
|---|---|---|
| Course application submitted / waitlisted | `enrollment.received` | `ash_application_received` |
| Payment requested, seat confirmed, waitlist, seat offered, rejected, cancelled, completed | `enrollment.status` | `ash_application_status` |
| Applicant reports a payment in the tracker | `enrollment.payment_reported` | `ash_application_status` (“Payment being checked”) |
| Payment reminder, course start reminder | `applicant.reminder` | `ash_application_status` |
| Event registration / waitlist | `event.registered` (+ calendar file) | `ash_event_registration` |
| Event seat offered, cancelled, reminder | `event.status`, `applicant.reminder` | `ash_application_status` |
| Placement test booked | `placement.received` (+ calendar file) | `ash_placement_registration` |
| Placement result, cancellation, reminder | `placement.status`, `applicant.reminder` | `ash_application_status` |
| Contact message received / answered | `contact.received`, `contact.reply` | — (email only) |

## 3. Test

Submit an application on the website with your own number and WhatsApp ticked, then check **Admin → Notifications**. Until a template is approved, Meta rejects the message and it is marked **failed** — after approval use **Retry**.

The template names and parameter order are defined in `src/server/notifications/templates.ts` (`whatsappTemplate`). Keep them in sync when editing templates.
