import { describe, expect, it } from 'vitest';
import { mergeAnnouncements, publicAnnouncements } from './site-settings';
import type { ISiteSettings } from '@/models/SiteSettings';
import { EMPTY_DELIVERY_POLICY } from './shipping/delivery-policy';

describe('managed announcement migration', () => {
  it('preserves existing messages and does not add duplicate defaults', () => {
    const input = [{ text: 'Existing promotion', emoji: '🎉', isActive: true }];
    const merged = mergeAnnouncements(input);
    expect(merged).toContainEqual(input[0]);
    expect(mergeAnnouncements(merged)).toEqual(merged);
  });
  it('respects disabled banners and never advertises an unconfigured free offer', () => {
    const settings = { announcementBanner: { enabled: false, announcements: [] }, delivery: EMPTY_DELIVERY_POLICY } as unknown as ISiteSettings;
    expect(publicAnnouncements(settings)).toEqual({ enabled: false, announcements: [] });
    settings.announcementBanner.enabled = true;
    expect(publicAnnouncements(settings).announcements.some(item => item.text.includes('Selected Locations'))).toBe(false);
  });
});
