import type { Metadata } from 'next';
import Link from 'next/link';
import {
  Download,
  FolderOpen,
  Settings,
  CheckCircle2,
  ShieldCheck,
  Smartphone,
  RefreshCw,
  ArrowRight,
} from 'lucide-react';
import { Container } from '@/components/shared/Container';
import { SectionHeading } from '@/components/shared/SectionHeading';

/**
 * Download the Android app.
 *
 * The app is a thin Capacitor wrapper of this website, shipped as a signed APK
 * that anyone can sideload while the Google Play listing is in review. The APK
 * is served statically from `public/downloads/pmstore.apk`. Rebuild + replace
 * that file (and bump APP_VERSION) only when the native shell changes — because
 * the app loads the live site, everyday website changes reach it with no new APK.
 */

const APK_HREF = '/downloads/pmstore.apk';
const APP_VERSION = '1.0';
const APK_SIZE = '6 MB';
const MIN_ANDROID = '7.0';

export const metadata: Metadata = {
  title: 'Download the PM Store Android app',
  description:
    'Install the PM Store Android app to order medicines, compare brands by price per tablet, upload a prescription and track orders. Free download for Android 7.0 and up.',
  alternates: { canonical: '/download' },
  openGraph: {
    title: 'Download the PM Store Android app',
    description:
      'Order medicines, compare prices per tablet and upload a prescription from your phone. Free download for Android.',
    url: '/download',
    type: 'website',
  },
};

const INSTALL_STEPS = [
  {
    icon: Download,
    title: 'Download the app',
    body: 'Tap the button above. The file pmstore.apk saves to your phone.',
  },
  {
    icon: FolderOpen,
    title: 'Open the file',
    body: 'Open pmstore.apk from the download notification, or find it in your Downloads folder.',
  },
  {
    icon: Settings,
    title: 'Allow the install',
    body: 'If your phone asks, turn on "Install unknown apps" for your browser and go back. You do this once — it is normal for apps that come from a website instead of the Play Store.',
  },
  {
    icon: CheckCircle2,
    title: 'Install and open',
    body: 'Tap Install, then Open. The PM Store app is ready to use.',
  },
];

const ASSURANCES = [
  {
    icon: ShieldCheck,
    title: 'Safe to install',
    body: 'The app is from Pratigya Medical Store and opens our real website in a secure app window over HTTPS. Your phone warns about files from outside the Play Store by default — you allow this one once.',
  },
  {
    icon: RefreshCw,
    title: 'Always up to date',
    body: 'The app shows the live store, so new medicines, prices and features appear on their own. You rarely need to download the app again.',
  },
  {
    icon: Smartphone,
    title: 'Coming to the Play Store',
    body: 'We are adding PM Store to the Google Play Store. Until then, you can install it straight from here and start ordering today.',
  },
];

