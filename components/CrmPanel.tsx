'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  type ParentCompany, type PipelineStatus,
  PIPELINE_LABELS, PIPELINE_COLOURS,
} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const STATUSES = Object.keys(PIPELINE_LABELS) as PipelineStatus[]

export default function CrmPanel({ company }: { company: ParentCompany }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const [status, setStatus] = useState<PipelineStatus>(company.pipeline_status)
  const [lastContact, setLastContact] = useState(company.last_contact_date ?? '')
  const [nextContact, setNextContact] = useState(company.next_contact_date ?? '')
  const [notes, setNotes] = useState(company.notes ?? '')

  async function save() {
    setSaving(true)
    const supabase = createClient()
    await supabase.from('parent_companies').update({
      pipeline_status:   status,
      last_contact_date: lastContact || null,
      next_contact_date: nextContact || null,
      notes:             notes || null,
    }).eq('id', company.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
    startTransition(() => router.refresh())
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">CRM</h2>
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
        >
          {saving ? 'Saving…' : saved ? 'Saved ✓' : 'Save'}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pipeline Status */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Pipeline Status</label>
          <select
            value={status}
            onChange={e => setStatus(e.target.value as PipelineStatus)}
            className={`w-full text-sm font-medium px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer ${PIPELINE_COLOURS[status]}`}
          >
            {STATUSES.map(s => (
              <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Last Contact */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Last Contact</label>
          <input
            type="date"
            value={lastContact}
            onChange={e => setLastContact(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Next Contact */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Next Contact</label>
          <input
            type="date"
            value={nextContact}
            onChange={e => setNextContact(e.target.value)}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Confidence */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Data Confidence</label>
          <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 rounded-lg border border-slate-200 h-[38px]">
            <div className="flex-1 bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full"
                style={{ width: `${company.confidence ?? 0}%` }}
              />
            </div>
            <span className="text-xs text-slate-600 font-medium w-8 text-right">
              {company.confidence ?? 0}%
            </span>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={3}
          placeholder="Add notes about this company…"
          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>
    </div>
  )
}
