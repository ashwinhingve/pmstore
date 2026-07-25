/**
 * Catalogue source — medicines transcribed from the client's 8-page handwritten
 * stock register (WhatsApp images, 2026-07-24) and resolved to canonical Indian
 * brands using pharmaceutical knowledge.
 *
 * This is the single source of truth for `scripts/build-catalogue.ts`, which
 * emits the import CSVs. Keeping the knowledge here (not inline in the emitter)
 * means a human can review every identification against the source photo.
 *
 * RULES FOLLOWED (see CLAUDE.md):
 *  - Never fabricate. Lines that cannot be identified with confidence go to
 *    `REVIEW`, not `MEDICINES`, and are NOT imported.
 *  - Prices and pack sizes are NOT on the register. Every value here is a
 *    best-effort estimate from market knowledge and is tagged `price-unverified`
 *    so staff can correct it before go-live. `price` == `mrp` (no fake discount).
 *  - Multi-strength register lines (e.g. "Brufen 200/400/600") are expanded to
 *    one SKU per strength — `compositionKey` embeds strength and the Strip needs it.
 *  - Schedule H/H1/X ⇒ prescriptionRequired is forced true by the importer.
 *
 * SKU scheme: PMS-<PAGE><NNN>, numbered by array order within a page, so the
 * file is the stable idempotency key. Re-running the import updates in place.
 */

export type Unit = 'mg' | 'mcg' | 'g' | 'ml' | 'iu' | '%';
export type Form =
  | 'tablet' | 'capsule' | 'syrup' | 'suspension' | 'injection'
  | 'cream' | 'ointment' | 'gel' | 'drops' | 'inhaler'
  | 'powder' | 'sachet' | 'spray' | 'patch' | 'other';
export type Schedule = 'OTC' | 'H' | 'H1' | 'X' | 'G';

export interface SourceSalt { name: string; strength: number; unit: Unit }

export interface Medicine {
  page: string;              // source register page A–G
  raw: string;               // as written in the register
  name: string;              // resolved product name (one per SKU, incl. strength)
  brand?: string;
  manufacturer: string;      // best-effort; part of the price-unverified review scope
  category: string;
  salts: SourceSalt[];
  form: Form;
  packSize: number;
  packUnit: string;          // 'tablet' | 'capsule' | 'ml' | 'unit'
  price: number;             // best-effort MRP for the whole pack, rupees
  schedule: Schedule;
  gstRate?: number;          // default 12
  hsnCode?: string;          // default 30049099
  note?: string;             // extra description hint
}

export interface ReviewItem {
  page: string;
  raw: string;               // as written in the register
  bestGuess: string;         // most likely identity, for the human reviewer
  reason: string;            // why it was not imported
}

const s = (name: string, strength: number, unit: Unit = 'mg'): SourceSalt => ({ name, strength, unit });

// Concise builder with defaults. Every field the register does not provide is a
// best-effort estimate (price, pack, manufacturer) and flagged downstream.
const m = (
  page: string,
  raw: string,
  name: string,
  manufacturer: string,
  category: string,
  schedule: Schedule,
  form: Form,
  packSize: number,
  packUnit: string,
  price: number,
  salts: SourceSalt[],
  extra: Partial<Medicine> = {},
): Medicine => ({ page, raw, name, manufacturer, category, schedule, form, packSize, packUnit, price, salts, ...extra });

// Category constants — the standardized pharma taxonomy. Names reuse the
// existing DB categories where they match, so no duplicate category docs form.
const DIAB = 'Diabetes Care';
const CARD = 'Cardiac Care';
const ANTI = 'Antibiotics';
const PAIN = 'Pain Relief';
const GAST = 'Gastro';
const RESP = 'Respiratory & Allergy';
const VITA = 'Vitamins & Supplements';
const NEUR = 'Neuro & Psychiatry';
const ORTH = 'Ortho & Muscle Care';
const DERM = 'Derma & Skin';
const GYNE = "Gynae & Women's Health";
const GENL = 'General & OTC';

