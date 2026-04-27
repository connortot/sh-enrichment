import { createClient } from '@/lib/supabase/server'
import type { ParentCompany, Vessel } from '@/lib/types'
import { daysUntil } from '@/lib/types'
import CompaniesTable from '@/components/CompaniesTable'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: companies }, { data: vessels }] = await Promise.all([
    supabase.from('parent_companies').select('*').order('name'),
    supabase.from('vessels').select('id, parent_company_id, expiration_date'),
  ])

  // Enrich companies with vessel count + soonest COFR expiry
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
        return d !== null && d <= 90
      }).length,
      soonest_expiry: expiries[0] ?? null,
    }
  })

  // Sort: Unknown Parent Company pinned first, then by soonest expiry (nulls last)
  enriched.sort((a, b) => {
    const aUnknown = a.name === 'Unknown Parent Company'
    const bUnknown = b.name === 'Unknown Parent Company'
    if (aUnknown && !bUnknown) return -1
    if (!aUnknown && bUnknown) return 1
    if (!a.soonest_expiry && !b.soonest_expiry) return 0
    if (!a.soonest_expiry) return 1
    if (!b.soonest_expiry) return -1
    return a.soonest_expiry.localeCompare(b.soonest_expiry)
  })

  return <CompaniesTable initialCompanies={enriched} />
}
