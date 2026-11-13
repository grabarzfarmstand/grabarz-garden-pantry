import { getDb } from "@/db";
import { customerMessages } from "@/db/schema";
import { contactTopics } from "@/lib/contact";

export const dynamic = "force-dynamic";

const MAX_REQUEST_LENGTH = 12_000;

export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_REQUEST_LENGTH) {
    return Response.json({ error: "Your message is too long." }, { status: 413 });
  }

  let body: unknown;
  try {
    const rawBody = await request.text();
    if (rawBody.length > MAX_REQUEST_LENGTH) {
      return Response.json({ error: "Your message is too long." }, { status: 413 });
    }
    body = JSON.parse(rawBody);
  } catch {
    return Response.json({ error: "Please submit a valid contact form." }, { status: 400 });
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return Response.json({ error: "Please complete the contact form." }, { status: 400 });
  }

  const name = "name" in body && typeof body.name === "string" ? body.name.trim() : "";
  const email = "email" in body && typeof body.email === "string" ? body.email.trim() : "";
  const topic = "topic" in body && typeof body.topic === "string" ? body.topic : "";
  const message = "message" in body && typeof body.message === "string" ? body.message.trim() : "";

  if (
    !name ||
    name.length > 100 ||
    !email ||
    email.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !contactTopics.some((allowedTopic) => allowedTopic === topic) ||
    !message ||
    message.length > 5000
  ) {
    return Response.json(
      { error: "Please check your name, email, topic, and message, then try again." },
      { status: 400 },
    );
  }

  try {
    await getDb()
      .insert(customerMessages)
      .values({
        id: crypto.randomUUID(),
        name,
        email,
        topic,
        message,
        createdAt: Date.now(),
      });
    return Response.json({ received: true }, { status: 201 });
  } catch (error) {
    console.error("Could not save customer contact message.", error);
    return Response.json({ error: "We could not save your message. Please try again or email us." }, { status: 500 });
  }
}
