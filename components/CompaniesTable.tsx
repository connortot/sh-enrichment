'use client'

import { useState, useTransition, useMemo, useEffect } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  type ParentCompany, type PipelineStatus, type ClientType,
  PIPELINE_LABELS, PIPELINE_COLOURS,
  CLIENT_TYPE_LABELS, CLIENT_TYPE_COLOURS,
  urgencyTier, URGENCY_BADGE, URGENCY_LABEL, daysUntil,
} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'
import MultiSelectDropdown from '@/components/MultiSelectDropdown'

const STATUSES = Object.keys(PIPELINE_LABELS) as PipelineStatus[]

const URGENCY_FILTERS = [
  { value: 'all',      label: 'All' },
  { value: 'expired',  label: 'Expired' },
  { value: 'urgent',   label: 'Urgent ≤60d' },
  { value: 'upcoming', label: 'Upcoming ≤180d' },
  { value: 'clear',    label: 'Clear' },
]

function extractCountry(location: string | null): string | null {
  if (!location) return null
  const parts = location.split(',')
  return parts[parts.length - 1].trim() || null
}

const CLIENT_TYPES: ClientType[] = ['shoreline', 'hudson', 'both']

type SortField = 'name' | 'location' | 'urgent' | 'expiry' | 'vessels' | 'contacts' | 'status' | 'last_contact' | 'next_contact'
type SortDir   = 'asc' | 'desc'

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  return (
    <span className={active ? 'ml-1' : 'ml-1 text-slate-300'}>
      {active ? (dir === 'asc' ? '↑' : '↓') : '↕'}
    </span>
  )
}

type CompanyFormData = {
  name: string
  location: string
  pipeline_status: PipelineStatus
}

const EMPTY_COMPANY_FORM: CompanyFormData = {
  name: '',
  location: '',
  pipeline_status: 'prospect',
}

function parseCSVList(val: string | null): string[] {
  if (!val) return []
  return val.split(',').map(s => decodeURIComponent(s.trim())).filter(Boolean)
}

