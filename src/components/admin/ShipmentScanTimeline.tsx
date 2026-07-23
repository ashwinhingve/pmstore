interface Scan {
  status: string;
  location: string;
  timestamp: string;
  remarks?: string;
}

interface Props {
  scans: Scan[];
  provider: string;
}

export default function ShipmentScanTimeline({ scans, provider }: Props) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Shipment Activity</h3>
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
            provider === 'shiprocket'
              ? 'bg-orange-100 text-orange-700'
              : 'bg-blue-100 text-blue-700'
          }`}
        >
          {provider === 'shiprocket' ? 'Shiprocket' : 'Delhivery'}
        </span>
      </div>

      <div className="relative">
        {scans.map((scan, index) => (
          <div key={index} className="flex gap-3 pb-4 last:pb-0">
            {/* Timeline line + dot */}
            <div className="flex flex-col items-center">
              <div
                className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1 ${
                  index === 0 ? 'bg-amber-500' : 'bg-gray-300'
                }`}
              />
              {index < scans.length - 1 && (
                <div className="w-px flex-1 bg-gray-200 mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900">{scan.status}</p>
              {scan.location && (
                <p className="text-xs text-gray-500 mt-0.5">{scan.location}</p>
              )}
              {scan.remarks && scan.remarks !== scan.status && (
                <p className="text-xs text-gray-400 mt-0.5">{scan.remarks}</p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                {new Date(scan.timestamp).toLocaleString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
