'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  type ParentCompany, type PipelineStatus,
  PIPELINE_LABELS, PIPELINE_COLOURS,
} from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

const STATUSES = Object.keys(PIPELINE_LABELS) as PipelineStatus[]

type EditForm = {
  name: string
  location: string
  pipeline_status: PipelineStatus
  notes: string
}

export default function CompanyActions({ company }: { company: ParentCompany }) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [showEdit, setShowEdit]   = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [saving, setSaving]       = useState(false)
  const [deleting, setDeleting]   = useState(false)
  const [editForm, setEditForm]   = useState<EditForm>({
    name:            company.name,
    location:        company.location ?? '',
    pipeline_status: company.pipeline_status,
    notes:           company.notes ?? '',
  })

  function field(key: keyof EditForm) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setEditForm(f => ({ ...f, [key]: e.target.value }))
  }

  async function handleSave() {
    if (!editForm.name.trim()) return
    setSaving(true)
    const supabase = createClient()
    await supabase.from('parent_companies').update({
      name:            editForm.name.trim(),
      location:        editForm.location || null,
      pipeline_status: editForm.pipeline_status,
      notes:           editForm.notes || null,
    }).eq('id', company.id)
    setSaving(false)
    setShowEdit(false)
    startTransition(() => router.refresh())
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('parent_companies').delete().eq('id', company.id)
    router.push('/companies')
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setShowEdit(true)}
          className="px-3 py-1.5 text-sm border border-slate-300 rounded-lg hover:border-slate-400 text-slate-600 hover:text-slate-900 transition-colors"
        >
          Edit
        </button>
        <button
          onClick={() => setShowDelete(true)}
          className="px-3 py-1.5 text-sm border border-red-200 rounded-lg hover:border-red-400 text-red-500 hover:text-red-700 transition-colors"
        >
          Delete
        </button>
      </div>

      {/* Edit Modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowEdit(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-5">Edit Company</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Company Name *</label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={field('name')}
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Location</label>
                <input
                  type="text"
                  value={editForm.location}
                  onChange={field('location')}
                  placeholder="e.g. Tokyo, Japan"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Pipeline Status</label>
                <select
                  value={editForm.pipeline_status}
                  onChange={field('pipeline_status')}
                  className={`w-full text-sm font-medium px-3 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-400 ${PIPELINE_COLOURS[editForm.pipeline_status]}`}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{PIPELINE_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
                <textarea
                  value={editForm.notes}
                  onChange={field('notes')}
                  rows={3}
                  placeholder="Add notes…"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEdit(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !editForm.name.trim()}
                className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowDelete(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-2">Delete Company</h3>
            <p className="text-sm text-slate-600 mb-1">
              Are you sure you want to delete <span className="font-medium">{company.name}</span>?
            </p>
            <p className="text-sm text-red-600 font-medium mb-6">
              This will also delete all vessels and contacts. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDelete(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white rounded-lg font-medium transition-colors"
              >
                {deleting ? 'Deleting…' : 'Delete Company'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
