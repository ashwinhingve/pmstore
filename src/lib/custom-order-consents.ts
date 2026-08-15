/**
 * The three things a customer must read and accept before requesting a medicine
 * (client's "T&C Apply" note, 2026-08-15). Single source of truth: the checkout
 * consent checkboxes (CustomOrderForm), the validation schema, and the page copy
 * all read from here so the wording never drifts. Bilingual — Hindi is the copy
 * the client wrote; the English line is a short gloss.
 */
export interface CustomOrderConsent {
  /** Stable id — used as the CustomOrder.consents key. */
  id: 'monopolyNotice' | 'marketShortage' | 'nearExpiry';
  /** react-hook-form field name (and the FormData key the API reads). */
  field: 'agreeMonopolyNotice' | 'agreeMarketShortage' | 'agreeNearExpiry';
  hi: string;
  en: string;
}

export const CUSTOM_ORDER_CONSENTS: readonly CustomOrderConsent[] = [
  {
    id: 'monopolyNotice',
    field: 'agreeMonopolyNotice',
    hi: 'मोनोपॉली कंपनी की दवा उपलब्ध न होने पर — आपको पहले से सूचित कर दिया जाएगा।',
    en: "If a monopoly-company medicine is unavailable, we'll inform you first.",
  },
  {
    id: 'marketShortage',
    field: 'agreeMarketShortage',
    hi: 'बाज़ार में दवा शॉर्ट होने पर — आपको सूचित किया जाएगा।',
    en: "If a medicine is short in the market, we'll notify you.",
  },
  {
    id: 'nearExpiry',
    field: 'agreeNearExpiry',
    hi: 'एक्सपायरी नज़दीक (1–2 महीने) वाली दवा डिलीवर नहीं की जाती।',
    en: 'Near-expiry medicine (1–2 months) is not delivered.',
  },
] as const;
