/**
 * WhatsApp auto-reply engine (Hinglish).
 *
 * `buildReply` takes an incoming customer message and returns the canned reply to
 * send back. It is a pure function — no I/O, no side effects — so it is cheap to
 * unit-test (see replies.test.ts) and safe to call from the webhook.
 *
 * These are the editable canned replies. The store owner can reword the strings
 * below without touching any other code. Matching is keyword-based and English +
 * Roman-Hindi (Hinglish), which is how most Bhopal customers type on WhatsApp.
 */

import { CONTACT, SITE_URL } from '@/lib/constants';

const PHONE = CONTACT.phone; // "+91 9755550126"
const ADDRESS = CONTACT.addressFull;

/**
 * One intent = a set of trigger keywords + the reply to send when any of them is
 * found in the (lower-cased) message. Order matters: the FIRST matching intent
 * wins, so more specific intents are listed before the generic greeting, and the
 * greeting sits just above the catch-all fallback.
 */
interface Intent {
  keywords: string[];
  reply: string;
}

const INTENTS: Intent[] = [
  // Prescription — kept above "order" because a prescription question often also
  // contains ordering words like "kaise".
  {
    keywords: ['prescription', 'rx', 'parchi', 'parchee', 'doctor', 'upload', 'schedule'],
    reply:
      `📄 Prescription wali dawaiyon ke liye doctor ki parchi zaroori hai.\n\n` +
      `Aap parchi website par upload kar sakte hain:\n${SITE_URL}/prescriptions\n` +
      `(ya yahin uski photo bhej dijiye — hamari team check kar legi).\n\n` +
      `Schedule H / H1 / X dawaiyan bina valid prescription ke nahi di jaati.`,
  },
  // Timings
  {
    keywords: ['time', 'timing', 'timings', 'open', 'khula', 'khulta', 'khule', 'kab', 'hours', 'baje', 'band', 'close', 'closed'],
    reply:
      `🕘 PM Store rozana khula rehta hai:\n` +
      `Somwar se Ravivaar, subah 9 baje se raat 9 baje tak.\n\n` +
      `Aur kuch puchna ho to bataiye!`,
  },
  // Location / address
  {
    keywords: ['address', 'location', 'kaha', 'kahan', 'where', 'shop', 'store', 'pata', 'aana', 'directions', 'map'],
    reply:
      `📍 Hamara address:\n${ADDRESS}\n\n` +
      `Aap yahan aa sakte hain, ya ghar par delivery mangwa sakte hain.`,
  },
  // Delivery — before "price" so "delivery charge kitna" resolves here.
  {
    keywords: ['delivery', 'deliver', 'ghar', 'home', 'charge', 'kitna', 'area', 'pincode', 'shipping'],
    reply:
      `🚚 PM Store Bhopal me free home delivery deta hai.\n\n` +
      `Delivery time ya aapke area ke baare me confirm karne ke liye humein call kijiye:\n${PHONE}`,
  },
  // Payment
  {
    keywords: ['payment', 'pay', 'upi', 'cod', 'cash', 'online', 'card', 'netbanking', 'gpay', 'phonepe', 'paytm'],
    reply:
      `💳 Payment ke options:\n` +
      `• Cash on Delivery (COD)\n` +
      `• UPI / Card / Netbanking (online)\n\n` +
      `Order website par ya yahin WhatsApp par place kar sakte hain.`,
  },
  // Price / savings
  {
    keywords: ['price', 'rate', 'daam', 'discount', 'offer', 'sasta', 'generic', 'saving', 'bachat', 'mrp'],
    reply:
      `💰 PM Store par generic medicines se 60–70% tak bachat hoti hai — dawaiyan genuine, daam kam.\n\n` +
      `Kisi medicine ka rate janne ke liye uska naam bhejiye, ya call kijiye:\n${PHONE}`,
  },
  // Ordering
  {
    keywords: ['order', 'buy', 'medicine', 'dawa', 'dawai', 'kharid', 'chahiye', 'purchase', 'cart'],
    reply:
      `💊 Medicine order karne ke 2 aasaan tareeke:\n\n` +
      `1. Website par: ${SITE_URL}\n` +
      `2. Yahin par medicine ka naam ya prescription ki photo bhejiye — hamari team aapka cart bana degi.\n\n` +
      `Generic medicines par 60–70% tak bachat!`,
  },
  // Talk to a human
  {
    keywords: ['call', 'phone', 'number', 'baat', 'human', 'agent', 'staff', 'pharmacist', 'contact', 'help'],
    reply:
      `📞 Aap seedha humse baat kar sakte hain:\n${PHONE}\n` +
      `Timing: subah 9 se raat 9 baje tak.\n\n` +
      `Hamari team aapko jaldi reply karegi. 🙏`,
  },
  // Thanks
  {
    keywords: ['thanks', 'thank', 'dhanyavaad', 'dhanyawad', 'shukriya', 'thnx', 'thx'],
    reply: `Aapka dhanyavaad! 🙏 Kuch aur madad chahiye ho to bataiye. PM Store aapki sehat ke saath hai.`,
  },
  // Greeting — generic, so it sits last before the fallback.
  {
    keywords: ['hi', 'hii', 'hello', 'helo', 'hey', 'namaste', 'namaskar', 'start', 'menu'],
    reply:
      `Namaste! 🙏 PM Store me aapka swagat hai.\n\n` +
      `Main in cheezon me madad kar sakta hoon:\n` +
      `• Timing & location\n` +
      `• Medicine order karna\n` +
      `• Prescription upload\n` +
      `• Delivery & payment\n\n` +
      `Apna sawaal type kijiye, ya humein call kijiye: ${PHONE}`,
  },
];

const FALLBACK =
  `Maaf kijiye, main yeh theek se samajh nahi paaya. 🙏\n\n` +
  `Aap in me se puchh sakte hain: timing, location, order, prescription, delivery, ya payment.\n\n` +
  `Ya hamari team se baat karein: ${PHONE}`;

/** Returns the auto-reply for an incoming message. Never returns an empty string. */
export function buildReply(message: string): string {
  const text = message.toLowerCase();
  for (const intent of INTENTS) {
    if (intent.keywords.some((keyword) => text.includes(keyword))) {
      return intent.reply;
    }
  }
  return FALLBACK;
}
