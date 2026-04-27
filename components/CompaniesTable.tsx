'use client'

import { useState, useTransition, useMemo } from 'react'
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
  { value: 'all',      label: 'All' },
  { value: 'urgent',   label: 'Urgent ≤90d' },
  { value: 'upcoming', label: 'Upcoming ≤180d' },
  { value: 'clear',    label: 'Clear' },
]

type CompanyFormData = {
  name: string
  location: string
  region: string
  pipeline_status: PipelineStatus
}

const EMPTY_COMPANY_FORM: CompanyFormData = {
  name: '',
  location: '',
  region: '',
  pipeline_status: 'prospect',
}

export default function CompaniesTable({ initialCompanies }: { initialCompanies: ParentCompany[] }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [companies, setCompanies] = useState<ParentCompany[]>(initialCompanies)
  const [filterLocation, setFilterLocation] = useState<string>('East / Southeast Asia')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterUrgency, setFilterUrgency] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState<CompanyFormData>(EMPTY_COMPANY_FORM)
  const [adding, setAdding] = useState(false)

  // Derive unique regions from company data, excluding Unknown
  const regions = useMemo(() => {
    const locs = new Set<string>()
    for (const c of companies) {
      if (c.name === 'Unknown Parent Company') continue
      if (c.region) locs.add(c.region)
    }
    return Array.from(locs).sort()
  }, [companies])

  const filtered = companies.filter(c => {
    if (filterLocation !== 'all') {
      if (c.name !== 'Unknown Parent Company' && c.region !== filterLocation) return false
    }
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

  function formField(key: keyof CompanyFormData) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setAddForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleAddCompany() {
    if (!addForm.name.trim()) return
    setAdding(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('parent_companies')
      .insert({
        name:             addForm.name.trim(),
        location:         addForm.location || null,
        region:           addForm.region || null,
        pipeline_status:  addForm.pipeline_status,
        needs_review:     false,
      })
      .select()
      .single()
    if (data) {
      setCompanies(cs => [...cs, { ...data, vessel_count: 0, urgent_vessel_count: 0, soonest_expiry: null }])
    }
    setAdding(false)
    setShowAddModal(false)
    setAddForm(EMPTY_COMPANY_FORM)
    startTransition(() => router.refresh())
  }

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Companies</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {filtered.length} of {companies.length} companies
            </p>
          </div>
          <button
            onClick={() => { setAddForm(EMPTY_COMPANY_FORM); setShowAddModal(true) }}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
          >
            + Add company
          </button>
        </div>

        {/* Primary filter — Region pills */}
        {regions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-2">Filter by region</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilterLocation('all')}
                className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  filterLocation === 'all'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All regions
              </button>
              {regions.map(loc => (
                <button
                  key={loc}
                  onClick={() => setFilterLocation(loc === filterLocation ? 'all' : loc)}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    filterLocation === loc
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {loc}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Secondary filters */}
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
          <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
            {URGENCY_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterUrgency(f.value)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  filterUrgency === f.value
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Company</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Location</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Total Vessels</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-600">Urgent COFR</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Next COFR Expiry</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Pipeline</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Last Contact</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-600">Next Contact</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-slate-400">
                      No companies match your filters
                    </td>
                  </tr>
                )}
                {filtered.map(c => {
                  const tier = urgencyTier(c.soonest_expiry)
                  const days = daysUntil(c.soonest_expiry)
                  const isUnknown = c.name === 'Unknown Parent Company'
                  const urgentCount = c.urgent_vessel_count ?? 0
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50 transition-colors ${isUnknown ? 'bg-slate-50/70' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/companies/${c.id}`}
                          className={`font-medium hover:underline ${isUnknown ? 'text-slate-500 italic' : 'text-blue-600 hover:text-blue-800'}`}
                        >
                          {c.name}
                        </Link>
                        {c.needs_review && !isUnknown && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">
                            Review
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {isUnknown ? (
                          <span className="text-slate-400 italic">—</span>
                        ) : (
                          [c.location, c.region].filter(Boolean).join(' · ') || '—'
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-medium text-xs">
                          {c.vessel_count ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {urgentCount > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-red-100 text-red-700 font-medium text-xs">
                            {urgentCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
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
                        {isUnknown ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <select
                            value={c.pipeline_status}
                            onChange={e => updateStatus(c.id, e.target.value as PipelineStatus)}
                            className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400 ${PIPELINE_COLOURS[c.pipeline_status]}`}
                          >
                            {STATUSES.map(s => (
                              <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!isUnknown && (
                          <input
                            type="date"
                            defaultValue={c.last_contact_date ?? ''}
                            onBlur={e => updateDate(c.id, 'last_contact_date', e.target.value)}
                            className="text-xs text-slate-700 border border-transparent hover:border-slate-300 focus:border-blue-400 rounded px-1.5 py-1 focus:outline-none w-32"
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {!isUnknown && (
                          <input
                            type="date"
                            defaultValue={c.next_contact_date ?? ''}
                            onBlur={e => updateDate(c.id, 'next_contact_date', e.target.value)}
                            className="text-xs text-slate-700 border border-transparent hover:border-slate-300 focus:border-blue-400 rounded px-1.5 py-1 focus:outline-none w-32"
                          />
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

      {/* Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowAddModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-5">Add Company</h3>

            <div className="space-y-4">
              <ModalField label="Company Name *" value={addForm.name} onChange={formField('name')} />
              <ModalField label="Location" value={addForm.location} onChange={formField('location')} placeholder="e.g. Tokyo, Japan" />
              <ModalField label="Region" value={addForm.region} onChange={formField('region')} placeholder="e.g. East / Southeast Asia" />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Pipeline Status</label>
                <select
                  value={addForm.pipeline_status}
                  onChange={formField('pipeline_status')}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCompany}
                disabled={adding || !addForm.name.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
              >
                {adding ? 'Adding…' : 'Add Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function ModalField({
  label, value, onChange, placeholder,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
      />
    </div>
  )
}
