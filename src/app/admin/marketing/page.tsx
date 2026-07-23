import { requireAdmin } from '@/lib/auth-helpers';
import { connectDB } from '@/lib/mongodb';
import MarketingSettings from '@/models/MarketingSettings';
import GtmSection from './components/GtmSection';
import AnalyticsSection from './components/AnalyticsSection';
import AdsSection from './components/AdsSection';
import PixelSection from './components/PixelSection';
import SearchConsoleSection from './components/SearchConsoleSection';

export const metadata = {
  title: 'Marketing & Analytics | Admin',
};

export default async function MarketingPage() {
  await requireAdmin();
  await connectDB();

  let settings = await MarketingSettings.findOne({ key: 'global' }).lean() as any;
  if (!settings) {
    settings = (await MarketingSettings.create({ key: 'global' })).toObject();
  }

  const data = {
    gtm_id: settings.gtm_id || '',
    gtm_enabled: settings.gtm_enabled ?? false,
    google_analytics_id: settings.google_analytics_id || '',
    google_ads_conversion_id: settings.google_ads_conversion_id || '',
    google_ads_label: settings.google_ads_label || '',
    meta_pixel_id: settings.meta_pixel_id || '',
    search_console_verified: settings.search_console_verified ?? false,
  };

  return (
    <div className="space-y-8 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Marketing & Analytics</h1>
        <p className="text-sm text-gray-500 mt-1">
          Manage tracking scripts and marketing integrations. Changes take effect on next page load.
        </p>
      </div>

      <GtmSection initialGtmId={data.gtm_id} initialGtmEnabled={data.gtm_enabled} />
      <AnalyticsSection initialId={data.google_analytics_id} gtmEnabled={data.gtm_enabled} />
      <AdsSection
        initialConversionId={data.google_ads_conversion_id}
        initialLabel={data.google_ads_label}
        gtmEnabled={data.gtm_enabled}
      />
      <PixelSection initialPixelId={data.meta_pixel_id} gtmEnabled={data.gtm_enabled} />
      <SearchConsoleSection verified={data.search_console_verified} />
    </div>
  );
}