export const MEDICINES: Medicine[] = [
  // ============================ PAGE A ============================
  m('A', 'TAB Avil 25', 'Avil 25', 'Sanofi', RESP, 'H', 'tablet', 15, 'tablet', 12, [s('Pheniramine Maleate', 25)]),
  m('A', 'TAB Avil 50', 'Avil 50', 'Sanofi', RESP, 'H', 'tablet', 15, 'tablet', 24, [s('Pheniramine Maleate', 50)]),
  m('A', 'TABS AF 200', 'AF 200', 'Aristo', ANTI, 'H', 'tablet', 4, 'tablet', 95, [s('Fluconazole', 200)], { note: 'antifungal' }),
  m('A', 'TABS AF 400', 'AF 400', 'Aristo', ANTI, 'H', 'tablet', 1, 'tablet', 48, [s('Fluconazole', 400)], { note: 'antifungal' }),
  m('A', 'Amlovas S 2.5', 'Amlovas-S 2.5', 'Macleods', CARD, 'H', 'tablet', 10, 'tablet', 95, [s('S-Amlodipine', 2.5)]),
  m('A', 'Amlovas AT', 'Amlovas-AT', 'Macleods', CARD, 'H', 'tablet', 10, 'tablet', 110, [s('Amlodipine', 5), s('Atenolol', 50)]),
  m('A', 'Allegra 120', 'Allegra 120', 'Sanofi', RESP, 'H', 'tablet', 10, 'tablet', 180, [s('Fexofenadine', 120)]),
  m('A', 'Allegra 180', 'Allegra 180', 'Sanofi', RESP, 'H', 'tablet', 10, 'tablet', 220, [s('Fexofenadine', 180)]),
  m('A', 'Allegra M', 'Allegra-M', 'Sanofi', RESP, 'H', 'tablet', 10, 'tablet', 230, [s('Fexofenadine', 120), s('Montelukast', 10)]),
  m('A', 'Amaryl M Forte 1mg', 'Amaryl M Forte 1mg', 'Sanofi', DIAB, 'H', 'tablet', 15, 'tablet', 210, [s('Glimepiride', 1), s('Metformin', 1000)]),
  m('A', 'Amaryl M 1mg', 'Amaryl M 1mg', 'Sanofi', DIAB, 'H', 'tablet', 15, 'tablet', 150, [s('Glimepiride', 1), s('Metformin', 500)]),
  m('A', 'Amaryl M 2mg', 'Amaryl M 2mg', 'Sanofi', DIAB, 'H', 'tablet', 15, 'tablet', 190, [s('Glimepiride', 2), s('Metformin', 500)]),
  m('A', 'Alex syrup', 'Alex Cough Syrup', 'Glenmark', RESP, 'H', 'syrup', 100, 'ml', 110, [s('Chlorpheniramine Maleate', 4), s('Dextromethorphan', 10), s('Phenylephrine', 5)], { note: 'per 5 ml' }),
  m('A', 'Azee 250', 'Azee 250', 'Cipla', ANTI, 'H', 'tablet', 6, 'tablet', 68, [s('Azithromycin', 250)]),
  m('A', 'Azee 500', 'Azee 500', 'Cipla', ANTI, 'H', 'tablet', 5, 'tablet', 130, [s('Azithromycin', 500)]),
  m('A', 'Azithral 250', 'Azithral 250', 'Alembic', ANTI, 'H', 'tablet', 6, 'tablet', 70, [s('Azithromycin', 250)]),
  m('A', 'Azithral 500', 'Azithral 500', 'Alembic', ANTI, 'H', 'tablet', 5, 'tablet', 135, [s('Azithromycin', 500)]),
  m('A', 'Amlokind 5mg AT', 'Amlokind-AT', 'Mankind', CARD, 'H', 'tablet', 10, 'tablet', 42, [s('Amlodipine', 5), s('Atenolol', 50)]),
  m('A', 'Aciloc 150', 'Aciloc 150', 'Cadila', GAST, 'H', 'tablet', 30, 'tablet', 40, [s('Ranitidine', 150)]),
  m('A', 'Aciloc 300', 'Aciloc 300', 'Cadila', GAST, 'H', 'tablet', 30, 'tablet', 70, [s('Ranitidine', 300)]),
  m('A', 'Augmentin 625', 'Augmentin 625 Duo', 'GlaxoSmithKline', ANTI, 'H', 'tablet', 10, 'tablet', 205, [s('Amoxicillin', 500), s('Clavulanic Acid', 125)]),
  m('A', 'Aceclo Plus', 'Aceclo Plus', 'Aristo', PAIN, 'H', 'tablet', 10, 'tablet', 60, [s('Aceclofenac', 100), s('Paracetamol', 500)]),
  m('A', 'Aceclo MR', 'Aceclo MR', 'Aristo', PAIN, 'H', 'tablet', 10, 'tablet', 90, [s('Aceclofenac', 100), s('Paracetamol', 325), s('Chlorzoxazone', 250)]),
  m('A', 'Avomine', 'Avomine', 'Abbott', GAST, 'H', 'tablet', 10, 'tablet', 38, [s('Promethazine Theoclate', 25)], { note: 'anti-emetic, motion sickness' }),
  m('A', 'Atarax 10', 'Atarax 10', 'Dr Reddys', NEUR, 'H', 'tablet', 15, 'tablet', 45, [s('Hydroxyzine', 10)]),
  m('A', 'Atarax 25', 'Atarax 25', 'Dr Reddys', NEUR, 'H', 'tablet', 15, 'tablet', 70, [s('Hydroxyzine', 25)]),
  m('A', 'Azulix 1MF', 'Azulix 1 MF', 'Torrent', DIAB, 'H', 'tablet', 15, 'tablet', 130, [s('Glimepiride', 1), s('Metformin', 500)]),
  m('A', 'Azulix 2MF', 'Azulix 2 MF', 'Torrent', DIAB, 'H', 'tablet', 15, 'tablet', 165, [s('Glimepiride', 2), s('Metformin', 500)]),
  m('A', 'Aten 25', 'Aten 25', 'Zydus', CARD, 'H', 'tablet', 14, 'tablet', 30, [s('Atenolol', 25)]),
  m('A', 'Aten 50', 'Aten 50', 'Zydus', CARD, 'H', 'tablet', 14, 'tablet', 42, [s('Atenolol', 50)]),
  m('A', 'Aristozyme', 'Aristozyme Liquid', 'Aristo', GAST, 'OTC', 'syrup', 200, 'ml', 130, [s('Fungal Diastase', 50), s('Pepsin', 10)], { note: 'digestive enzyme, per 15 ml' }),
  m('A', 'AKT-4', 'AKT-4 Kit', 'Lupin', ANTI, 'H', 'tablet', 28, 'tablet', 620, [s('Rifampicin', 450), s('Isoniazid', 300), s('Ethambutol', 800), s('Pyrazinamide', 750)], { note: 'anti-tuberculosis combination' }),
  m('A', 'Anafortan', 'Anafortan', 'Abbott', GAST, 'H', 'tablet', 10, 'tablet', 55, [s('Camylofin', 25), s('Paracetamol', 300)], { note: 'antispasmodic' }),
  m('A', 'Asomex 2.5', 'Asomex 2.5', 'Emcure', CARD, 'H', 'tablet', 10, 'tablet', 85, [s('S-Amlodipine', 2.5)]),
  m('A', 'Amodep 5-AT', 'Amodep-AT', 'Systopic', CARD, 'H', 'tablet', 10, 'tablet', 60, [s('Amlodipine', 5), s('Atenolol', 50)]),
  m('A', 'Amlopin AT-M 5', 'Amlopin-AT', 'Stadmed', CARD, 'H', 'tablet', 10, 'tablet', 55, [s('Amlodipine', 5), s('Atenolol', 50)]),
  m('A', 'ARKamin', 'Arkamin', 'Unichem', CARD, 'H', 'tablet', 10, 'tablet', 40, [s('Clonidine', 100, 'mcg')]),
  m('A', 'Atorfit CV Gold 10', 'Atorfit CV 10', 'Micro Labs', CARD, 'H', 'capsule', 10, 'capsule', 140, [s('Atorvastatin', 10), s('Clopidogrel', 75)]),
  m('A', 'Atorfit CV Gold 20', 'Atorfit CV 20', 'Micro Labs', CARD, 'H', 'capsule', 10, 'capsule', 175, [s('Atorvastatin', 20), s('Clopidogrel', 75)]),
  m('A', 'Aristozyme Gold', 'Aristozyme Gold', 'Aristo', GAST, 'OTC', 'capsule', 10, 'capsule', 95, [s('Fungal Diastase', 100), s('Pepsin', 20)], { note: 'digestive enzyme' }),

  // ============================ PAGE B ============================
  m('B', 'TAB Brufen 200', 'Brufen 200', 'Abbott', PAIN, 'H', 'tablet', 15, 'tablet', 30, [s('Ibuprofen', 200)]),
  m('B', 'TAB Brufen 400', 'Brufen 400', 'Abbott', PAIN, 'H', 'tablet', 15, 'tablet', 45, [s('Ibuprofen', 400)]),
  m('B', 'TAB Brufen 600', 'Brufen 600', 'Abbott', PAIN, 'H', 'tablet', 15, 'tablet', 60, [s('Ibuprofen', 600)]),
  m('B', 'TAB Betnosol', 'Betnesol', 'GlaxoSmithKline', GENL, 'H', 'tablet', 20, 'tablet', 30, [s('Betamethasone', 0.5)], { note: 'corticosteroid' }),
  m('B', 'TAB Briv 50mg', 'Briv 50', 'UCB', NEUR, 'H', 'tablet', 10, 'tablet', 320, [s('Brivaracetam', 50)], { note: 'anti-epileptic' }),
  m('B', 'TAB Becozyme C Forte', 'Becozyme C Forte', 'Piramal', VITA, 'OTC', 'tablet', 15, 'tablet', 40, [s('Vitamin B Complex', 1), s('Ascorbic Acid', 75)], { note: 'B-complex with vitamin C' }),
  m('B', 'TAB Brutacef 200 DT', 'Brutacef 200 DT', 'Brooks', ANTI, 'H', 'tablet', 10, 'tablet', 130, [s('Cefixime', 200)]),
  m('B', 'TAB Brutoflam-90', 'Brutoflam 90', 'Brooks', PAIN, 'H', 'tablet', 10, 'tablet', 95, [s('Etoricoxib', 90)]),
  m('B', 'TAB Beplex Forte', 'Beplex Forte', 'Systopic', VITA, 'OTC', 'tablet', 15, 'tablet', 35, [s('Vitamin B Complex', 1)], { note: 'B-complex' }),
  m('B', 'TAB Baclof-10', 'Baclof 10', 'Sun Pharma', ORTH, 'H', 'tablet', 10, 'tablet', 55, [s('Baclofen', 10)], { note: 'muscle relaxant' }),
  m('B', 'TAB Buscopan', 'Buscopan', 'Sanofi', GAST, 'H', 'tablet', 10, 'tablet', 42, [s('Hyoscine Butylbromide', 10)], { note: 'antispasmodic' }),
  m('B', 'TAB Buscogast Plus', 'Buscogast Plus', 'Cadila', GAST, 'H', 'tablet', 10, 'tablet', 40, [s('Hyoscine Butylbromide', 10), s('Paracetamol', 500)], { note: 'antispasmodic' }),
  m('B', 'TAB Betnovate scalp', 'Betnovate-N Cream', 'GlaxoSmithKline', DERM, 'H', 'cream', 20, 'g', 55, [s('Betamethasone', 0.1, '%'), s('Neomycin', 0.5, '%')], { note: 'topical steroid + antibiotic' }),

  // ============================ PAGE C ============================
  m('C', 'TAB Ciplox TZ', 'Ciplox TZ', 'Cipla', ANTI, 'H', 'tablet', 10, 'tablet', 95, [s('Ciprofloxacin', 500), s('Tinidazole', 600)]),
  m('C', 'TAB Cepodem 200', 'Cepodem 200', 'Alkem', ANTI, 'H', 'tablet', 10, 'tablet', 210, [s('Cefpodoxime', 200)]),
  m('C', 'TAB Concor Cor 2.5', 'Concor Cor 2.5', 'Merck', CARD, 'H', 'tablet', 10, 'tablet', 110, [s('Bisoprolol', 2.5)]),
  m('C', 'TAB Concor AM 5', 'Concor AM 5', 'Merck', CARD, 'H', 'tablet', 10, 'tablet', 150, [s('Bisoprolol', 5), s('Amlodipine', 5)]),
  m('C', 'TAB Concor AM 2.5', 'Concor AM 2.5', 'Merck', CARD, 'H', 'tablet', 10, 'tablet', 130, [s('Bisoprolol', 2.5), s('Amlodipine', 5)]),
  m('C', 'TAB Contramol DT', 'Contramol DT', 'Sun Pharma', PAIN, 'H1', 'tablet', 10, 'tablet', 55, [s('Tramadol', 50)], { note: 'opioid analgesic — H1' }),
  m('C', 'TAB Calpol 500', 'Calpol 500', 'GlaxoSmithKline', PAIN, 'OTC', 'tablet', 15, 'tablet', 22, [s('Paracetamol', 500)]),
  m('C', 'TAB Clopitab', 'Clopitab 75', 'Cadila', CARD, 'H', 'tablet', 15, 'tablet', 95, [s('Clopidogrel', 75)]),
  m('C', 'TAB Coversyl AM', 'Coversyl AM 5', 'Servier', CARD, 'H', 'tablet', 10, 'tablet', 180, [s('Perindopril', 4), s('Amlodipine', 5)]),
  m('C', 'TAB Cilaheart 20', 'Cilaheart 20', 'Ipca', CARD, 'H', 'tablet', 10, 'tablet', 120, [s('Cilnidipine', 20)]),
  m('C', 'CAP Calcigard 10', 'Calcigard 10', 'Torrent', CARD, 'H', 'capsule', 15, 'capsule', 35, [s('Nifedipine', 10)]),
  m('C', 'TAB Cyclopam', 'Cyclopam', 'Indoco', GAST, 'H', 'tablet', 10, 'tablet', 40, [s('Dicyclomine', 10), s('Paracetamol', 500)], { note: 'antispasmodic' }),
  m('C', 'TAB Ciplar LA 20', 'Ciplar LA 20', 'Cipla', CARD, 'H', 'tablet', 15, 'tablet', 55, [s('Propranolol', 20)]),
  m('C', 'TAB Ciplar LA 40', 'Ciplar LA 40', 'Cipla', CARD, 'H', 'tablet', 15, 'tablet', 75, [s('Propranolol', 40)]),
  m('C', 'TAB Cetzine 10mg', 'Cetzine 10', 'Dr Reddys', RESP, 'OTC', 'tablet', 10, 'tablet', 32, [s('Cetirizine', 10)]),
  m('C', 'TAB Cardivas 3.125', 'Cardivas 3.125', 'Sun Pharma', CARD, 'H', 'tablet', 10, 'tablet', 70, [s('Carvedilol', 3.125)]),
  m('C', 'TAB Clonafit Beta', 'Clonafit Beta', 'Mankind', NEUR, 'H1', 'tablet', 10, 'tablet', 65, [s('Clonazepam', 0.5), s('Propranolol', 20)], { note: 'clonazepam — H1' }),
  m('C', 'TAB Cardace 2.5', 'Cardace 2.5', 'Sanofi', CARD, 'H', 'tablet', 10, 'tablet', 85, [s('Ramipril', 2.5)]),
  m('C', 'TAB Caverta 50', 'Caverta 50', 'Sun Pharma', GENL, 'H', 'tablet', 4, 'tablet', 210, [s('Sildenafil', 50)]),
  m('C', 'TAB Caverta 100', 'Caverta 100', 'Sun Pharma', GENL, 'H', 'tablet', 4, 'tablet', 320, [s('Sildenafil', 100)]),
  m('C', 'TAB Ciplox 250', 'Ciplox 250', 'Cipla', ANTI, 'H', 'tablet', 10, 'tablet', 45, [s('Ciprofloxacin', 250)]),
  m('C', 'TAB Ciplox 500', 'Ciplox 500', 'Cipla', ANTI, 'H', 'tablet', 10, 'tablet', 75, [s('Ciprofloxacin', 500)]),
  // Page C continued (image 4)
  m('C', 'TAB Clavam 625', 'Clavam 625', 'Alkem', ANTI, 'H', 'tablet', 10, 'tablet', 215, [s('Amoxicillin', 500), s('Clavulanic Acid', 125)]),
  m('C', 'TAB Calcimax 500', 'Calcimax 500', 'Meyer', VITA, 'OTC', 'tablet', 15, 'tablet', 90, [s('Calcium Carbonate', 500), s('Cholecalciferol', 250, 'iu')], { note: 'calcium + vitamin D3' }),
  m('C', 'TAB Cefakind 250', 'Cefakind 250', 'Mankind', ANTI, 'H', 'tablet', 10, 'tablet', 190, [s('Cefuroxime', 250)]),
  m('C', 'TAB Cefakind 500', 'Cefakind 500', 'Mankind', ANTI, 'H', 'tablet', 10, 'tablet', 340, [s('Cefuroxime', 500)]),
  m('C', 'TAB Cipcal 500 D+', 'Cipcal 500 D', 'Cipla', VITA, 'OTC', 'tablet', 15, 'tablet', 105, [s('Calcium Carbonate', 500), s('Cholecalciferol', 250, 'iu')], { note: 'calcium + vitamin D3' }),
  m('C', 'SYP Cyclopam', 'Cyclopam Suspension', 'Indoco', GAST, 'H', 'suspension', 60, 'ml', 55, [s('Dicyclomine', 10), s('Simethicone', 40)], { note: 'per 5 ml' }),
  m('C', 'SYP Cremaffin Plus', 'Cremaffin Plus Syrup', 'Abbott', GAST, 'OTC', 'syrup', 225, 'ml', 190, [s('Milk of Magnesia', 1.25, 'ml'), s('Liquid Paraffin', 1.25, 'ml'), s('Sodium Picosulfate', 3.33)], { note: 'laxative, per 5 ml' }),
  m('C', 'SYP Cypon', 'Cypon Syrup', 'Geno Pharma', GAST, 'H', 'syrup', 200, 'ml', 95, [s('Cyproheptadine', 2), s('Tricholine Citrate', 275)], { note: 'appetite stimulant, per 5 ml' }),
  m('C', 'SYP Calcimax D3', 'Calcimax D3 Syrup', 'Meyer', VITA, 'OTC', 'syrup', 200, 'ml', 145, [s('Calcium', 250), s('Cholecalciferol', 200, 'iu')], { note: 'per 5 ml' }),
  m('C', 'SYP Crocin 125', 'Crocin Syrup 125', 'GlaxoSmithKline', PAIN, 'OTC', 'syrup', 60, 'ml', 42, [s('Paracetamol', 125)], { note: 'per 5 ml' }),
  m('C', 'SYP Crocin 250', 'Crocin Syrup 250', 'GlaxoSmithKline', PAIN, 'OTC', 'syrup', 60, 'ml', 55, [s('Paracetamol', 250)], { note: 'per 5 ml' }),

  // ============================ PAGE D ============================
  m('D', 'TAB Deriphyllin 150', 'Deriphyllin 150', 'Zydus', RESP, 'H', 'tablet', 10, 'tablet', 40, [s('Etophylline', 77), s('Theophylline', 23)]),
  m('D', 'TAB Deriphyllin Retard 150', 'Deriphyllin Retard 150', 'Zydus', RESP, 'H', 'tablet', 10, 'tablet', 55, [s('Etophylline', 115), s('Theophylline', 35)]),
  m('D', 'TAB Dolo 650', 'Dolo 650', 'Micro Labs', PAIN, 'OTC', 'tablet', 15, 'tablet', 31, [s('Paracetamol', 650)]),
  m('D', 'TAB Dynapar', 'Dynapar 50', 'Troikaa', PAIN, 'H', 'tablet', 10, 'tablet', 40, [s('Diclofenac', 50)]),
  m('D', 'TAB Domstal', 'Domstal 10', 'Torrent', GAST, 'H', 'tablet', 10, 'tablet', 35, [s('Domperidone', 10)]),
  m('D', 'TAB Dytor Plus 10', 'Dytor Plus 10', 'Cipla', CARD, 'H', 'tablet', 10, 'tablet', 95, [s('Torsemide', 10), s('Spironolactone', 50)]),
  m('D', 'TAB Dytor Plus 20', 'Dytor Plus 20', 'Cipla', CARD, 'H', 'tablet', 10, 'tablet', 130, [s('Torsemide', 20), s('Spironolactone', 50)]),
  m('D', 'TAB Dytor 5', 'Dytor 5', 'Cipla', CARD, 'H', 'tablet', 10, 'tablet', 60, [s('Torsemide', 5)]),
  m('D', 'TAB Dulcoflex', 'Dulcoflex 5', 'Boehringer Ingelheim', GAST, 'OTC', 'tablet', 10, 'tablet', 40, [s('Bisacodyl', 5)], { note: 'laxative' }),
  m('D', 'TAB Diclomol', 'Diclomol', 'Win-Medicare', PAIN, 'H', 'tablet', 10, 'tablet', 38, [s('Diclofenac', 50), s('Paracetamol', 325)]),
  m('D', 'TAB Diclomol SP', 'Diclomol SP', 'Win-Medicare', PAIN, 'H', 'tablet', 10, 'tablet', 90, [s('Diclofenac', 50), s('Paracetamol', 325), s('Serratiopeptidase', 15)]),
  m('D', 'TAB Dilzem 30', 'Dilzem 30', 'Torrent', CARD, 'H', 'tablet', 10, 'tablet', 45, [s('Diltiazem', 30)]),
  m('D', 'TAB Drotin M', 'Drotin-M', 'Walter Bushnell', GAST, 'H', 'tablet', 10, 'tablet', 60, [s('Drotaverine', 80), s('Mefenamic Acid', 250)], { note: 'antispasmodic' }),
  m('D', 'TAB Deplatt-A 150', 'Deplatt-A 150', 'Torrent', CARD, 'H', 'capsule', 15, 'capsule', 105, [s('Aspirin', 150), s('Clopidogrel', 75)]),
  m('D', 'CAP Doxi 100', 'Doxt 100', 'Aristo', ANTI, 'H', 'capsule', 10, 'capsule', 55, [s('Doxycycline', 100)]),
  m('D', 'TAB Dynaglipt-M', 'Dynaglipt-M', 'Zydus', DIAB, 'H', 'tablet', 15, 'tablet', 165, [s('Teneligliptin', 20), s('Metformin', 500)]),
  m('D', 'TAB Dolonex DT', 'Dolonex DT', 'Pfizer', PAIN, 'H', 'tablet', 15, 'tablet', 130, [s('Piroxicam', 20)]),
  m('D', 'TAB Decdan', 'Decdan 0.5', 'Wyeth', GENL, 'H', 'tablet', 30, 'tablet', 12, [s('Dexamethasone', 0.5)], { note: 'corticosteroid' }),
  m('D', 'TAB Dolowin Plus', 'Dolowin Plus', 'Alkem', PAIN, 'H', 'tablet', 10, 'tablet', 45, [s('Diclofenac', 50), s('Paracetamol', 325)]),
  m('D', 'TAB Defcort 6', 'Defcort 6', 'Macleods', GENL, 'H', 'tablet', 10, 'tablet', 75, [s('Deflazacort', 6)], { note: 'corticosteroid' }),
  m('D', 'TAB D3 Must 60K', 'D3 Must 60K', 'Mankind', VITA, 'OTC', 'tablet', 4, 'tablet', 60, [s('Cholecalciferol', 60000, 'iu')], { note: 'vitamin D3' }),
  m('D', 'TAB Dazit', 'Dazit 5', 'Sun Pharma', RESP, 'H', 'tablet', 10, 'tablet', 70, [s('Desloratadine', 5)]),
  m('D', 'TAB Dolowin MR', 'Dolowin MR', 'Alkem', ORTH, 'H', 'tablet', 10, 'tablet', 75, [s('Diclofenac', 50), s('Paracetamol', 325), s('Chlorzoxazone', 250)]),
  m('D', 'TAB Drotin DS', 'Drotin DS', 'Walter Bushnell', GAST, 'H', 'tablet', 10, 'tablet', 75, [s('Drotaverine', 80)], { note: 'antispasmodic' }),
  m('D', 'TAB Deriphyllin OD 300', 'Deriphyllin OD 300', 'Zydus', RESP, 'H', 'tablet', 10, 'tablet', 95, [s('Theophylline', 300)]),
  m('D', 'TAB Drotikind M', 'Drotikind-M', 'Mankind', GAST, 'H', 'tablet', 10, 'tablet', 55, [s('Drotaverine', 80), s('Mefenamic Acid', 250)], { note: 'antispasmodic' }),

  // ============================ PAGE E ============================
  m('E', 'TAB Ecosprin 150', 'Ecosprin 150', 'USV', CARD, 'H', 'tablet', 14, 'tablet', 12, [s('Aspirin', 150)]),
  m('E', 'TAB Ecosprin AV 75', 'Ecosprin AV 75', 'USV', CARD, 'H', 'capsule', 15, 'capsule', 95, [s('Aspirin', 75), s('Atorvastatin', 10)]),
  m('E', 'TAB Ecosprin AV 150', 'Ecosprin AV 150', 'USV', CARD, 'H', 'capsule', 15, 'capsule', 110, [s('Aspirin', 150), s('Atorvastatin', 10)]),
  m('E', 'TAB Ecosprin Gold 10', 'Ecosprin Gold 10', 'USV', CARD, 'H', 'capsule', 15, 'capsule', 130, [s('Aspirin', 75), s('Atorvastatin', 10), s('Clopidogrel', 75)]),
  m('E', 'TAB Ecosprin Gold 20', 'Ecosprin Gold 20', 'USV', CARD, 'H', 'capsule', 15, 'capsule', 160, [s('Aspirin', 75), s('Atorvastatin', 20), s('Clopidogrel', 75)]),
  m('E', 'TAB Enteroquinol', 'Enteroquinol', 'East India Pharma', GAST, 'H', 'tablet', 10, 'tablet', 38, [s('Diiodohydroxyquinoline', 250)], { note: 'antidiarrhoeal' }),
  m('E', 'TAB Eritel CH 40', 'Eritel CH 40', 'Micro Labs', CARD, 'H', 'tablet', 15, 'tablet', 155, [s('Telmisartan', 40), s('Chlorthalidone', 12.5)]),
  m('E', 'TAB Etrobax 90', 'Etrobax 90', 'Zuventus', PAIN, 'H', 'tablet', 10, 'tablet', 95, [s('Etoricoxib', 90)]),
  m('E', 'TAB Enzoflam', 'Enzoflam', 'Alkem', PAIN, 'H', 'tablet', 10, 'tablet', 85, [s('Aceclofenac', 100), s('Paracetamol', 325), s('Serratiopeptidase', 15)]),
  m('E', 'TAB Emeset 4', 'Emeset 4', 'Cipla', GAST, 'H', 'tablet', 10, 'tablet', 45, [s('Ondansetron', 4)], { note: 'anti-emetic' }),

  // ============================ PAGE F ============================
  m('F', 'TAB Flexon', 'Flexon', 'Aristo', PAIN, 'H', 'tablet', 10, 'tablet', 32, [s('Ibuprofen', 400), s('Paracetamol', 325)]),
  m('F', 'TAB Flagyl 200', 'Flagyl 200', 'Abbott', ANTI, 'H', 'tablet', 10, 'tablet', 25, [s('Metronidazole', 200)]),
  m('F', 'TAB Flagyl 400', 'Flagyl 400', 'Abbott', ANTI, 'H', 'tablet', 10, 'tablet', 42, [s('Metronidazole', 400)]),
  m('F', 'TAB Fenac Plus', 'Fenac Plus', 'Sun Pharma', PAIN, 'H', 'tablet', 10, 'tablet', 40, [s('Diclofenac', 50), s('Paracetamol', 325)]),
  m('F', 'TAB Famocid 40', 'Famocid 40', 'Sun Pharma', GAST, 'H', 'tablet', 14, 'tablet', 75, [s('Famotidine', 40)]),
  m('F', 'TAB Febrex Plus', 'Febrex Plus', 'Indoco', RESP, 'OTC', 'tablet', 10, 'tablet', 35, [s('Paracetamol', 500), s('Phenylephrine', 5), s('Chlorpheniramine Maleate', 2)], { note: 'cold and flu' }),
  m('F', 'TAB Folvite', 'Folvite 5', 'Pfizer', VITA, 'OTC', 'tablet', 30, 'tablet', 45, [s('Folic Acid', 5)]),
  m('F', 'TAB Febrinil 650', 'Febrinil 650', 'Nulife', PAIN, 'OTC', 'tablet', 15, 'tablet', 30, [s('Paracetamol', 650)]),
  m('F', 'TAB Febrinil 500', 'Febrinil 500', 'Nulife', PAIN, 'OTC', 'tablet', 15, 'tablet', 22, [s('Paracetamol', 500)]),
  m('F', 'SYP Flexon Suspension', 'Flexon Suspension', 'Aristo', PAIN, 'H', 'suspension', 60, 'ml', 45, [s('Ibuprofen', 100), s('Paracetamol', 162.5)], { note: 'per 5 ml' }),
  m('F', 'SYP Flagyl Suspension', 'Flagyl Suspension', 'Abbott', ANTI, 'H', 'suspension', 60, 'ml', 40, [s('Metronidazole', 200)], { note: 'per 5 ml' }),

  // ============================ PAGE G ============================
  m('G', 'TAB Glycomet GP1', 'Glycomet GP1', 'USV', DIAB, 'H', 'tablet', 15, 'tablet', 105, [s('Glimepiride', 1), s('Metformin', 500)]),
  m('G', 'TAB Glycomet GP2', 'Glycomet GP2', 'USV', DIAB, 'H', 'tablet', 15, 'tablet', 140, [s('Glimepiride', 2), s('Metformin', 500)]),
  m('G', 'TAB Glycomet GP0.5', 'Glycomet GP0.5', 'USV', DIAB, 'H', 'tablet', 15, 'tablet', 85, [s('Glimepiride', 0.5), s('Metformin', 500)]),
  m('G', 'TAB Glycomet GP1 Forte', 'Glycomet GP1 Forte', 'USV', DIAB, 'H', 'tablet', 15, 'tablet', 150, [s('Glimepiride', 1), s('Metformin', 1000)]),
  m('G', 'TAB Glycomet SR 500', 'Glycomet SR 500', 'USV', DIAB, 'H', 'tablet', 20, 'tablet', 45, [s('Metformin', 500)]),
  m('G', 'TAB Glycomet 500', 'Glycomet 500', 'USV', DIAB, 'H', 'tablet', 20, 'tablet', 32, [s('Metformin', 500)]),
  m('G', 'TAB Glimestar M1', 'Glimestar M1', 'Mankind', DIAB, 'H', 'tablet', 15, 'tablet', 95, [s('Glimepiride', 1), s('Metformin', 500)]),
  m('G', 'TAB Glimestar M2', 'Glimestar M2', 'Mankind', DIAB, 'H', 'tablet', 15, 'tablet', 130, [s('Glimepiride', 2), s('Metformin', 500)]),
  m('G', 'TAB Gabapin NT 100', 'Gabapin NT 100', 'Intas', NEUR, 'H', 'tablet', 10, 'tablet', 95, [s('Gabapentin', 100), s('Nortriptyline', 10)]),
  m('G', 'TAB Gabapin NT 400', 'Gabapin NT 400', 'Intas', NEUR, 'H', 'tablet', 10, 'tablet', 165, [s('Gabapentin', 400), s('Nortriptyline', 10)]),
  m('G', 'TAB Gabapin NT 300', 'Gabapin NT 300', 'Intas', NEUR, 'H', 'tablet', 10, 'tablet', 145, [s('Gabapentin', 300), s('Nortriptyline', 10)]),
  m('G', 'TAB Gabapin 100', 'Gabapin 100', 'Intas', NEUR, 'H', 'tablet', 10, 'tablet', 55, [s('Gabapentin', 100)]),
  m('G', 'TAB Gemer 2', 'Gemer 2', 'Sun Pharma', DIAB, 'H', 'tablet', 10, 'tablet', 115, [s('Glimepiride', 2), s('Metformin', 500)]),
  m('G', 'TAB Gemer 3', 'Gemer 3', 'Sun Pharma', DIAB, 'H', 'tablet', 10, 'tablet', 140, [s('Glimepiride', 3), s('Metformin', 500)]),
  m('G', 'TAB Gluformin XL 1000', 'Gluformin XL 1000', 'Abbott', DIAB, 'H', 'tablet', 10, 'tablet', 55, [s('Metformin', 1000)]),
  m('G', 'TAB Glynase MF', 'Glynase MF', 'USV', DIAB, 'H', 'tablet', 15, 'tablet', 95, [s('Glipizide', 5), s('Metformin', 500)]),
  m('G', 'TAB Glyciphage G1', 'Glyciphage G1', 'Franco-Indian', DIAB, 'H', 'tablet', 15, 'tablet', 90, [s('Glimepiride', 1), s('Metformin', 500)]),
  m('G', 'TAB Glyciphage G2', 'Glyciphage G2', 'Franco-Indian', DIAB, 'H', 'tablet', 15, 'tablet', 120, [s('Glimepiride', 2), s('Metformin', 500)]),
  m('G', 'TAB Glyciphage SR 500', 'Glyciphage SR 500', 'Franco-Indian', DIAB, 'H', 'tablet', 20, 'tablet', 40, [s('Metformin', 500)]),
  m('G', 'TAB Glizid MR 30', 'Glizid MR 30', 'Panacea Biotec', DIAB, 'H', 'tablet', 10, 'tablet', 55, [s('Gliclazide', 30)]),
  m('G', 'TAB Glizid M XR 60', 'Glizid-M XR 60', 'Panacea Biotec', DIAB, 'H', 'tablet', 10, 'tablet', 85, [s('Gliclazide', 60), s('Metformin', 500)]),
  m('G', 'CAP Gemcal D3', 'Gemcal D3', 'Sun Pharma', VITA, 'OTC', 'capsule', 10, 'capsule', 110, [s('Calcitriol', 0.25, 'mcg'), s('Calcium Carbonate', 500), s('Cholecalciferol', 250, 'iu')], { note: 'calcium + vitamin D3' }),
  m('G', 'SYP Gelusil MPS', 'Gelusil MPS Syrup', 'Pfizer', GAST, 'OTC', 'syrup', 200, 'ml', 120, [s('Magaldrate', 400), s('Simethicone', 20)], { note: 'antacid, per 5 ml' }),
];

