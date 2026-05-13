'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  type ParentCompany, type PipelineStatus, type ClientType,
  PIPELINE_LABELS, PIPELINE_COLOURS,
  CLIENT_TYPE_LABELS, CLIENT_TYPE_COLOURS,
} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const STATUSES = Object.keys(PIPELINE_LABELS) as PipelineStatus[]
const CLIENT_TYPES: ClientType[] = ['shoreline', 'hudson', 'both']

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
    <div className="bg-white border border-slate-200 p-5">
      <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4">CRM</h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Status (client type or pipeline) */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Status</label>
          <select
            defaultValue={company.client_type ?? company.pipeline_status}
            onChange={e => {
              const val = e.target.value
              if ((CLIENT_TYPES as string[]).includes(val)) {
                update({ client_type: val })
              } else {
                update({ client_type: null, pipeline_status: val })
              }
            }}
            className={`w-full text-sm font-medium px-3 py-2 border focus:outline-none focus:ring-2 focus:ring-[#008DDA] cursor-pointer ${
              company.client_type
                ? CLIENT_TYPE_COLOURS[company.client_type]
                : PIPELINE_COLOURS[company.pipeline_status]
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
        </div>

        {/* Last Contact */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Last Contact</label>
          <input
            type="date"
            defaultValue={company.last_contact_date ?? ''}
            onBlur={e => update({ last_contact_date: e.target.value || null })}
            className="w-full text-sm px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA]"
          />
        </div>

        {/* Next Contact */}
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1.5">Next Contact</label>
          <input
            type="date"
            defaultValue={company.next_contact_date ?? ''}
            onBlur={e => update({ next_contact_date: e.target.value || null })}
            className="w-full text-sm px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA]"
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
          className="w-full text-sm px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] resize-none"
        />
      </div>
    </div>
  )
}
