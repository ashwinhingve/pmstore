"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function ShopNowButton() {
  const [isHovered, setIsHovered] = useState(false);
  const router = useRouter();

  return (
    <div className="fixed bottom-28 right-6 z-[100]" style={{ bottom: 'calc(7rem + env(safe-area-inset-bottom, 0px))' }}>
      <button
        onClick={() => router.push("/products")}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className="relative w-14 h-14 bg-green-600 rounded-full flex items-center justify-center hover:bg-green-700 transition-all shadow-2xl hover:shadow-green-600/50 hover:scale-110 cursor-pointer"
        aria-label="Shop Now"
      >
        {/* Shopping Bag Icon */}
        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>

        {/* Pulse Ring */}
        <span className="absolute inset-0 rounded-full bg-green-600 animate-ping opacity-20 pointer-events-none" />
      </button>

      {/* Tooltip */}
      <div
        className={`absolute bottom-full right-0 mb-2 transition-all duration-300 ${
          isHovered ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none"
        }`}
      >
        <div className="bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg whitespace-nowrap text-sm font-medium">
          Shop Now
          <div className="absolute -bottom-1 right-6 w-2 h-2 bg-gray-900 transform rotate-45" />
        </div>
      </div>
    </div>
  );
}
