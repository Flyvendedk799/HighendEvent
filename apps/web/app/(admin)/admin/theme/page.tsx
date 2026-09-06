"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button, Card, Input } from "@rentora/ui";
import { PageHeader } from "@/components/page-header";
import { clientApi } from "@/lib/client-api";

type ThemeRecord = {
  id: string;
  name: string;
  tokens?: {
    primary?: string;
    secondary?: string;
    accent?: string;
    background?: string;
    foreground?: string;
  } | null;
};

export default function AdminThemePage() {
  const [theme, setTheme] = useState<ThemeRecord | null>(null);
  const [primary, setPrimary] = useState("#0F766E");
  const [accent, setAccent] = useState("#F59E0B");
  const [background, setBackground] = useState("#F8FAFC");
  const [foreground, setForeground] = useState("#0F172A");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void clientApi<ThemeRecord>("/themes/current")
      .then((data) => {
        setTheme(data);
        setPrimary(data.tokens?.primary ?? "#0F766E");
        setAccent(data.tokens?.accent ?? "#F59E0B");
        setBackground(data.tokens?.background ?? "#F8FAFC");
        setForeground(data.tokens?.foreground ?? "#0F172A");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load theme"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!theme) return;
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await clientApi<ThemeRecord>(`/themes/${theme.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          tokens: {
            ...(theme.tokens ?? {}),
            primary,
            accent,
            background,
            foreground,
          },
        }),
      });
      setTheme(updated);
      setMessage("Theme published. Storefront CSS variables will refresh on next load.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save theme");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <PageHeader
        title="Theme editor"
        description="Brand colors mapped to live storefront CSS variables."
      />
      <form className="grid gap-6 lg:grid-cols-2" onSubmit={onSubmit}>
        <Card className="space-y-4">
          <Input
            name="primary"
            label="Primary"
            value={primary}
            onChange={(e) => setPrimary(e.target.value)}
          />
          <Input
            name="accent"
            label="Accent"
            value={accent}
            onChange={(e) => setAccent(e.target.value)}
          />
          <Input
            name="background"
            label="Background"
            value={background}
            onChange={(e) => setBackground(e.target.value)}
          />
          <Input
            name="foreground"
            label="Foreground"
            value={foreground}
            onChange={(e) => setForeground(e.target.value)}
          />
          {message ? <p className="text-sm text-teal-700">{message}</p> : null}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          <Button type="submit" disabled={loading || !theme}>
            {loading ? "Publishing…" : "Publish theme"}
          </Button>
        </Card>
        <Card className="overflow-hidden p-0">
          <div className="p-8 text-white" style={{ background: primary }}>
            <p className="font-display text-3xl font-semibold">Preview</p>
            <p className="mt-2 text-sm opacity-80">Storefront hero with live tokens.</p>
            <button
              type="button"
              className="mt-6 rounded-lg px-4 py-2 text-sm font-medium text-slate-950"
              style={{ background: accent }}
            >
              Browse catalog
            </button>
          </div>
          <div className="space-y-3 p-6" style={{ background }}>
            <div className="h-3 w-2/3 rounded" style={{ background: foreground, opacity: 0.25 }} />
            <div className="h-3 w-1/2 rounded" style={{ background: foreground, opacity: 0.15 }} />
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div className="aspect-square rounded-xl" style={{ background: primary }} />
              <div className="aspect-square rounded-xl" style={{ background: accent }} />
              <div className="aspect-square rounded-xl" style={{ background: foreground, opacity: 0.4 }} />
            </div>
          </div>
        </Card>
      </form>
    </main>
  );
}
