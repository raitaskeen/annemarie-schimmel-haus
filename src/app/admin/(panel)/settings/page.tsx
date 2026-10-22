import type { Metadata } from "next";
import { CheckCircle2, CircleDashed } from "lucide-react";
import { SettingsForm, TestEmailButton } from "@/components/admin/settings-form";
import { PageHeader, Panel } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth/dal";
import { env, gmailConfigured, whatsappConfigured } from "@/lib/env";
import { saveSettingsAction, sendTestEmailAction } from "@/server/actions/settings";
import { getSettings } from "@/server/public/queries";

export const metadata: Metadata = { title: "Settings" };

function Integration({ name, connected, detail, children }: { name: string; connected: boolean; detail: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center">
      {connected ? <CheckCircle2 className="size-5 shrink-0 text-primary" /> : <CircleDashed className="size-5 shrink-0 text-muted-foreground" />}
      <div className="flex-1">
        <p className="font-medium">
          {name} <span className={connected ? "text-xs text-primary" : "text-xs text-muted-foreground"}>· {connected ? "connected" : "not connected"}</span>
        </p>
        <p className="text-xs text-muted-foreground">{detail}</p>
      </div>
      {children}
    </div>
  );
}

export default async function SettingsPage() {
  await requireAdmin("settings:manage");
  const settings = await getSettings();
  const e = env();
  const gmail = gmailConfigured();
  const whatsapp = whatsappConfigured();
  return (
    <>
      <PageHeader eyebrow="System" title="Settings" description="Institution details used across the website and in every email. Changes go live immediately." />
      <Panel title="Integrations" description="Credentials live in server environment variables, never in the database or the browser." className="mb-6">
        <div id="integrations" className="grid gap-3">
          <Integration name="Gmail API" connected={gmail} detail={gmail ? `Sending as ${e.GMAIL_SENDER_NAME} <${e.GMAIL_SENDER}>` : "Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN and GMAIL_SENDER."}>
            <TestEmailButton send={sendTestEmailAction} disabled={!gmail} />
          </Integration>
          <Integration
            name="WhatsApp Business (Cloud API)"
            connected={whatsapp}
            detail={whatsapp ? `Phone number ID ${e.WHATSAPP_PHONE_NUMBER_ID} · webhook ${e.APP_URL}/api/whatsapp/webhook` : "Set WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_APP_SECRET and WHATSAPP_VERIFY_TOKEN, then approve the message templates (docs/WHATSAPP_TEMPLATES.md)."}
          />
          <Integration name="Staff alerts" connected={!!e.STAFF_NOTIFY_EMAIL} detail={e.STAFF_NOTIFY_EMAIL ? `New applications are announced to ${e.STAFF_NOTIFY_EMAIL}` : "Set STAFF_NOTIFY_EMAIL to be emailed about new applications."} />
        </div>
      </Panel>
      <Panel>
        <SettingsForm action={saveSettingsAction} settings={settings} />
      </Panel>
    </>
  );
}
