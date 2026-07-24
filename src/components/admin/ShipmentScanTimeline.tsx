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
    <div className="bg-[var(--paper-card)] rounded-lg shadow-sm border border-[var(--foil-soft)] p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-[var(--ink)]">Shipment activity</h3>
        <span
          className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
            provider === 'shiprocket'
              ? 'bg-[var(--foil-soft)] text-[var(--ink)]'
              : 'bg-[var(--foil-soft)] text-[var(--ink)]'
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
                  index === 0 ? 'bg-[var(--mint)]' : 'bg-[var(--foil)]'
                }`}
              />
              {index < scans.length - 1 && (
                <div className="w-px flex-1 bg-[var(--foil-soft)] mt-1" />
              )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--ink)]">{scan.status}</p>
              {scan.location && (
                <p className="text-xs text-[var(--ink-70)] mt-0.5">{scan.location}</p>
              )}
              {scan.remarks && scan.remarks !== scan.status && (
                <p className="text-xs text-[var(--ink-40)] mt-0.5">{scan.remarks}</p>
              )}
              <p className="text-xs text-[var(--ink-40)] mt-1" style={{ fontFamily: 'var(--font-data)' }}>
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
