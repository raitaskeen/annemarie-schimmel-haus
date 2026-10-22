# Email via the Gmail API

All emails (confirmations with QR tickets and calendar files, status updates, replies to contact messages, staff invitations, password resets) are sent through the **Gmail API** from one Google Workspace mailbox, e.g. `info@schimmel.com.pk`. No SMTP password is stored — the site uses an OAuth2 **refresh token** limited to sending mail.

## 1. Google Cloud project

1. Open [Google Cloud Console](https://console.cloud.google.com/) with a Workspace administrator account and create a project, e.g. *ASH Website*.
2. **APIs & Services → Library**: enable the **Gmail API**.
3. **OAuth consent screen**: user type **Internal** (only your Workspace), app name *ASH Website*. Add the scope `https://www.googleapis.com/auth/gmail.send` — nothing else.
4. **Credentials → Create credentials → OAuth client ID**, type **Web application**. Add `https://developers.google.com/oauthplayground` as an authorised redirect URI. Copy the **client ID** and **client secret**.

## 2. Refresh token

1. Open the [OAuth 2.0 Playground](https://developers.google.com/oauthplayground), click the gear icon → *Use your own OAuth credentials* and paste the client ID/secret.
2. In step 1 enter the scope `https://www.googleapis.com/auth/gmail.send`, authorise **signed in as the sending mailbox** (e.g. info@).
3. Step 2 → *Exchange authorization code for tokens*. Copy the **refresh token**.

## 3. Configure

```
GMAIL_CLIENT_ID=…apps.googleusercontent.com
GMAIL_CLIENT_SECRET=…
GMAIL_REFRESH_TOKEN=…
GMAIL_SENDER=info@schimmel.com.pk
GMAIL_SENDER_NAME=Annemarie-Schimmel-Haus
STAFF_NOTIFY_EMAIL=courses@schimmel.com.pk   # optional: new-application alerts
```

Restart the site, then use **Admin → Settings → Send test email to me**.

## Deliverability

- Publish SPF, DKIM (Workspace admin → Apps → Gmail → Authenticate email) and a DMARC record for the domain.
- Messages that fail are retried automatically by the maintenance job with growing delays (2, 4, 8 … minutes, at most 6 hours apart) and can be retried by hand from **Admin → Notifications**.
- Revoking the OAuth client in Google immediately stops all sending; create a new refresh token to restore it.
