import type { Operator, Vessel } from '@/lib/types'

export default function OperatorsSection({
  operators,
  vessels,
}: {
  operators: Operator[]
  vessels: Vessel[]
}) {
  if (operators.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400 text-sm">
        No operators found
      </div>
    )
  }

  // Count vessels per operator
  const vesselCountByOperator = vessels.reduce<Record<string, number>>((acc, v) => {
    if (v.operator_id) acc[v.operator_id] = (acc[v.operator_id] ?? 0) + 1
    return acc
  }, {})

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            <th className="text-left px-4 py-3 font-medium text-slate-600">Operator</th>
            <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
            <th className="text-center px-4 py-3 font-medium text-slate-600">Vessels</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {operators.map(op => (
            <tr key={op.id} className="hover:bg-slate-50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-900">{op.name}</td>
              <td className="px-4 py-3 text-slate-600">
                {op.operator_location || <span className="text-slate-400">—</span>}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
                  {vesselCountByOperator[op.id] ?? 0}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
