import { Resend } from "resend";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Payload = {
  email?: unknown;
  company?: unknown;
};

export async function POST(request: Request) {
  let body: Payload;
  try {
    body = (await request.json()) as Payload;
  } catch {
    return Response.json({ error: "Send a JSON body with an email." }, { status: 400 });
  }

  if (typeof body.company === "string" && body.company.trim() !== "") {
    return Response.json({ ok: true });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || email.length > 320 || !EMAIL.test(email)) {
    return Response.json({ error: "Enter a valid email address." }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const audienceId = process.env.RESEND_AUDIENCE_ID?.trim();
  if (!apiKey || !audienceId) {
    return Response.json(
      { error: "Newsletter signup is not configured yet." },
      { status: 503 },
    );
  }

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.contacts.create({
      email,
      audienceId,
      unsubscribed: false,
    });

    if (error) {
      const message = error.message.toLowerCase();
      if (error.statusCode === 409 || message.includes("already")) {
        return Response.json({ ok: true, alreadySubscribed: true });
      }

      console.error("Resend contact create failed", error.statusCode, error.name);
      return Response.json({ error: "Could not add that email to the list." }, { status: 502 });
    }
  } catch {
    console.error("Resend request failed");
    return Response.json({ error: "Could not add that email to the list." }, { status: 502 });
  }

  return Response.json({ ok: true });
}
