import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { ParentCompany } from '@/lib/types'
import { daysUntil } from '@/lib/types'
import CompaniesTable from '@/components/CompaniesTable'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: companies }, { data: vessels }, { data: contacts }, { data: asianScope }] = await Promise.all([
    supabase.from('parent_companies').select('*').order('name'),
    supabase.from('vessels').select('id, parent_company_id, expiration_date, gross_tonnage, flag, operator_location'),
    supabase.from('contacts').select('parent_company_id, title'),
    supabase.from('asian_scope_companies').select('id'),
  ])

  const enriched: ParentCompany[] = (companies ?? []).map(c => {
    const cvessels = (vessels ?? []).filter(v => v.parent_company_id === c.id)
    const expiries = cvessels
      .map(v => v.expiration_date)
      .filter(Boolean)
      .sort() as string[]
    const ccontacts = (contacts ?? []).filter(ct => ct.parent_company_id === c.id)
    return {
      ...c,
      vessel_count: cvessels.length,
      urgent_vessel_count: cvessels.filter(v => {
        const d = daysUntil(v.expiration_date)
        return d !== null && d <= 60
      }).length,
      soonest_expiry: expiries[0] ?? null,
      contact_count: ccontacts.length,
      vessel_gross_tonnages: cvessels.map(v => v.gross_tonnage).filter((n): n is number => n != null),
      vessel_flags: [...new Set(cvessels.map(v => v.flag).filter((f): f is string => !!f))],
      vessel_op_locations: [...new Set(cvessels.map(v => v.operator_location).filter((l): l is string => !!l))],
      contact_titles: [...new Set(ccontacts.map(ct => ct.title).filter((t): t is string => !!t))],
    }
  })

  const asianScopeIds = (asianScope ?? []).map(r => r.id)

  return (
    <Suspense>
      <CompaniesTable initialCompanies={enriched} asianScopeIds={asianScopeIds} />
    </Suspense>
  )
}
