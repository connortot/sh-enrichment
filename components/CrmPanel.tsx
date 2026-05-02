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
  const [notes, setNotes] = useState(company.notes ?? '')

  async function update(fields: Record<string, unknown>) {
    const supabase = createClient()
    await supabase.from('parent_companies').update(fields).eq('id', company.id)
    startTransition(() => router.refresh())
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">CRM</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Pipeline Status */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Pipeline Status</label>
          <select
            defaultValue={company.pipeline_status}
            onChange={e => update({ pipeline_status: e.target.value })}
            className={`w-full text-sm font-medium px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 cursor-pointer ${PIPELINE_COLOURS[company.pipeline_status]}`}
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
            defaultValue={company.last_contact_date ?? ''}
            onBlur={e => update({ last_contact_date: e.target.value || null })}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>

        {/* Next Contact */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Next Contact</label>
          <input
            type="date"
            defaultValue={company.next_contact_date ?? ''}
            onBlur={e => update({ next_contact_date: e.target.value || null })}
            className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="mt-4">
        <label className="block text-xs font-medium text-slate-500 mb-1.5">Notes</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          onBlur={e => update({ notes: e.target.value || null })}
          rows={3}
          placeholder="Add notes about this company…"
          className="w-full text-sm px-3 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
        />
      </div>
    </div>
  )
}
