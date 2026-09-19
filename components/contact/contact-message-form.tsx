'use client';

import { useState } from 'react';
import { CheckCircle2, Loader2 } from 'lucide-react';

export function ContactMessageForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const response = await fetch('/api/contact-messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, phone, message, website }),
      });
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      if (!response.ok) {
        throw new Error(data?.error || 'Unable to send your message. Please try again.');
      }
      setSent(true);
      setName('');
      setEmail('');
      setPhone('');
      setMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send your message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-5">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
          <div>
            <p className="font-semibold text-foreground">Message sent</p>
            <p className="mt-1 text-sm text-muted-foreground leading-6">
              Thanks for reaching out. Our team will follow up using the email or phone you provided.
            </p>
            <button
              type="button"
              className="mt-3 text-sm font-semibold text-primary hover:underline"
              onClick={() => {
                setSent(false);
                setError(null);
              }}
            >
              Send another message
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="relative grid grid-cols-1 md:grid-cols-2 gap-4">
      <label className="sr-only" htmlFor="contact-website">
        Website
      </label>
      <input
        id="contact-website"
        name="website"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />

      <div>
        <label htmlFor="contact-name" className="mb-1.5 block text-sm font-medium text-foreground">
          Full name
        </label>
        <input
          id="contact-name"
          type="text"
          name="name"
          required
          autoComplete="name"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
        />
      </div>
      <div>
        <label htmlFor="contact-email" className="mb-1.5 block text-sm font-medium text-foreground">
          Email address
        </label>
        <input
          id="contact-email"
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="contact-phone" className="mb-1.5 block text-sm font-medium text-foreground">
          Phone number <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <input
          id="contact-phone"
          type="tel"
          name="phone"
          inputMode="tel"
          autoComplete="tel"
          placeholder="2567XXXXXXXX"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
        />
      </div>
      <div className="md:col-span-2">
        <label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium text-foreground">
          Message
        </label>
        <textarea
          id="contact-message"
          name="message"
          required
          minLength={10}
          rows={5}
          placeholder="Tell us how we can help..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/70"
        />
      </div>

      {error ? (
        <p role="alert" className="md:col-span-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
          {submitting ? 'Sending…' : 'Submit message'}
        </button>
      </div>
    </form>
  );
}
