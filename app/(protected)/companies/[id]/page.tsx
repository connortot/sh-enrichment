import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CrmPanel from '@/components/CrmPanel'
import VesselsTable from '@/components/VesselsTable'
import ContactsSection from '@/components/ContactsSection'
import CompanyActions from '@/components/CompanyActions'

export const dynamic = 'force-dynamic'

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ back?: string }>
}) {
  const { id } = await params
  const { back } = await searchParams
  const backHref = back ? `/companies?${decodeURIComponent(back)}` : '/companies'
  const supabase = await createClient()

  const [{ data: company }, { data: vessels }, { data: contacts }] = await Promise.all([
    supabase.from('parent_companies').select('*').eq('id', id).single(),
    supabase.from('vessels').select('*').eq('parent_company_id', id).order('expiration_date'),
    supabase.from('contacts').select('*').eq('parent_company_id', id).order('created_at'),
  ])

  if (!company) notFound()

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href={backHref} className="hover:text-slate-900 transition-colors">Companies</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{company.name}</span>
      </div>

      {/* Company header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[#3C3C3B]">{company.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {company.location || 'Location unknown'}
            {company.needs_review && (
              <span className="ml-3 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 font-medium">
                Needs Review
              </span>
            )}
          </p>
        </div>
        <CompanyActions company={company} />
      </div>

      {/* CRM Panel */}
      <CrmPanel company={company} />

      {/* Vessels */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Vessels
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({vessels?.length ?? 0})
          </span>
        </h2>
        <VesselsTable vessels={vessels ?? []} />
      </section>

      {/* Contacts */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Contacts
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({contacts?.length ?? 0})
          </span>
        </h2>
        <ContactsSection companyId={id} initialContacts={contacts ?? []} />
      </section>
    </div>
  )
}
