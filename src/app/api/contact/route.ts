import { NextRequest, NextResponse } from "next/server"
import nodemailer from "nodemailer"
import { SITE_SHORT_NAME, CONTACT_EMAIL } from "@/lib/constants"
import { applyRateLimit } from "@/lib/middleware/rateLimit"
import { createErrorResponse, Errors } from "@/lib/utils/errorHandler"
import { contactSchema } from "@/lib/validations/contact"

export const runtime = "nodejs"

// 5 messages per hour per IP — this endpoint sends mail.
const CONTACT_RATE_LIMIT = {
  windowMs: 3_600_000,
  maxRequests: 5,
  keyPrefix: "contact:submit",
}

/** Escape user input before embedding it in email HTML. */
function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * POST /api/contact
 * Public contact form. Validates with Zod, emails the shop and the sender, and
 * NEVER logs the message, phone, email or any PII (CLAUDE.md rule #6).
 */
export async function POST(req: NextRequest) {
  try {
    const limited = await applyRateLimit(req, CONTACT_RATE_LIMIT)
    if (limited) return limited

    const parsed = contactSchema.safeParse(await req.json())
    if (!parsed.success) {
      throw Errors.validationError(
        "Check the highlighted fields and try again",
        parsed.error.flatten()
      )
    }
    const { name, email, phone, subject, message } = parsed.data

    const smtpPass = process.env.SMTP_PASS || process.env.SMTP_PASSWORD
    if (!process.env.SMTP_USER || !smtpPass) {
      // Mail isn't configured (a deploy issue, not a user error). Don't block the
      // user and don't log the submission — that would leak PII.
      console.warn("Contact form: SMTP not configured; message not sent.")
      return NextResponse.json({ data: { sent: false } }, { status: 200 })
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_PORT === "465",
      auth: { user: process.env.SMTP_USER, pass: smtpPass },
    })

    const from = process.env.SMTP_FROM || process.env.EMAIL_FROM || process.env.SMTP_USER
    const adminEmail = process.env.ADMIN_EMAIL || CONTACT_EMAIL
    const safeMessage = esc(message).replace(/\n/g, "<br>")

    const adminHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#16233A;">
        <h2 style="color:#0E8F6E;border-bottom:3px solid #0E8F6E;padding-bottom:10px;">
          New contact form submission
        </h2>
        <div style="background:#FBFAF7;padding:20px;border-radius:8px;margin:20px 0;">
          <p><strong>Name:</strong> ${esc(name)}</p>
          <p><strong>Email:</strong> ${esc(email)}</p>
          <p><strong>Phone:</strong> ${esc(phone || "Not provided")}</p>
          <p><strong>Subject:</strong> ${esc(subject || "General enquiry")}</p>
        </div>
        <div style="background:#fff;padding:20px;border-left:4px solid #0E8F6E;margin:20px 0;">
          <h3 style="margin-top:0;color:#16233A;">Message</h3>
          <p style="line-height:1.6;color:#56607A;">${safeMessage}</p>
        </div>
        <p style="color:#9AA2B4;font-size:12px;margin-top:30px;">
          Sent from the ${SITE_SHORT_NAME} contact form.
        </p>
      </div>`

    const userHtml = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;color:#16233A;">
        <h2 style="color:#0E8F6E;">Thanks for contacting us</h2>
        <p>Dear ${esc(name)},</p>
        <p>We have received your message and will get back to you as soon as we can.</p>
        <div style="background:#FBFAF7;padding:20px;border-radius:8px;margin:20px 0;">
          <p><strong>Your message:</strong></p>
          <p style="line-height:1.6;color:#56607A;">${safeMessage}</p>
        </div>
        <p>Best regards,<br>The ${SITE_SHORT_NAME} team</p>
      </div>`

    // Send to the shop (reply-to the sender), then confirm to the sender.
    await transporter.sendMail({
      from,
      to: adminEmail,
      replyTo: email,
      subject: `Contact form: ${esc(subject || "New message")}`,
      html: adminHtml,
    })
    await transporter.sendMail({
      from,
      to: email,
      subject: `Thank you for contacting ${SITE_SHORT_NAME}`,
      html: userHtml,
    })

    return NextResponse.json({ data: { sent: true } }, { status: 200 })
  } catch (err) {
    return createErrorResponse(err)
  }
}
