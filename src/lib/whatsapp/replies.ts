/**
 * WhatsApp auto-reply.
 *
 * The store wants ONE friendly Hindi acknowledgement — not a multi-topic bot.
 * `buildReply` returns that single message; the webhook sends it only for a
 * customer's first message within a 24-hour window (see
 * src/app/api/whatsapp/route.ts), so a customer gets one reassuring reply and the
 * team follows up personally.
 *
 * Editable: the store owner can reword AUTO_REPLY below without touching any other
 * code.
 */

/** The one auto-reply, 2–3 lines of Hindi. Keep it short and reassuring. */
export const AUTO_REPLY =
  'धन्यवाद! हमारी टीम को आपका संदेश प्राप्त हो गया है।\n' +
  'हमारी टीम आपसे जल्द ही संपर्क करेगी।\n' +
  'कृपया हमें 4–6 घंटे का समय दें। 🙏';

/** Returns the auto-reply for an incoming message. Never returns an empty string. */
export function buildReply(_message: string): string {
  return AUTO_REPLY;
}
