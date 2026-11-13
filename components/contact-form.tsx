"use client";

import { useState, type FormEvent } from "react";
import { contactTopics } from "@/lib/contact";

export function ContactForm() {
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [hasError, setHasError] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setMessage("");
    setHasError(false);

    const form = event.currentTarget;
    const data = new FormData(form);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: data.get("name"),
          email: data.get("email"),
          topic: data.get("topic"),
          message: data.get("message"),
        }),
      });
      const result = await response.json() as { error?: string; received?: boolean };
      if (!response.ok || !result.received) {
        setHasError(true);
        setMessage(result.error ?? "We could not save your message. Please email us instead.");
        return;
      }

      form.reset();
      setMessage("Thank you! Your message has been received and saved for us to review.");
    } catch {
      setHasError(true);
      setMessage("We could not reach the server. Please email us instead.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="product-form contact-form" onSubmit={submit}>
      <div className="field">
        <label htmlFor="contact-name">Name</label>
        <input id="contact-name" name="name" autoComplete="name" maxLength={100} required />
      </div>
      <div className="field">
        <label htmlFor="contact-email">Email</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          maxLength={254}
          required
        />
      </div>
      <div className="field">
        <label htmlFor="contact-topic">Subject / Topic</label>
        <select id="contact-topic" name="topic" defaultValue="" required>
          <option value="" disabled>Choose a topic</option>
          {contactTopics.map((topic) => <option key={topic}>{topic}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor="contact-message">Message</label>
        <textarea id="contact-message" name="message" maxLength={5000} required />
      </div>
      {message && (
        <p className="form-message" role={hasError ? "alert" : "status"} aria-live="polite">
          {message}
        </p>
      )}
      <button className="save-button" type="submit" disabled={submitting}>
        {submitting ? "Sending…" : "Send message"}
      </button>
    </form>
  );
}
