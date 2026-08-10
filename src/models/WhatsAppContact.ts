import mongoose, { Schema, Document } from 'mongoose';

/**
 * WhatsAppContact — a privacy-safe record that a given WhatsApp number has already
 * received the auto-acknowledgement, so the webhook sends it only on the FIRST
 * message in a 24-hour window (not on every follow-up).
 *
 * We NEVER store the raw phone number (CLAUDE.md rule #6). We store a salted
 * SHA-256 hash of it (salt = WHATSAPP_APP_SECRET). A TTL index expires each record
 * ~24h after creation, which is also what reopens the "first message" window.
 */
export interface IWhatsAppContact extends Document {
  numberHash: string;
  createdAt: Date;
}

const WhatsAppContactSchema = new Schema<IWhatsAppContact>({
  numberHash: { type: String, required: true, unique: true },
  // TTL: Mongo removes the doc ~24h after createdAt, reopening the reply window.
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

export default mongoose.models.WhatsAppContact ||
  mongoose.model<IWhatsAppContact>('WhatsAppContact', WhatsAppContactSchema);