/**
 * Lines that could NOT be identified with confidence. NOT imported — staff must
 * verify against the physical pack or the register before these become products.
 */
export const REVIEW: ReviewItem[] = [
  { page: 'A', raw: 'Angican 5mg beta', bestGuess: 'possibly an amlodipine/atenolol combination', reason: 'brand name not resolvable; "Angican" is not a known brand' },
  { page: 'A', raw: 'Aroz cold', bestGuess: 'a cold/anti-allergic combination', reason: 'brand ambiguous; composition and strengths unknown' },
  { page: 'A', raw: 'ADDY 20A', bestGuess: 'unknown', reason: 'not resolvable to any known Indian brand' },
  { page: 'B', raw: 'TAB Bomday 400', bestGuess: 'possibly Bandy 400 (Albendazole 400)', reason: 'spelling does not match a known brand; do not assume' },
  { page: 'B', raw: 'TAB Benz', bestGuess: 'possibly Benadon (Pyridoxine) or Benzac', reason: 'truncated name, no strength or form context' },
  { page: 'B', raw: 'TAB Betnoguy 200 400 ER', bestGuess: 'possibly Metrogyl 200/400 ER (Metronidazole)', reason: 'reads on B page but resembles Metrogyl; identity uncertain' },
  { page: 'B', raw: 'SYP Benday', bestGuess: 'possibly Benadryl cough syrup (Diphenhydramine)', reason: 'spelling differs from Benadryl; composition unconfirmed' },
  { page: 'C', raw: 'CAP CO2 D3', bestGuess: 'possibly a calcium + vitamin D3 supplement', reason: 'brand not resolvable' },
  { page: 'C', raw: 'TAB C2 PM', bestGuess: 'unknown', reason: 'abbreviation not resolvable to a brand' },
  { page: 'C', raw: 'CAP Carvic', bestGuess: 'unknown', reason: 'brand not resolvable; not Carvidon/Carnisure with confidence' },
  { page: 'C', raw: 'TAB Cluba 10 (prescription)', bestGuess: 'unknown antihypertensive', reason: 'brand not resolvable' },
  { page: 'C', raw: 'TAB C2 3', bestGuess: 'unknown', reason: 'illegible / abbreviation not resolvable' },
  { page: 'C', raw: 'TAB Corflam', bestGuess: 'possibly a diclofenac anti-inflammatory', reason: 'brand not resolvable with confidence' },
  { page: 'C', raw: 'TAB Cymoral-AP Forte Plus', bestGuess: 'possibly Aceclofenac + Paracetamol', reason: 'brand "Cymoral" not confirmed' },
  { page: 'C', raw: 'TAB Coldsol', bestGuess: 'a cold combination', reason: 'brand ambiguous; composition unknown' },
  { page: 'C', raw: 'TAB Cadisper C', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'C', raw: 'TAB Corstimax 12mg', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'C', raw: 'TAB Cildip 3D', bestGuess: 'possibly Cilnidipine combination', reason: 'suffix "3D" not resolvable to a known SKU' },
  { page: 'C', raw: 'TAB Clom M', bestGuess: 'unknown', reason: 'truncated / illegible' },
  { page: 'C', raw: 'TAB Cortel 40', bestGuess: 'possibly a telmisartan brand', reason: 'brand "Cortel" not confirmed' },
  { page: 'D', raw: 'TAB Ordent', bestGuess: 'possibly Ondem (Ondansetron)', reason: 'spelling does not match a known brand' },
  { page: 'D', raw: 'TAB Dyrect', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'D', raw: 'TAB Duradulan', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'D', raw: 'CAP Derolac', bestGuess: 'possibly Darolac (probiotic)', reason: 'probiotic — no salt/strength model; verify strains and pack' },
  { page: 'D', raw: 'CAP Doxi SL', bestGuess: 'possibly Doxycycline + Lactic acid bacillus', reason: 'combination unconfirmed' },
  { page: 'D', raw: 'TAB Dolokind AA / Plus', bestGuess: 'possibly Dolokind Plus (Diclofenac + Paracetamol)', reason: 'the "AA" variant is not resolvable' },
  { page: 'D', raw: 'TAB Doloforce DT', bestGuess: 'possibly a paracetamol DT', reason: 'brand/composition unconfirmed' },
  { page: 'D', raw: 'TAB Dapaneu 10', bestGuess: 'possibly Dapagliflozin 10', reason: 'brand "Dapaneu" not confirmed' },
  { page: 'D', raw: 'SYP Dacizen', bestGuess: 'unknown syrup', reason: 'brand not resolvable' },
  { page: 'E', raw: 'TAB Envoformin G1', bestGuess: 'possibly a Metformin + Glimepiride brand', reason: 'brand not resolvable' },
  { page: 'E', raw: 'TAB Erstel LN 40', bestGuess: 'possibly a Telmisartan combination', reason: 'brand/suffix "LN" not resolvable' },
  { page: 'E', raw: 'CAP Erion 200 400 600 BLC', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'E', raw: 'TAB Escipy', bestGuess: 'possibly Escitalopram', reason: 'brand "Escipy" not confirmed; strength illegible' },
  { page: 'E', raw: 'TAB Extel 40', bestGuess: 'possibly a Telmisartan brand', reason: 'brand not confirmed' },
  { page: 'E', raw: 'TAB Ebast DC', bestGuess: 'possibly Ebastine combination (Ebast)', reason: 'the "DC" variant is not resolvable' },
  { page: 'F', raw: 'TAB Flexabenz', bestGuess: 'possibly a chlorzoxazone muscle-relaxant combination', reason: 'brand not resolvable' },
  { page: 'F', raw: 'TAB Foirc', bestGuess: 'unknown', reason: 'illegible; not Folvite' },
  { page: 'F', raw: 'TAB Fluzen AA', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'F', raw: 'CAP Flura BF', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'F', raw: 'CAP Flatubust', bestGuess: 'possibly an anti-flatulence (simethicone)', reason: 'brand not resolvable' },
  { page: 'F', raw: 'CAP Awnil (prescription)', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'G', raw: 'TAB Glucef 100 200', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'G', raw: 'CAP Gudpres XL 10', bestGuess: 'unknown antihypertensive', reason: 'brand not resolvable' },
  { page: 'G', raw: 'TAB Grenil', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'G', raw: 'TAB Gromdem MD', bestGuess: 'possibly a domperidone combination', reason: 'brand not resolvable' },
  { page: 'G', raw: 'TAB Gut OK', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'G', raw: 'TAB Gliptagreat DM 500', bestGuess: 'possibly a Teneligliptin + Metformin brand', reason: 'brand "Gliptagreat" not confirmed' },
  { page: 'G', raw: 'TAB Gabamax NT', bestGuess: 'Gabapentin + Nortriptyline (like Gabapin NT)', reason: 'strength not legible; import a specific strength after confirming' },
  { page: 'G', raw: 'TAB Gudrit', bestGuess: 'unknown', reason: 'brand not resolvable' },
  { page: 'G', raw: 'CAP Gen D3', bestGuess: 'possibly a vitamin D3 supplement', reason: 'brand not resolvable' },
  { page: 'G', raw: 'TAB Gelost 1', bestGuess: 'possibly Gelusil tablet', reason: 'brand not resolvable with confidence' },
];
