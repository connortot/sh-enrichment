import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { ParentCompany } from '@/lib/types'
import CompaniesTable from '@/components/CompaniesTable'

export const dynamic = 'force-dynamic'

async function fetchAll(supabase: SupabaseClient, table: string, select: string, orderCol?: string) {
  const PAGE = 1000
  let from = 0
  const rows: any[] = []
  while (true) {
    let q = supabase.from(table).select(select).range(from, from + PAGE - 1)
    if (orderCol) q = q.order(orderCol, { ascending: true })
    const { data } = await q
    if (!data?.length) break
    rows.push(...data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return rows
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const [companies, vesselStats, vesselMeta, contactCounts, asianScope] = await Promise.all([
    fetchAll(supabase, 'parent_companies',      '*',  'name'),
    fetchAll(supabase, 'company_vessel_stats',  '*',  'parent_company_id'),
    fetchAll(supabase, 'company_vessel_meta',   '*',  'parent_company_id'),
    fetchAll(supabase, 'company_contact_counts','*',  'parent_company_id'),
    fetchAll(supabase, 'asian_scope_companies', 'id', 'id'),
  ])

  const statsMap   = new Map(vesselStats.map((s:   any) => [s.parent_company_id, s]))
  const metaMap    = new Map(vesselMeta.map((m:    any) => [m.parent_company_id, m]))
  const contactMap = new Map(contactCounts.map((cc: any) => [cc.parent_company_id, cc]))

  const enriched: ParentCompany[] = companies.map((c: any) => {
    const stats    = statsMap.get(c.id)   as any
    const meta     = metaMap.get(c.id)    as any
    const contacts = contactMap.get(c.id) as any
    return {
      ...c,
      vessel_count:          Number(stats?.vessel_count        ?? 0),
      urgent_vessel_count:   Number(stats?.urgent_vessel_count ?? 0),
      soonest_expiry:        stats?.soonest_expiry             ?? null,
      contact_count:         Number(contacts?.contact_count    ?? 0),
      vessel_gross_tonnages: (meta?.vessel_gross_tonnages      ?? []) as number[],
      vessel_flags:          (meta?.vessel_flags               ?? []) as string[],
      vessel_op_locations:   (meta?.vessel_op_locations        ?? []) as string[],
      contact_titles:        (contacts?.contact_titles         ?? []) as string[],
      contact_countries:     (contacts?.contact_countries      ?? []) as string[],
    }
  })

  const asianScopeIds = (asianScope ?? []).map(r => r.id)

  return (
    <Suspense>
      <CompaniesTable initialCompanies={enriched} asianScopeIds={asianScopeIds} />
    </Suspense>
  )
}
