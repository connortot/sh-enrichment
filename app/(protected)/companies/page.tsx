import { createClient } from '@/lib/supabase/server'
import type { ParentCompany } from '@/lib/types'
import CompaniesTable from '@/components/CompaniesTable'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [
    { data: companies },
    { data: stats },
    { data: scopeRows },
  ] = await Promise.all([
    supabase.from('parent_companies').select('*').order('name'),
    supabase.from('company_vessel_stats').select('*'),
    supabase.from('asian_scope_companies').select('id'),
  ])

  const statsMap = new Map((stats ?? []).map(s => [s.parent_company_id, s]))
  const inScopeIds = new Set((scopeRows ?? []).map((r: { id: string }) => r.id))

  const enriched: ParentCompany[] = (companies ?? []).map(c => {
    const s = statsMap.get(c.id)
    return {
      ...c,
      vessel_count:        Number(s?.vessel_count ?? 0),
      urgent_vessel_count: Number(s?.urgent_vessel_count ?? 0),
      soonest_expiry:      s?.soonest_expiry ?? null,
      is_in_scope:         inScopeIds.has(c.id),
    }
  })

  // Sort by soonest expiry (nulls last), no Unknown sentinel needed
  enriched.sort((a, b) => {
    if (!a.soonest_expiry && !b.soonest_expiry) return 0
    if (!a.soonest_expiry) return 1
    if (!b.soonest_expiry) return -1
    return a.soonest_expiry.localeCompare(b.soonest_expiry)
  })

  return <CompaniesTable initialCompanies={enriched} />
}
