import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import CrmPanel from '@/components/CrmPanel'
import VesselsTable from '@/components/VesselsTable'
import ContactsSection from '@/components/ContactsSection'
import OperatorsSection from '@/components/OperatorsSection'

export const dynamic = 'force-dynamic'

export default async function CompanyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: company }, { data: operators }, { data: contacts }] = await Promise.all([
    supabase.from('parent_companies').select('*').eq('id', id).single(),
    supabase.from('operators').select('*').eq('parent_company_id', id).order('name'),
    supabase.from('contacts').select('*').eq('parent_company_id', id).order('created_at'),
  ])

  if (!company) notFound()

  // Fetch vessels for all operators belonging to this company
  const operatorIds = (operators ?? []).map(o => o.id)
  const { data: vessels } = operatorIds.length > 0
    ? await supabase
        .from('vessels')
        .select('*, operator:operators(name)')
        .in('operator_id', operatorIds)
        .order('expiration_date')
    : { data: [] }

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Link href="/companies" className="hover:text-slate-900 transition-colors">Companies</Link>
        <span>/</span>
        <span className="text-slate-900 font-medium">{company.name}</span>
      </div>

      {/* Company header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{company.name}</h1>
          <p className="text-slate-500 text-sm mt-1">
            {company.location || 'Location unknown'}
            {company.needs_review && (
              <span className="ml-3 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium">
                Needs Review
              </span>
            )}
          </p>
        </div>
      </div>

      {/* CRM Panel */}
      <CrmPanel company={company} />

      {/* Operators */}
      <section>
        <h2 className="text-base font-semibold text-slate-900 mb-3">
          Operators
          <span className="ml-2 text-sm font-normal text-slate-400">
            ({operators?.length ?? 0})
          </span>
        </h2>
        <OperatorsSection operators={operators ?? []} vessels={vessels ?? []} />
      </section>

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
