"use client";

import { useEffect, useState } from "react";

interface AnnouncementItem {
  text: string;
  emoji: string;
}

export function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([
    { text: "Free Shipping Above ₹499", emoji: "🚚" },
    { text: "Boost Your Daily Nutrition with TAPTIFS", emoji: "✨" },
  ]);
  const [enabled, setEnabled] = useState(true);

  useEffect(() => {
    fetch("/api/settings/announcements")
      .then((res) => res.json())
      .then((data) => {
        if (data.announcements && data.announcements.length > 0) {
          setAnnouncements(data.announcements);
        }
        if (data.enabled === false) {
          setEnabled(false);
        }
      })
      .catch(() => {
        // Keep defaults on error
      });
  }, []);

  if (!enabled || announcements.length === 0) return null;

  // Repeat announcements enough times for seamless marquee
  const repeated = [...announcements, ...announcements, ...announcements];

  return (
    <div className="bg-gradient-to-r from-orange-600 via-red-600 to-orange-600 text-white py-2.5 overflow-hidden relative">
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30" />
      <div className="animate-marquee whitespace-nowrap flex relative z-10">
        {repeated.map((item, i) => (
          <span
            key={i}
            className="mx-8 inline-flex items-center gap-2 text-sm font-medium"
          >
            {item.emoji && <span className="text-base">{item.emoji}</span>}
            <span className="font-semibold">{item.text}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
