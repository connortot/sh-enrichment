'use client'

import { useState, useMemo } from 'react'
import type { Vessel, UrgencyTier } from '@/lib/types'
import { urgencyTier, URGENCY_BADGE, URGENCY_LABEL, daysUntil } from '@/lib/types'

type SortField = 'expiry' | 'flag' | 'operator' | 'op_location'
type SortDir   = 'asc' | 'desc'

const STATUS_FILTERS: { value: string; label: string }[] = [
  { value: 'all',      label: 'All' },
  { value: 'expired',  label: 'Expired' },
  { value: 'urgent',   label: 'Urgent' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'clear',    label: 'Clear' },
]

function SortIcon({ field, active, dir }: { field: string; active: boolean; dir: SortDir }) {
  if (!active) return <span className="ml-1 text-slate-300">↕</span>
  return <span className="ml-1">{dir === 'asc' ? '↑' : '↓'}</span>
}

export default function VesselsTable({ vessels }: { vessels: Vessel[] }) {
  const [filterFlag,     setFilterFlag]     = useState('all')
  const [filterOperator, setFilterOperator] = useState('all')
  const [filterOpLoc,    setFilterOpLoc]    = useState('all')
  const [filterStatus,   setFilterStatus]   = useState('all')
  const [sortField,      setSortField]      = useState<SortField>('expiry')
  const [sortDir,        setSortDir]        = useState<SortDir>('asc')

  const flags     = useMemo(() => [...new Set(vessels.map(v => v.flag).filter(Boolean) as string[])].sort(), [vessels])
  const operators = useMemo(() => [...new Set(vessels.map(v => v.operator_name).filter(Boolean) as string[])].sort(), [vessels])
  const opLocs    = useMemo(() => [...new Set(vessels.map(v => v.operator_location).filter(Boolean) as string[])].sort(), [vessels])

  const visible = useMemo(() => {
    let list = vessels
    if (filterFlag     !== 'all') list = list.filter(v => v.flag === filterFlag)
    if (filterOperator !== 'all') list = list.filter(v => v.operator_name === filterOperator)
    if (filterOpLoc    !== 'all') list = list.filter(v => v.operator_location === filterOpLoc)
    if (filterStatus   !== 'all') list = list.filter(v => urgencyTier(v.expiration_date) === filterStatus)
    return list
  }, [vessels, filterFlag, filterOperator, filterOpLoc, filterStatus])

  const sorted = useMemo(() => {
    return [...visible].sort((a, b) => {
      let cmp = 0
      if (sortField === 'expiry') {
        if (!a.expiration_date && !b.expiration_date) cmp = 0
        else if (!a.expiration_date) cmp = 1
        else if (!b.expiration_date) cmp = -1
        else cmp = a.expiration_date.localeCompare(b.expiration_date)
      } else if (sortField === 'flag') {
        cmp = (a.flag ?? '').localeCompare(b.flag ?? '')
      } else if (sortField === 'operator') {
        cmp = (a.operator_name ?? '').localeCompare(b.operator_name ?? '')
      } else if (sortField === 'op_location') {
        cmp = (a.operator_location ?? '').localeCompare(b.operator_location ?? '')
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [visible, sortField, sortDir])

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  if (vessels.length === 0) {
    return (
      <div className="bg-white border border-slate-200 p-8 text-center text-slate-400 text-sm">
        No vessels found
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2 items-center">
        {flags.length > 0 && (
          <select
            value={filterFlag}
            onChange={e => setFilterFlag(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white"
          >
            <option value="all">All flags</option>
            {flags.map(f => <option key={f} value={f}>{f}</option>)}
          </select>
        )}
        {operators.length > 0 && (
          <select
            value={filterOperator}
            onChange={e => setFilterOperator(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white"
          >
            <option value="all">All operators</option>
            {operators.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {opLocs.length > 0 && (
          <select
            value={filterOpLoc}
            onChange={e => setFilterOpLoc(e.target.value)}
            className="px-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white"
          >
            <option value="all">All op. locations</option>
            {opLocs.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        )}
        <div className="flex items-center gap-0.5 bg-slate-100 p-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setFilterStatus(f.value)}
              className={`px-2.5 py-0.5 text-xs font-medium transition-colors ${
                filterStatus === f.value
                  ? 'bg-white text-[#3C3C3B] shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
        {(filterFlag !== 'all' || filterOperator !== 'all' || filterOpLoc !== 'all' || filterStatus !== 'all') && (
          <button
            onClick={() => { setFilterFlag('all'); setFilterOperator('all'); setFilterOpLoc('all'); setFilterStatus('all') }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      <div className="bg-white border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Vessel</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Type</th>
                <th
                  className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort('flag')}
                >
                  Flag <SortIcon field="flag" active={sortField === 'flag'} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort('operator')}
                >
                  Operator <SortIcon field="operator" active={sortField === 'operator'} dir={sortDir} />
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort('op_location')}
                >
                  Op. Location <SortIcon field="op_location" active={sortField === 'op_location'} dir={sortDir} />
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">COFR Effective</th>
                <th
                  className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900 select-none"
                  onClick={() => handleSort('expiry')}
                >
                  COFR Expiry <SortIcon field="expiry" active={sortField === 'expiry'} dir={sortDir} />
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                    No vessels match your filters
                  </td>
                </tr>
              )}
              {sorted.map(v => {
                const tier = urgencyTier(v.expiration_date)
                const days = daysUntil(v.expiration_date)
                return (
                  <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#3C3C3B]">{v.name}</div>
                      <div className="text-xs text-slate-400">{v.vin}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{v.vessel_type_desc ?? '—'}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {v.flag ?? <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-44 truncate" title={v.operator_name ?? ''}>
                      {v.operator_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600 max-w-36 truncate" title={v.operator_location ?? ''}>
                      {v.operator_location ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {v.effective_date
                        ? new Date(v.effective_date).toLocaleDateString('en-US', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {v.expiration_date ? (
                        <div className="flex items-center gap-2 flex-wrap">
                          {tier && (
                            <span className={`text-xs px-2 py-0.5 font-medium ${URGENCY_BADGE[tier]}`}>
                              {URGENCY_LABEL[tier]}
                            </span>
                          )}
                          <span className="text-slate-700">
                            {new Date(v.expiration_date).toLocaleDateString('en-US', {
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
    </div>
  )
}
