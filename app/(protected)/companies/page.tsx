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
    supabase.from('vessels').select('id, parent_company_id, expiration_date'),
    supabase.from('contacts').select('parent_company_id'),
    supabase.from('asian_scope_companies').select('id'),
  ])

  const enriched: ParentCompany[] = (companies ?? []).map(c => {
    const cvessels = (vessels ?? []).filter(v => v.parent_company_id === c.id)
    const expiries = cvessels
      .map(v => v.expiration_date)
      .filter(Boolean)
      .sort() as string[]
    return {
      ...c,
      vessel_count: cvessels.length,
      urgent_vessel_count: cvessels.filter(v => {
        const d = daysUntil(v.expiration_date)
        return d !== null && d <= 60
      }).length,
      soonest_expiry: expiries[0] ?? null,
      contact_count: (contacts ?? []).filter(ct => ct.parent_company_id === c.id).length,
    }
  })

  const asianScopeIds = (asianScope ?? []).map(r => r.id)

  return (
    <Suspense>
      <CompaniesTable initialCompanies={enriched} asianScopeIds={asianScopeIds} />
    </Suspense>
  )
}
