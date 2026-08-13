import type { Metadata } from "next";
import Script from "next/script";
import { Bricolage_Grotesque, Public_Sans, Martian_Mono } from "next/font/google";
import "@/styles/globals.css";
import "@/styles/tokens.css";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SiteChrome } from "@/components/layout/SiteChrome";
import SessionProvider from "@/components/providers/SessionProvider";
import { ToastViewport } from "@/components/ui/toast";
import { CompareTray } from "@/components/compare/CompareTray";
import { WhatsAppButton } from "@/components/shared/WhatsAppButton";
import { connectDB } from "@/lib/mongodb";
import MarketingSettings from "@/models/MarketingSettings";
import { organizationSchema, websiteSchema, safeJsonLd } from "@/lib/seo/structured-data";

// Self-hosted via next/font — no external font request (works under strict CSP).
// The CSS variables feed the --font-* tokens in tokens.css.
const fontDisplay = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "600", "800"],
  variable: "--font-display-loaded",
  display: "swap",
});
const fontBody = Public_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body-loaded",
  display: "swap",
});
const fontData = Martian_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-data-loaded",
  display: "swap",
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://pratigyamedicalstore.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "PM Store — Online Pharmacy | Medicines, Surgical & Health Supplies",
    template: "%s | PM Store",
  },
  description: "PM Store — order medicines online from a trusted Bhopal pharmacy. Compare brands by price per tablet, find cheaper equivalents of the same composition, upload a prescription, and reorder in one tap.",
  keywords: ["pm store", "pmstore", "pm store pharmacy", "pm store bhopal", "pm store online", "pratigya medical store", "online pharmacy", "buy medicines online", "generic medicine", "price per tablet", "surgical supplies", "prescription upload", "medicine home delivery bhopal", "India pharmacy"],
  alternates: {
    canonical: SITE_URL,
  },
  openGraph: {
    title: "PM Store — Online Pharmacy | Medicines & Health Supplies",
    description: "Order medicines online from PM Store. Compare brands by price per tablet, find cheaper equivalents, upload a prescription, and reorder in one tap.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "PM Store — Online Pharmacy",
      },
    ],
    siteName: "PM Store",
    type: "website",
    locale: "en_IN",
    url: SITE_URL,
  },
  twitter: {
    card: "summary_large_image",
    title: "PM Store — Online Pharmacy | Medicines & Health Supplies",
    description: "Order medicines online from PM Store. Compare brands by price per tablet, find cheaper equivalents, and upload a prescription.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

// Brand entity + site schema — single source of truth in src/lib/seo.
// name is "PM Store" (the query we want to rank for); the registered name rides
// along as legalName. TODO (Week 6): add the drug-licence disclosure credential.
const orgJsonLd = organizationSchema(SITE_URL);
const websiteJsonLd = websiteSchema(SITE_URL);

async function getMarketingSettings() {
  try {
    await connectDB();
    const settings = await MarketingSettings.findOne({ key: 'global' }).lean() as any;
    return {
      gtm_id: settings?.gtm_id || '',
      gtm_enabled: settings?.gtm_enabled ?? false,
      google_analytics_id: settings?.google_analytics_id || '',
      google_ads_conversion_id: settings?.google_ads_conversion_id || '',
      google_ads_label: settings?.google_ads_label || '',
      meta_pixel_id: settings?.meta_pixel_id || '',
    };
  } catch {
    // If DB is unreachable, inject nothing — don't crash the layout
    return {
      gtm_id: '',
      gtm_enabled: false,
      google_analytics_id: '',
      google_ads_conversion_id: '',
      google_ads_label: '',
      meta_pixel_id: '',
    };
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const marketing = await getMarketingSettings();

  return (
    <html
      lang="en"
      className={`${fontDisplay.variable} ${fontBody.variable} ${fontData.variable}`}
    >
      <head>
        {/* Organization structured data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(orgJsonLd) }}
        />
        {/* WebSite structured data with SearchAction */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: safeJsonLd(websiteJsonLd) }}
        />

        {/* === TRACKING SCRIPTS === */}

        {/* Google Tag Manager — primary hub (suppresses all direct scripts below) */}
        {marketing.gtm_enabled && marketing.gtm_id && (
          <Script id="gtm-head" strategy="beforeInteractive">
            {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
})(window,document,'script','dataLayer','${marketing.gtm_id}');`}
          </Script>
        )}

        {/* Google Analytics 4 + Google Ads — only when GTM is OFF
            Single gtag.js load; both IDs configured in one init block */}
        {!marketing.gtm_enabled && (marketing.google_analytics_id || marketing.google_ads_conversion_id) && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${marketing.google_analytics_id || marketing.google_ads_conversion_id}`}
              strategy="afterInteractive"
            />
            <Script id="gtag-init" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());${
                marketing.google_analytics_id ? `gtag('config','${marketing.google_analytics_id}');` : ''
              }${
                marketing.google_ads_conversion_id ? `gtag('config','${marketing.google_ads_conversion_id}');` : ''
              }`}
            </Script>
          </>
        )}

        {/* Meta Pixel — only when GTM is OFF */}
        {!marketing.gtm_enabled && marketing.meta_pixel_id && (
          <Script id="meta-pixel" strategy="afterInteractive">
            {`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${marketing.meta_pixel_id}');fbq('track','PageView');`}
          </Script>
        )}
      </head>
      <body>
        {/* GTM noscript fallback — must be immediately after <body> */}
        {marketing.gtm_enabled && marketing.gtm_id && (
          <noscript>
            <iframe
              src={`https://www.googletagmanager.com/ns.html?id=${marketing.gtm_id}`}
              height="0"
              width="0"
              style={{ display: 'none', visibility: 'hidden' }}
            />
          </noscript>
        )}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-[var(--radius-sm)] focus:bg-[var(--ink)] focus:px-4 focus:py-3 focus:text-[var(--paper-card)] focus:shadow-[var(--shadow-lg)]"
        >
          Skip to content
        </a>
        <SessionProvider>
          <SiteChrome
            header={<Header />}
            footer={<Footer />}
            floating={
              <>
                <CompareTray />
                <WhatsAppButton />
              </>
            }
          >
            {children}
          </SiteChrome>
          <ToastViewport />
        </SessionProvider>
      </body>
    </html>
  );
}
