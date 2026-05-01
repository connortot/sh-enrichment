import type { Vessel } from '@/lib/types'
import { urgencyTier, URGENCY_BADGE, URGENCY_LABEL, daysUntil } from '@/lib/types'

export default function VesselsTable({ vessels }: { vessels: Vessel[] }) {
  if (vessels.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        No vessels found
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-600">Vessel</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Flag</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Region</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">Operator</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">COFR Effective</th>
              <th className="text-left px-4 py-3 font-medium text-slate-600">COFR Expiry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vessels.map(v => {
              const tier = urgencyTier(v.expiration_date)
              const days = daysUntil(v.expiration_date)
              return (
                <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{v.name}</div>
                    <div className="text-xs text-slate-400">{v.vin}</div>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.vessel_type_desc ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.flag ?? <span className="text-slate-400">—</span>}
                    {v.flag_confidence !== null && v.flag_confidence < 70 && (
                      <span className="ml-1 text-xs text-amber-500">({v.flag_confidence}%)</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{v.vessel_region ?? '—'}</td>
                  <td className="px-4 py-3 text-slate-600 max-w-48 truncate" title={v.operator?.name ?? ''}>
                    {v.operator?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {v.effective_date
                      ? new Date(v.effective_date).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric'
                        })
                      : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {v.expiration_date ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {tier && (
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_BADGE[tier]}`}>
                            {URGENCY_LABEL[tier]}
                          </span>
                        )}
                        <span className="text-slate-700">
                          {new Date(v.expiration_date).toLocaleDateString('en-GB', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })}
                        </span>
                        {days !== null && (
                          <span className="text-slate-400 text-xs">
                            ({days > 0 ? `${days}d` : `${Math.abs(days)}d ago`})
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