export default function DownloadPage() {
  return (
    <div className="bg-[var(--paper)]">
      {/* Hero + primary download */}
      <section className="border-b border-[var(--foil-soft)] bg-[var(--paper-tint)]">
        <Container className="py-16 md:py-20">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.14em] text-[var(--brand)]">
            Android app
          </p>
          <h1 className="max-w-3xl text-[length:var(--step-3)] text-[var(--ink)]">
            Get the PM Store app
          </h1>
          <p className="mt-4 max-w-2xl text-[length:var(--step-1)] text-[var(--ink-70)]">
            Order medicines, compare brands by price per tablet, upload a prescription and track
            your orders — all from your phone.
          </p>

          <div className="mt-8 flex flex-col items-start gap-4">
            <a
              href={APK_HREF}
              download
              className="inline-flex h-14 items-center justify-center gap-2.5 rounded-[var(--radius-pill)] bg-[var(--brand)] px-8 text-[length:var(--step-0)] font-semibold text-[var(--brand-ink)] shadow-[var(--shadow-brand)] transition-[background-color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-[var(--brand-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)]"
            >
              <Download className="h-5 w-5" aria-hidden="true" />
              Download for Android
            </a>
            <p className="text-sm text-[var(--ink-40)]">
              Free ·{' '}
              <span style={{ fontFamily: 'var(--font-data)' }}>
                Android {MIN_ANDROID}+ · {APK_SIZE} · Version {APP_VERSION}
              </span>
            </p>
          </div>
        </Container>
      </section>

      {/* How to install */}
      <section>
        <Container className="py-16 sm:py-20">
          <SectionHeading
            eyebrow="How to install"
            title="Four steps to install"
            description="Installing an app from a website takes one extra tap the first time. Here is the whole thing."
            className="mb-10"
          />
          <ol className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {INSTALL_STEPS.map((s, i) => {
              const Icon = s.icon;
              return (
                <li
                  key={s.title}
                  className="relative rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-soft)] text-[var(--brand)]">
                      <Icon className="h-5 w-5" aria-hidden="true" />
                    </span>
                    <span
                      className="text-xs font-semibold uppercase tracking-wide text-[var(--ink-40)]"
                      style={{ fontFamily: 'var(--font-data)' }}
                    >
                      Step {i + 1}
                    </span>
                  </div>
                  <h3 className="mb-1.5 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
                    {s.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--ink-70)]">{s.body}</p>
                </li>
              );
            })}
          </ol>
        </Container>
      </section>

      {/* Assurances */}
      <section className="border-y border-[var(--foil-soft)] bg-[var(--paper-tint)]">
        <Container className="py-16 sm:py-20">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {ASSURANCES.map((a) => {
              const Icon = a.icon;
              return (
                <div
                  key={a.title}
                  className="rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 shadow-[var(--shadow-sm)]"
                >
                  <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-[var(--radius-md)] bg-[var(--brand-soft)] text-[var(--brand)]">
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <h3 className="mb-1.5 text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
                    {a.title}
                  </h3>
                  <p className="text-sm leading-relaxed text-[var(--ink-70)]">{a.body}</p>
                </div>
              );
            })}
          </div>

          {/* iPhone / desktop fallback */}
          <div className="mt-8 flex flex-col gap-3 rounded-[var(--radius-lg)] border border-[var(--foil-soft)] bg-[var(--paper-card)] p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-[length:var(--step-0)] font-semibold text-[var(--ink)]">
                On an iPhone or a computer?
              </h3>
              <p className="mt-1 text-sm leading-relaxed text-[var(--ink-70)]">
                The app is for Android for now. Open our website — it works the same as the app, and
                on an iPhone you can add it to your home screen from Safari.
              </p>
            </div>
            <Link
              href="/"
              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-pill)] border border-[var(--brand)] px-6 font-semibold text-[var(--brand)] transition-colors duration-[var(--dur-fast)] hover:bg-[var(--brand-soft)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand)]"
            >
              Open the website
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </Container>
      </section>

      {/* Closing download CTA */}
      <section>
        <Container className="py-16 sm:py-20">
          <div className="relative isolate overflow-hidden rounded-[var(--radius-lg)] bg-[image:var(--surface-hero)] px-6 py-12 text-center shadow-[var(--shadow-feature)] sm:px-10 sm:py-16">
            <h2 className="mx-auto max-w-2xl font-[family-name:var(--font-display)] text-[length:var(--step-2)] text-[var(--paper)]">
              Ready to order from your phone
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-[var(--ink-10)]">
              Download the app and your medicines are a few taps away.
            </p>
            <div className="mt-8 flex justify-center">
              <a
                href={APK_HREF}
                download
                className="inline-flex h-12 items-center justify-center gap-2 rounded-[var(--radius-pill)] bg-[var(--brand)] px-7 font-semibold text-[var(--brand-ink)] shadow-[var(--shadow-brand)] transition-[background-color,transform] duration-[var(--dur-fast)] hover:-translate-y-0.5 hover:bg-[var(--brand-deep)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-ink)]"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Download for Android
              </a>
            </div>
          </div>
        </Container>
      </section>
    </div>
  );
}
