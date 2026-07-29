package com.pratigyamedicalstore.app;

import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.webkit.WebResourceRequest;
import android.webkit.WebView;

import com.getcapacitor.Bridge;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;

/**
 * PM Store app shell.
 *
 * The one native customisation is WebView URL routing. Capacitor's default
 * client already hands off-origin http(s) links and the tel:/mailto:/upi:
 * schemes to the OS, but Android's {@code intent:} deep links — used by UPI apps
 * (GPay, PhonePe) and the Razorpay/Cashfree redirects — are not parseable as
 * plain URIs, so ACTION_VIEW fails and checkout dies inside the WebView. We
 * parse those with {@code URI_INTENT_SCHEME}, launch the target app, and honour
 * any {@code browser_fallback_url}. Everything else defers to the default
 * BridgeWebViewClient.
 *
 * The offline fallback (www/index.html) is wired declaratively through
 * {@code server.errorPath} in capacitor.config.js — no code is needed here for it.
 */
public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // super.onCreate() has built the bridge (BridgeActivity#load), so the
        // WebView is available. Wrap the default client with our intent: handler.
        final Bridge bridge = getBridge();
        if (bridge == null || bridge.getWebView() == null) {
            return;
        }

        bridge.getWebView().setWebViewClient(new BridgeWebViewClient(bridge) {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request != null ? request.getUrl() : null;
                String scheme = uri != null ? uri.getScheme() : null;
                if ("intent".equals(scheme)) {
                    return launchIntentUri(view, uri.toString());
                }
                return super.shouldOverrideUrlLoading(view, request);
            }
        });
    }

    /**
     * Launch an Android {@code intent:} deep link, falling back to its
     * {@code browser_fallback_url} when no app can handle it. Always returns true
     * so the raw intent: URL is never loaded into the WebView.
     */
    private boolean launchIntentUri(WebView view, String url) {
        try {
            Intent intent = Intent.parseUri(url, Intent.URI_INTENT_SCHEME);
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            try {
                getApplicationContext().startActivity(intent);
                return true;
            } catch (ActivityNotFoundException notFound) {
                String fallback = intent.getStringExtra("browser_fallback_url");
                if (fallback != null && view != null) {
                    view.loadUrl(fallback);
                }
                return true;
            }
        } catch (Exception ignored) {
            // Malformed intent URI — swallow rather than crash checkout.
            return true;
        }
    }
}
