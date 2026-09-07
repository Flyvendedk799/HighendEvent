"use client";

import { useState, useTransition } from "react";
import {
  Badge,
  Banner,
  Button,
  Card,
  CardHeader,
  Checkbox,
  Input,
  Textarea,
  useToast,
} from "@rentora/ui";
import {
  previewTemplateAction,
  saveTemplateAction,
  sendTestEmailAction,
  type EmailTemplate,
  type TemplateCatalogEntry,
} from "@/lib/actions/emails";

const DEFAULT_BODY =
  "<p>Hi {{customerName}},</p>\n<p>Your booking {{bookingNo}} runs {{startDate}} to {{endDate}}.</p>\n<p>Total: {{total}}</p>";

export function EmailTemplates({
  templates,
  catalog,
  variables,
  providerConfigured,
}: {
  templates: EmailTemplate[];
  catalog: TemplateCatalogEntry[];
  variables: string[];
  providerConfigured: boolean;
}) {
  const [activeKey, setActiveKey] = useState(catalog[0]?.key ?? "");
  const existing = templates.find((t) => t.key === activeKey && t.locale === "en");
  const entry = catalog.find((c) => c.key === activeKey);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <ul className="space-y-1">
        {catalog.map((item) => (
          <li key={item.key}>
            <button
              type="button"
              onClick={() => setActiveKey(item.key)}
              className={
                activeKey === item.key
                  ? "w-full rounded-lg bg-[var(--color-muted)] px-3 py-2 text-left text-sm font-medium"
                  : "w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-[var(--color-muted)]"
              }
            >
              <span className="block">{item.name}</span>
              <span className="mt-0.5 block text-xs text-[var(--color-muted-foreground)]">
                {item.customised ? "Customised" : "Rentora default"}
              </span>
            </button>
          </li>
        ))}
      </ul>

      {entry ? (
        <TemplateForm
          key={activeKey}
          entry={entry}
          existing={existing}
          variables={variables}
          providerConfigured={providerConfigured}
        />
      ) : null}
    </div>
  );
}

function TemplateForm({
  entry,
  existing,
  variables,
  providerConfigured,
}: {
  entry: TemplateCatalogEntry;
  existing?: EmailTemplate;
  variables: string[];
  providerConfigured: boolean;
}) {
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [subject, setSubject] = useState(existing?.subject ?? `Your booking {{bookingNo}}`);
  const [bodyHtml, setBodyHtml] = useState(existing?.bodyHtml ?? DEFAULT_BODY);
  const [isActive, setIsActive] = useState(existing?.isActive ?? true);
  const [preview, setPreview] = useState<{ subject: string; bodyHtml: string; unknownVariables: string[] } | null>(
    null,
  );
  const [testTo, setTestTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  function save() {
    setError(null);
    startTransition(async () => {
      const result = await saveTemplateAction({
        key: entry.key,
        subject,
        bodyHtml,
        isActive,
      });
      if (result.error) {
        setError(result.error);
        toast({ title: "Could not save", description: result.error, tone: "error" });
      } else {
        toast({ title: "Template saved" });
      }
    });
  }

  function runPreview() {
    startTransition(async () => {
      const result = await previewTemplateAction({ subject, bodyHtml });
      if (result.preview) setPreview(result.preview);
      else setError(result.error ?? null);
    });
  }

  function sendTest() {
    startTransition(async () => {
      const result = await sendTestEmailAction({ to: testTo, subject, bodyHtml });
      toast(
        result.error
          ? { title: "Could not send", description: result.error, tone: "error" }
          : {
              title: result.queued ? "Test queued" : "Not sent",
              description: result.message,
              tone: result.queued ? "success" : "error",
            },
      );
    });
  }

  return (
    <div className="space-y-6">
      {error ? <Banner tone="danger">{error}</Banner> : null}

      {!providerConfigured ? (
        <Banner tone="info" title="No email provider is configured">
          Templates can be edited and previewed, but nothing will actually be delivered until
          RESEND_API_KEY is set on the worker.
        </Banner>
      ) : null}

      <Card>
        <CardHeader
          title={entry.name}
          description={entry.description}
          action={
            <Badge tone={entry.customised ? "success" : "neutral"}>
              {entry.customised ? "Customised" : "Default"}
            </Badge>
          }
        />

        <div className="space-y-4">
          <Input
            label="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
          <Textarea
            label="Body"
            rows={10}
            value={bodyHtml}
            onChange={(e) => setBodyHtml(e.target.value)}
            className="font-mono text-xs"
            hint="Simple HTML. Rentora wraps this in your branding automatically."
          />

          <div>
            <p className="text-xs font-medium text-[var(--color-muted-foreground)]">
              Available placeholders
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {variables.map((variable) => (
                <button
                  key={variable}
                  type="button"
                  onClick={() => setBodyHtml((current) => `${current}{{${variable}}}`)}
                  className="rounded bg-[var(--color-muted)] px-1.5 py-0.5 font-mono text-[11px] hover:bg-[var(--color-border)]"
                >
                  {`{{${variable}}}`}
                </button>
              ))}
            </div>
          </div>

          <Checkbox
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            label="Send this email"
            description="Turn it off and Rentora falls back to its built-in copy."
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={save} loading={pending}>
            Save template
          </Button>
          <Button variant="secondary" onClick={runPreview} loading={pending}>
            Preview
          </Button>
        </div>
      </Card>

      {preview ? (
        <Card>
          <CardHeader title="Preview" description="Rendered with sample booking data." />
          {preview.unknownVariables.length > 0 ? (
            <Banner tone="warning" className="mb-4">
              These placeholders will render empty: {preview.unknownVariables.join(", ")}
            </Banner>
          ) : null}
          <p className="mb-3 text-sm">
            <span className="text-[var(--color-muted-foreground)]">Subject: </span>
            <strong>{preview.subject}</strong>
          </p>
          <div
            className="rounded-lg border border-[var(--color-border)] bg-white p-4 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: preview.bodyHtml }}
          />
        </Card>
      ) : null}

      <Card>
        <CardHeader title="Send yourself a test" />
        <div className="flex items-end gap-2">
          <Input
            label="Send to"
            type="email"
            placeholder="you@yourstore.com"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            className="h-9"
          />
          <Button variant="secondary" disabled={pending || !testTo.includes("@")} onClick={sendTest}>
            Send test
          </Button>
        </div>
      </Card>
    </div>
  );
}
