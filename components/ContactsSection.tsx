'use client'

import { useState, useTransition, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Contact } from '@/lib/types'
import { createClient } from '@/lib/supabase/client'

type ContactFormData = Omit<Contact, 'id' | 'parent_company_id' | 'created_at' | 'updated_at'>

const EMPTY_FORM: ContactFormData = {
  first_name: null, last_name: null, title: null,
  email: null, email_status: null, seniority: null,
  departments: null, sub_departments: null, linkedin_url: null,
  city: null, state: null, country: null,
}

type SortField = 'name' | 'title' | 'location'
type SortDir   = 'asc' | 'desc'

export default function ContactsSection({
  companyId,
  initialContacts,
}: {
  companyId: string
  initialContacts: Contact[]
}) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [contacts, setContacts] = useState<Contact[]>(initialContacts)
  const [modal, setModal]       = useState<'add' | 'edit' | null>(null)
  const [editing, setEditing]   = useState<Contact | null>(null)
  const [form, setForm]         = useState<ContactFormData>(EMPTY_FORM)
  const [saving, setSaving]     = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)

  const [filterLocation, setFilterLocation] = useState('all')
  const [filterTitle,    setFilterTitle]    = useState('all')
  const [sortField,      setSortField]      = useState<SortField>('name')
  const [sortDir,        setSortDir]        = useState<SortDir>('asc')

  const locationOptions = useMemo(() => {
    const locs = new Set<string>()
    for (const c of contacts) {
      const loc = [c.city, c.country].filter(Boolean).join(', ')
      if (loc) locs.add(loc)
    }
    return [...locs].sort()
  }, [contacts])

  const titleOptions = useMemo(() =>
    [...new Set(contacts.map(c => c.title).filter(Boolean) as string[])].sort(),
  [contacts])

  const visible = useMemo(() => {
    let list = contacts
    if (filterLocation !== 'all') {
      list = list.filter(c => [c.city, c.country].filter(Boolean).join(', ') === filterLocation)
    }
    if (filterTitle !== 'all') {
      list = list.filter(c => c.title === filterTitle)
    }
    return list
  }, [contacts, filterLocation, filterTitle])

  const sorted = useMemo(() => {
    return [...visible].sort((a, b) => {
      let cmp = 0
      if (sortField === 'name') {
        const aName = [a.first_name, a.last_name].filter(Boolean).join(' ')
        const bName = [b.first_name, b.last_name].filter(Boolean).join(' ')
        cmp = aName.localeCompare(bName)
      } else if (sortField === 'title') {
        cmp = (a.title ?? '').localeCompare(b.title ?? '')
      } else if (sortField === 'location') {
        const aLoc = [a.city, a.country].filter(Boolean).join(', ')
        const bLoc = [b.city, b.country].filter(Boolean).join(', ')
        cmp = aLoc.localeCompare(bLoc)
      }
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [visible, sortField, sortDir])

  function toggleSort(field: SortField) {
    if (field === sortField) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function openAdd() {
    setForm(EMPTY_FORM)
    setEditing(null)
    setModal('add')
  }

  function openEdit(c: Contact) {
    setForm({
      first_name: c.first_name, last_name: c.last_name, title: c.title,
      email: c.email, email_status: c.email_status, seniority: c.seniority,
      departments: c.departments, sub_departments: c.sub_departments,
      linkedin_url: c.linkedin_url, city: c.city, state: c.state, country: c.country,
    })
    setEditing(c)
    setModal('edit')
  }

  function closeModal() {
    setModal(null)
    setEditing(null)
  }

  function field(key: keyof ContactFormData) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value || null }))
  }

  async function handleSave() {
    setSaving(true)
    const supabase = createClient()

    if (modal === 'add') {
      const { data } = await supabase
        .from('contacts')
        .insert({ ...form, parent_company_id: companyId })
        .select()
        .single()
      if (data) setContacts(cs => [...cs, data])
    } else if (modal === 'edit' && editing) {
      const { data } = await supabase
        .from('contacts')
        .update(form)
        .eq('id', editing.id)
        .select()
        .single()
      if (data) setContacts(cs => cs.map(c => c.id === editing.id ? data : c))
    }

    setSaving(false)
    closeModal()
    startTransition(() => router.refresh())
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this contact?')) return
    setDeleting(id)
    const supabase = createClient()
    await supabase.from('contacts').delete().eq('id', id)
    setContacts(cs => cs.filter(c => c.id !== id))
    setDeleting(null)
    startTransition(() => router.refresh())
  }

  function SortBtn({ field, label }: { field: SortField; label: string }) {
    const active = sortField === field
    return (
      <th
        className="text-left px-4 py-3 font-medium text-slate-600 cursor-pointer hover:text-slate-900 select-none"
        onClick={() => toggleSort(field)}
      >
        {label} <span className={active ? '' : 'text-slate-300'}>{active ? (sortDir === 'asc' ? '↑' : '↓') : '↕'}</span>
      </th>
    )
  }

  return (
    <>
      <div className="bg-white border border-slate-200 overflow-hidden">
        {contacts.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No contacts yet.
            <button onClick={openAdd} className="ml-2 text-[#008DDA] hover:underline font-medium">
              Add one
            </button>
          </div>
        ) : (
          <>
            {/* Filter/sort bar */}
            <div className="px-4 py-3 border-b border-slate-100 flex flex-wrap gap-2 items-center bg-slate-50">
              {locationOptions.length > 0 && (
                <select
                  value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white"
                >
                  <option value="all">All locations</option>
                  {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              )}
              {titleOptions.length > 0 && (
                <select
                  value={filterTitle}
                  onChange={e => setFilterTitle(e.target.value)}
                  className="px-3 py-1.5 text-xs border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA] bg-white"
                >
                  <option value="all">All titles</option>
                  {titleOptions.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              )}
              {(filterLocation !== 'all' || filterTitle !== 'all') && (
                <button
                  onClick={() => { setFilterLocation('all'); setFilterTitle('all') }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Clear filters
                </button>
              )}
              <span className="ml-auto text-xs text-slate-400">
                {sorted.length} of {contacts.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <SortBtn field="name" label="Name" />
                    <SortBtn field="title" label="Title" />
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-slate-600">LinkedIn</th>
                    <SortBtn field="location" label="Location" />
                    <th className="text-left px-4 py-3 font-medium text-slate-600">Seniority</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sorted.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-slate-400 text-sm">
                        No contacts match your filters
                      </td>
                    </tr>
                  )}
                  {sorted.map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-medium text-[#3C3C3B]">
                        {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-40 truncate" title={c.title ?? ''}>
                        {c.title ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {c.email ? (
                          <a href={`mailto:${c.email}`} className="text-[#008DDA] hover:underline">
                            {c.email}
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                        {c.email_status === 'Verified' && (
                          <span className="ml-1.5 text-xs text-green-600 font-medium">✓</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.linkedin_url ? (
                          <a
                            href={c.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#008DDA] hover:text-[#006BB0] inline-flex items-center gap-1 text-xs"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                            </svg>
                            Profile
                          </a>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {[c.city, c.state, c.country].filter(Boolean).join(', ') || '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {c.seniority ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-xs text-slate-500 hover:text-slate-900 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(c.id)}
                            disabled={deleting === c.id}
                            className="text-xs text-red-400 hover:text-red-600 transition-colors disabled:opacity-40"
                          >
                            {deleting === c.id ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-slate-100">
              <button
                onClick={openAdd}
                className="text-sm text-[#008DDA] hover:text-[#006BB0] font-medium transition-colors"
              >
                + Add contact
              </button>
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={closeModal} />
          <div className="relative bg-white shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-semibold text-[#3C3C3B] mb-5">
              {modal === 'add' ? 'Add Contact' : 'Edit Contact'}
            </h3>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="First Name" value={form.first_name ?? ''} onChange={field('first_name')} />
                <Field label="Last Name"  value={form.last_name  ?? ''} onChange={field('last_name')} />
              </div>
              <Field label="Title" value={form.title ?? ''} onChange={field('title')} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email"        value={form.email        ?? ''} onChange={field('email')}        type="email" />
                <Field label="Email Status" value={form.email_status ?? ''} onChange={field('email_status')} placeholder="Verified / Unavailable" />
              </div>
              <Field label="LinkedIn URL" value={form.linkedin_url ?? ''} onChange={field('linkedin_url')} placeholder="https://linkedin.com/in/…" />
              <div className="grid grid-cols-3 gap-3">
                <Field label="City"    value={form.city    ?? ''} onChange={field('city')} />
                <Field label="State"   value={form.state   ?? ''} onChange={field('state')} />
                <Field label="Country" value={form.country ?? ''} onChange={field('country')} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Seniority"   value={form.seniority    ?? ''} onChange={field('seniority')} />
                <Field label="Departments" value={form.departments   ?? ''} onChange={field('departments')} />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 text-sm bg-[#ACE2E1] hover:bg-[#96D5D4] disabled:opacity-60 text-[#3C3C3B] font-medium transition-colors"
              >
                {saving ? 'Saving…' : modal === 'add' ? 'Add Contact' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  type?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full text-sm px-3 py-2 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-[#008DDA]"
      />
    </div>
  )
}
