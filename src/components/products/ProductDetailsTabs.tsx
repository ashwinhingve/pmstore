'use client';

import { useState } from 'react';
import DOMPurify from 'isomorphic-dompurify';

interface Specification {
  key: string;
  value: string;
  order: number;
}

interface ProductDetailsTabsProps {
  longDescription?: string;
  specifications: Specification[];
}

const TABS = [
  { id: 'description', label: 'Description' },
  { id: 'specifications', label: 'Specifications' },
  { id: 'shipping', label: 'Shipping & Returns' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ProductDetailsTabs({
  longDescription,
  specifications,
}: ProductDetailsTabsProps) {
  const [activeTab, setActiveTab] = useState<TabId>('description');

  const renderTabContent = () => {
    switch (activeTab) {
      case 'description':
        return (
          <div className="prose prose-sm max-w-none">
            {longDescription ? (
              <div
                dangerouslySetInnerHTML={{
                  __html: DOMPurify.sanitize(longDescription),
                }}
              />
            ) : (
              <p className="text-gray-500 italic">
                No detailed description available for this product.
              </p>
            )}
          </div>
        );

      case 'specifications':
        return (
          <div>
            {specifications && specifications.length > 0 ? (
              <table className="w-full">
                <tbody className="divide-y divide-gray-200">
                  {specifications
                    .sort((a, b) => a.order - b.order)
                    .map((spec, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="py-3 px-4 font-medium text-gray-900 w-1/3">
                          {spec.key}
                        </td>
                        <td className="py-3 px-4 text-gray-700">{spec.value}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 italic">
                No specifications available for this product.
              </p>
            )}
          </div>
        );

      case 'shipping':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Shipping Information
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Free shipping on orders above ₹500</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Standard delivery: 3-5 business days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Express delivery available in select areas</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Track your order with real-time updates</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                Return Policy
              </h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>7-day return policy for unopened products</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Full refund or exchange available</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Product must be in original packaging</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-green-600 mt-1">✓</span>
                  <span>Easy return process through our portal</span>
                </li>
              </ul>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800">
                <strong>Note:</strong> Please check the product carefully before opening
                the package. Contact our customer support for any queries.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 py-4 px-6 font-medium text-sm sm:text-base transition-colors ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-amber-600 to-red-700 text-white'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="p-6 md:p-8">{renderTabContent()}</div>
    </div>
  );
}
