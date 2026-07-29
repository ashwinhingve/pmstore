/**
 * PM Store native shell.
 *
 * The app is a thin Capacitor wrapper that loads the live, responsive website
 * (`server.url`) — one codebase, no separate React Native app.
 *
 * NOTE on `server.url`: Capacitor documents this as a live-reload/dev setting
 * "not intended for production." We use it deliberately here because the site is
 * a dynamic Next.js SSR app that cannot be statically exported — loading the
 * hosted origin is the only way to ship "the exact website" as an app.
 * Trade-offs: the app needs connectivity (offline falls back to www/index.html
 * via `server.errorPath` below), and JS-bridge plugins rely on the bridge that
 * Capacitor injects into the remote page.
 *
 * `allowNavigation` keeps the store's own origin and the payment gateways inside
 * the WebView; every other http(s) link and the tel:/mailto:/upi: schemes are
 * handed to the OS by Capacitor. Android `intent:` deep links need special
 * parsing, so MainActivity handles those so UPI/checkout redirects work.
 *
 * Config file is .js (CommonJS) rather than .ts on purpose: the Capacitor 8 CLI
 * fails to parse a .ts config on Node 22 ("Cannot read properties of undefined
 * (reading 'CommonJS')").
 *
 * @type {import('@capacitor/cli').CapacitorConfig}
 */
const config = {
  appId: 'com.pratigyamedicalstore.app',
  appName: 'PM Store',
  webDir: 'www',
  server: {
    url: 'https://pratigyamedicalstore.com',
    androidScheme: 'https',
    allowNavigation: [
      'pratigyamedicalstore.com',
      '*.pratigyamedicalstore.com',
      '*.razorpay.com',
      '*.cashfree.com',
    ],
    // On a network error the WebView loads this bundled page (www/index.html,
    // served from the local asset server) instead of a blank screen.
    errorPath: 'index.html',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#FBFAF7',
      androidScaleType: 'CENTER_INSIDE',
      showSpinner: false,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#16233A',
    },
  },
};

module.exports = config;
