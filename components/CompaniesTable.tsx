'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  type ParentCompany, type PipelineStatus,
  PIPELINE_LABELS, PIPELINE_COLOURS,
  urgencyTier, URGENCY_BADGE, URGENCY_LABEL, daysUntil,
} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const STATUSES = Object.keys(PIPELINE_LABELS) as PipelineStatus[]

const URGENCY_FILTERS = [
  { value: 'all',      label: 'All urgencies' },
  { value: 'urgent',   label: 'Urgent (≤90d)' },
  { value: 'upcoming', label: 'Upcoming (≤180d)' },
  { value: 'clear',    label: 'Clear' },
]

export default function CompaniesTable({ initialCompanies }: { initialCompanies: ParentCompany[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterUrgency, setFilterUrgency] = useState<string>('all')
  const [search, setSearch] = useState('')

  const filtered = initialCompanies.filter(c => {
    if (filterStatus !== 'all' && c.pipeline_status !== filterStatus) return false
    if (filterUrgency !== 'all') {
      const tier = urgencyTier(c.soonest_expiry)
      if (tier !== filterUrgency) return false
    }
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  async function updateStatus(id: string, value: PipelineStatus) {
    const supabase = createClient()
    await supabase.from('parent_companies').update({ pipeline_status: value }).eq('id', id)
    startTransition(() => router.refresh())
  }

  async function updateDate(id: string, field: 'last_contact_date' | 'next_contact_date', value: string) {
    const supabase = createClient()
    await supabase.from('parent_companies').update({ [field]: value || null }).eq('id', id)
    startTransition(() => router.refresh())
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Companies</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {filtered.length} of {initialCompanies.length} companies
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search companies…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
        />
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          <option value="all">All statuses</option>
          {STATUSES.map(s => (
            <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={filterUrgency}
          onChange={e => setFilterUrgency(e.target.value)}
          className="px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        >
          {URGENCY_FILTERS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600">Company</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600">Vessels</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Next COFR Expiry</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Pipeline</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Last Contact</th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">Next Contact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No companies match your filters
                  </td>
                </tr>
              )}
              {filtered.map(c => {
                const tier = urgencyTier(c.soonest_expiry)
                const days = daysUntil(c.soonest_expiry)
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link
                        href={`/companies/${c.id}`}
                        className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        {c.name}
                      </Link>
                      {c.needs_review && (
                        <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                          Review
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {[c.location, c.region].filter(Boolean).join(' · ') || '—'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
                        {c.vessel_count ?? 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.soonest_expiry ? (
                        <div className="flex items-center gap-2">
                          {tier && (
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_BADGE[tier]}`}>
                              {URGENCY_LABEL[tier]}
                            </span>
                          )}
                          <span className="text-slate-700">
                            {new Date(c.soonest_expiry).toLocaleDateString('en-GB', {
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
                    <td className="px-4 py-3">
                      <select
                        value={c.pipeline_status}
                        onChange={e => updateStatus(c.id, e.target.value as PipelineStatus)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${PIPELINE_COLOURS[c.pipeline_status]}`}
                      >
                        {STATUSES.map(s => (
                          <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        defaultValue={c.last_contact_date ?? ''}
                        onBlur={e => updateDate(c.id, 'last_contact_date', e.target.value)}
                        className="text-xs text-slate-700 border border-transparent hover:border-slate-300 focus:border-blue-400 rounded px-1.5 py-1 focus:outline-none w-32"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="date"
                        defaultValue={c.next_contact_date ?? ''}
                        onBlur={e => updateDate(c.id, 'next_contact_date', e.target.value)}
                        className="text-xs text-slate-700 border border-transparent hover:border-slate-300 focus:border-blue-400 rounded px-1.5 py-1 focus:outline-none w-32"
                      />
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