export default function CompaniesTable({
  initialCompanies,
  asianScopeIds,
}: {
  initialCompanies: ParentCompany[]
  asianScopeIds: string[]
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [, startTransition] = useTransition()
  const [companies, setCompanies] = useState<ParentCompany[]>(initialCompanies)

  // --- filter state ---
  const [filterLocationVal,  setFilterLocationVal]  = useState<string>(searchParams.get('location') ?? 'all')
  const [filterAsianScope,   setFilterAsianScope]   = useState<boolean>(searchParams.get('asian') !== 'false')
  const [filterStatus,       setFilterStatus]       = useState<string>(searchParams.get('status') ?? 'all')
  const [filterUrgency,      setFilterUrgency]      = useState<string>(searchParams.get('urgency') ?? 'all')
  const [filterClientView,   setFilterClientView]   = useState<'all' | 'clients' | 'prospects'>((searchParams.get('view') as 'all' | 'clients' | 'prospects') ?? 'all')
  const [filterGtMin,        setFilterGtMin]        = useState<string>(searchParams.get('gtMin') ?? '')
  const [filterGtMax,        setFilterGtMax]        = useState<string>(searchParams.get('gtMax') ?? '')
  const [filterContactRoles, setFilterContactRoles] = useState<string[]>(parseCSVList(searchParams.get('roles')))
  const [filterFlags,        setFilterFlags]        = useState<string[]>(parseCSVList(searchParams.get('flags')))
  const [filterOpLocs,       setFilterOpLocs]       = useState<string[]>(parseCSVList(searchParams.get('opLocs')))
  const [search,             setSearch]             = useState(searchParams.get('q') ?? '')

  // --- sort state ---
  const [sortField, setSortField] = useState<SortField>((searchParams.get('sort') as SortField | null) ?? 'expiry')
  const [sortDir,   setSortDir]   = useState<SortDir>((searchParams.get('sortDir') as SortDir) ?? 'asc')

  // --- modal state ---
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm,      setAddForm]      = useState<CompanyFormData>(EMPTY_COMPANY_FORM)
  const [adding,       setAdding]       = useState(false)

  const asianSet = useMemo(() => new Set(asianScopeIds), [asianScopeIds])

  function handleSort(field: SortField) {
    if (field === sortField) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  // --- derived filter option lists ---
  const locations = useMemo(() => {
    const locs = new Set<string>()
    for (const c of companies) {
      if (c.name === 'Unknown Parent Company') continue
      const country = extractCountry(c.location)
      if (country) locs.add(country)
    }
    return Array.from(locs).sort()
  }, [companies])

  const allContactRoles = useMemo(() => {
    const roles = new Set<string>()
    for (const c of companies) c.contact_titles?.forEach(t => roles.add(t))
    return Array.from(roles).sort()
  }, [companies])

  const allFlags = useMemo(() => {
    const flags = new Set<string>()
    for (const c of companies) c.vessel_flags?.forEach(f => flags.add(f))
    return Array.from(flags).sort()
  }, [companies])

  const allOpLocs = useMemo(() => {
    const locs = new Set<string>()
    for (const c of companies) c.vessel_op_locations?.forEach(l => locs.add(l))
    return Array.from(locs).sort()
  }, [companies])

  // --- filtering ---
  const filtered = useMemo(() => {
    const gtMin = filterGtMin ? parseInt(filterGtMin) : -Infinity
    const gtMax = filterGtMax ? parseInt(filterGtMax) : Infinity

    return companies.filter(c => {
      const isUnknown = c.name === 'Unknown Parent Company'
      if (filterLocationVal !== 'all') {
        if (!isUnknown && extractCountry(c.location) !== filterLocationVal) return false
      }
      if (filterAsianScope) {
        if (!isUnknown && !asianSet.has(c.id)) return false
      }
      if (filterClientView === 'clients' && !c.client_type) return false
      if (filterClientView === 'prospects' && c.client_type) return false
      if (filterStatus !== 'all' && c.pipeline_status !== filterStatus) return false
      if (filterUrgency !== 'all') {
        const tier = urgencyTier(c.soonest_expiry)
        if (tier !== filterUrgency) return false
      }
      if (filterGtMin || filterGtMax) {
        const gts = c.vessel_gross_tonnages ?? []
        if (!gts.some(gt => gt >= gtMin && gt <= gtMax)) return false
      }
      if (filterContactRoles.length > 0) {
        if (!c.contact_titles?.some(t => filterContactRoles.includes(t))) return false
      }
      if (filterFlags.length > 0) {
        if (!c.vessel_flags?.some(f => filterFlags.includes(f))) return false
      }
      if (filterOpLocs.length > 0) {
        if (!c.vessel_op_locations?.some(l => filterOpLocs.includes(l))) return false
      }
      if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [
    companies, filterLocationVal, filterAsianScope, asianSet,
    filterClientView, filterStatus, filterUrgency,
    filterGtMin, filterGtMax, filterContactRoles, filterFlags, filterOpLocs, search,
  ])

  // --- sorting ---
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      if (a.name === 'Unknown Parent Company') return -1
      if (b.name === 'Unknown Parent Company') return 1

      let cmp = 0
      if (sortField === 'name') {
        cmp = a.name.localeCompare(b.name)
      } else if (sortField === 'location') {
        cmp = (a.location ?? '').localeCompare(b.location ?? '')
      } else if (sortField === 'urgent') {
        cmp = (a.urgent_vessel_count ?? 0) - (b.urgent_vessel_count ?? 0)
      } else if (sortField === 'expiry') {
        if (!a.soonest_expiry && !b.soonest_expiry) cmp = 0
        else if (!a.soonest_expiry) cmp = 1
        else if (!b.soonest_expiry) cmp = -1
        else cmp = a.soonest_expiry.localeCompare(b.soonest_expiry)
      } else if (sortField === 'vessels') {
        cmp = (a.vessel_count ?? 0) - (b.vessel_count ?? 0)
      } else if (sortField === 'contacts') {
        cmp = (a.contact_count ?? 0) - (b.contact_count ?? 0)
      } else if (sortField === 'status') {
        const aVal = a.client_type ? `0_${a.client_type}` : `1_${a.pipeline_status}`
        const bVal = b.client_type ? `0_${b.client_type}` : `1_${b.pipeline_status}`
        cmp = aVal.localeCompare(bVal)
      } else if (sortField === 'last_contact') {
        if (!a.last_contact_date && !b.last_contact_date) cmp = 0
        else if (!a.last_contact_date) cmp = 1
        else if (!b.last_contact_date) cmp = -1
        else cmp = a.last_contact_date.localeCompare(b.last_contact_date)
      } else if (sortField === 'next_contact') {
        if (!a.next_contact_date && !b.next_contact_date) cmp = 0
        else if (!a.next_contact_date) cmp = 1
        else if (!b.next_contact_date) cmp = -1
        else cmp = a.next_contact_date.localeCompare(b.next_contact_date)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [filtered, sortField, sortDir])

  // --- sync URL params ---
  useEffect(() => {
    const params = new URLSearchParams()
    if (search) params.set('q', search)
    if (filterLocationVal !== 'all') params.set('location', filterLocationVal)
    if (!filterAsianScope) params.set('asian', 'false')
    if (filterClientView !== 'all') params.set('view', filterClientView)
    if (filterStatus !== 'all') params.set('status', filterStatus)
    if (filterUrgency !== 'all') params.set('urgency', filterUrgency)
    if (filterGtMin) params.set('gtMin', filterGtMin)
    if (filterGtMax) params.set('gtMax', filterGtMax)
    if (filterContactRoles.length > 0) params.set('roles', filterContactRoles.map(encodeURIComponent).join(','))
    if (filterFlags.length > 0) params.set('flags', filterFlags.map(encodeURIComponent).join(','))
    if (filterOpLocs.length > 0) params.set('opLocs', filterOpLocs.map(encodeURIComponent).join(','))
    if (sortField !== 'expiry') params.set('sort', sortField)
    if (sortDir !== 'asc') params.set('sortDir', sortDir)
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }, [
    search, filterLocationVal, filterAsianScope, filterClientView,
    filterStatus, filterUrgency, filterGtMin, filterGtMax,
    filterContactRoles, filterFlags, filterOpLocs,
    sortField, sortDir, pathname,
  ])

  // --- mutations ---
  async function updateClientStatus(id: string, value: string) {
    const supabase = createClient()
    if ((CLIENT_TYPES as string[]).includes(value)) {
      await supabase.from('parent_companies').update({ client_type: value }).eq('id', id)
      setCompanies(cs => cs.map(c => c.id === id ? { ...c, client_type: value as ClientType } : c))
    } else {
      await supabase.from('parent_companies').update({ client_type: null, pipeline_status: value }).eq('id', id)
      setCompanies(cs => cs.map(c => c.id === id ? { ...c, client_type: null, pipeline_status: value as PipelineStatus } : c))
    }
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
        name:            addForm.name.trim(),
        location:        addForm.location || null,
        pipeline_status: addForm.pipeline_status,
        needs_review:    false,
        is_prospect:     false,
      })
      .select()
      .single()
    if (data) {
      setCompanies(cs => [...cs, {
        ...data,
        vessel_count: 0, urgent_vessel_count: 0, soonest_expiry: null,
        vessel_gross_tonnages: [], vessel_flags: [], vessel_op_locations: [], contact_titles: [],
      }])
    }
    setAdding(false)
    setShowAddModal(false)
    setAddForm(EMPTY_COMPANY_FORM)
    startTransition(() => router.refresh())
  }

  // --- sortable th helper ---
  function Th({ field, label, className }: { field: SortField; label: string; className?: string }) {
    return (
      <th
        className={`text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900 select-none ${className ?? ''}`}
        onClick={() => handleSort(field)}
      >
        {label}<SortIcon active={sortField === field} dir={sortDir} />
      </th>
    )
  }

  const hasAdvancedFilters = filterGtMin || filterGtMax || filterContactRoles.length > 0 || filterFlags.length > 0 || filterOpLocs.length > 0

  return (
    <>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-semibold text-[#3C3C3B]">Companies</h1>
            <p className="text-sm text-slate-500 mt-0.5">
              {sorted.length} of {companies.length} companies
            </p>
          </div>
          <button
            onClick={() => { setAddForm(EMPTY_COMPANY_FORM); setShowAddModal(true) }}
            className="px-4 py-2 text-sm bg-[#ACE2E1] hover:bg-[#96D5D4] text-[#3C3C3B] font-medium transition-colors"
          >
            + Add company
          </button>
        </div>

        {/* Filters — row 1: search, dropdowns, toggles */}
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search companies…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] w-52"
          />

          {/* Location dropdown */}
          <select
            value={filterLocationVal}
            onChange={e => setFilterLocationVal(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white"
          >
            <option value="all">All locations</option>
            {locations.map(loc => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>

          {/* Pipeline status */}
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white"
          >
            <option value="all">All statuses</option>
            {STATUSES.map(s => (
              <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
            ))}
          </select>

          {/* Urgency filter pills */}
          <div className="flex items-center gap-1 bg-slate-100 p-1">
            {URGENCY_FILTERS.map(f => (
              <button
                key={f.value}
                onClick={() => setFilterUrgency(f.value)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  filterUrgency === f.value
                    ? 'bg-white text-[#3C3C3B] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Asian scope toggle */}
          <button
            onClick={() => setFilterAsianScope(v => !v)}
            className={`px-3 py-1.5 text-sm font-medium transition-colors border ${
              filterAsianScope
                ? 'bg-[#ACE2E1] text-[#3C3C3B] border-[#ACE2E1]'
                : 'bg-white text-slate-600 border-slate-300 hover:border-slate-400'
            }`}
          >
            Asian Scope Only
          </button>

          {/* Client / Prospect segmented filter */}
          <div className="flex items-center gap-1 bg-slate-100 p-1">
            {(['all', 'prospects', 'clients'] as const).map(v => (
              <button
                key={v}
                onClick={() => setFilterClientView(v)}
                className={`px-3 py-1 text-sm font-medium transition-colors ${
                  filterClientView === v
                    ? 'bg-white text-[#3C3C3B] shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {v === 'all' ? 'All' : v === 'prospects' ? 'Prospects' : 'Existing Clients'}
              </button>
            ))}
          </div>
        </div>

        {/* Filters — row 2: advanced filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Gross Tonnage range */}
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-slate-500 whitespace-nowrap">Gross Tonnage:</span>
            <input
              type="number"
              placeholder="Min"
              value={filterGtMin}
              onChange={e => setFilterGtMin(e.target.value)}
              className="px-2 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] w-24"
            />
            <span className="text-slate-400">–</span>
            <input
              type="number"
              placeholder="Max"
              value={filterGtMax}
              onChange={e => setFilterGtMax(e.target.value)}
              className="px-2 py-2 text-sm border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] w-24"
            />
          </div>

          {/* Multi-select dropdowns */}
          <MultiSelectDropdown
            label="contact roles"
            options={allContactRoles}
            selected={filterContactRoles}
            onChange={setFilterContactRoles}
          />
          <MultiSelectDropdown
            label="flags"
            options={allFlags}
            selected={filterFlags}
            onChange={setFilterFlags}
          />
          <MultiSelectDropdown
            label="op. locations"
            options={allOpLocs}
            selected={filterOpLocs}
            onChange={setFilterOpLocs}
          />

          {hasAdvancedFilters && (
            <button
              onClick={() => {
                setFilterGtMin('')
                setFilterGtMax('')
                setFilterContactRoles([])
                setFilterFlags([])
                setFilterOpLocs([])
              }}
              className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
            >
              Clear advanced filters
            </button>
          )}
        </div>

        {/* Table */}
        <div className="bg-white border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <Th field="name"         label="Company" />
                  <Th field="location"     label="Location" />
                  <Th field="urgent"       label="Urgent COFR" className="text-center" />
                  <Th field="expiry"       label="Next COFR Expiry" />
                  <Th field="vessels"      label="Vessels" className="text-center" />
                  <Th field="contacts"     label="Contacts" className="text-center" />
                  <Th field="status"       label="Status" />
                  <Th field="last_contact" label="Last Contact" />
                  <Th field="next_contact" label="Next Contact" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {sorted.length === 0 && (
                  <tr>
                    <td colSpan={9} className="text-center py-12 text-slate-400">
                      No companies match your filters
                    </td>
                  </tr>
                )}
                {sorted.map(c => {
                  const tier = urgencyTier(c.soonest_expiry)
                  const days = daysUntil(c.soonest_expiry)
                  const isUnknown = c.name === 'Unknown Parent Company'
                  const urgentCount = c.urgent_vessel_count ?? 0
                  return (
                    <tr
                      key={c.id}
                      className={`hover:bg-slate-50 transition-colors ${isUnknown ? 'bg-slate-50/70' : ''}`}
                    >
                      {/* Company */}
                      <td className="px-4 py-3">
                        <Link
                          href={`/companies/${c.id}${searchParams.toString() ? `?back=${encodeURIComponent(searchParams.toString())}` : ''}`}
                          className={`font-medium hover:underline ${isUnknown ? 'text-slate-500 italic' : 'text-[#008DDA] hover:text-[#006BB0]'}`}
                        >
                          {c.name}
                        </Link>
                        {c.needs_review && !isUnknown && (
                          <span className="ml-2 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 font-medium">
                            Review
                          </span>
                        )}
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3 text-slate-600">
                        {isUnknown ? (
                          <span className="text-slate-400 italic">—</span>
                        ) : (
                          c.location || '—'
                        )}
                      </td>

                      {/* Urgent COFR */}
                      <td className="px-4 py-3 text-center">
                        {urgentCount > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-red-100 text-red-700 font-medium text-xs">
                            {urgentCount}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Next COFR Expiry */}
                      <td className="px-4 py-3">
                        {c.soonest_expiry ? (
                          <div className="flex items-center gap-2">
                            {tier && (
                              <span className={`text-xs px-2 py-0.5 font-medium ${URGENCY_BADGE[tier]}`}>
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

                      {/* Vessels */}
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-7 h-7 bg-slate-100 text-slate-700 font-medium text-xs">
                          {c.vessel_count ?? 0}
                        </span>
                      </td>

                      {/* Contacts */}
                      <td className="px-4 py-3 text-center">
                        {(c.contact_count ?? 0) > 0 ? (
                          <span className="inline-flex items-center justify-center w-7 h-7 bg-[#ACE2E1] text-[#3C3C3B] font-medium text-xs">
                            {c.contact_count}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>

                      {/* Status (client type or pipeline) */}
                      <td className="px-4 py-3">
                        {isUnknown ? (
                          <span className="text-slate-400">—</span>
                        ) : (
                          <select
                            value={c.client_type ?? c.pipeline_status}
                            onChange={e => updateClientStatus(c.id, e.target.value)}
                            className={`text-xs font-medium px-2 py-1 border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#008DDA] ${
                              c.client_type
                                ? CLIENT_TYPE_COLOURS[c.client_type]
                                : PIPELINE_COLOURS[c.pipeline_status]
                            }`}
                          >
                            <optgroup label="Existing Client">
                              {CLIENT_TYPES.map(ct => (
                                <option key={ct} value={ct}>{CLIENT_TYPE_LABELS[ct]}</option>
                              ))}
                            </optgroup>
                            <optgroup label="Pipeline">
                              {STATUSES.map(s => (
                                <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
                              ))}
                            </optgroup>
                          </select>
                        )}
                      </td>

                      {/* Last Contact */}
                      <td className="px-4 py-3">
                        {!isUnknown && (
                          <input
                            type="date"
                            defaultValue={c.last_contact_date ?? ''}
                            onBlur={e => updateDate(c.id, 'last_contact_date', e.target.value)}
                            className="text-xs text-slate-700 border border-transparent hover:border-slate-300 focus:border-[#008DDA] px-1.5 py-1 focus:outline-none w-32"
                          />
                        )}
                      </td>

                      {/* Next Contact */}
                      <td className="px-4 py-3">
                        {!isUnknown && (
                          <input
                            type="date"
                            defaultValue={c.next_contact_date ?? ''}
                            onBlur={e => updateDate(c.id, 'next_contact_date', e.target.value)}
                            className="text-xs text-slate-700 border border-transparent hover:border-slate-300 focus:border-[#008DDA] px-1.5 py-1 focus:outline-none w-32"
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
          <div className="relative bg-white shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-[#3C3C3B] mb-5">Add Company</h3>

            <div className="space-y-4">
              <ModalField label="Company Name *" value={addForm.name} onChange={formField('name')} />
              <ModalField label="Location" value={addForm.location} onChange={formField('location')} placeholder="e.g. Tokyo, Japan" />
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Pipeline Status</label>
                <select
                  value={addForm.pipeline_status}
                  onChange={formField('pipeline_status')}
                  className="w-full text-sm px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white"
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
                className="px-4 py-2 text-sm bg-[#ACE2E1] hover:bg-[#96D5D4] disabled:opacity-60 text-[#3C3C3B] font-medium transition-colors"
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
        className="w-full text-sm px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA]"
      />
    </div>
  )
}
