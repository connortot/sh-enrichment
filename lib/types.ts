export type PipelineStatus =
  | 'prospect'
  | 'contacted'
  | 'qualified'
  | 'proposal_sent'
  | 'won'
  | 'lost'
  | 'not_interested'

export type ClientType = 'shoreline' | 'hudson' | 'both'

export interface ParentCompany {
  id: string
  name: string
  location: string | null
  needs_review: boolean
  is_prospect: boolean
  pipeline_status: PipelineStatus
  client_type: ClientType | null
  last_contact_date: string | null
  next_contact_date: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // computed joins
  vessel_count?: number
  urgent_vessel_count?: number
  soonest_expiry?: string | null
  contact_count?: number
  vessel_gross_tonnages?: number[]
  vessel_flags?: string[]
  vessel_op_locations?: string[]
  contact_titles?: string[]
}

export interface Vessel {
  id: string
  name: string
  vin: string
  vessel_type_code: string | null
  vessel_type_desc: string | null
  gross_tonnage: number | null
  case_control_id: string | null
  case_examiner_id: string | null
  operator_name: string | null
  operator_location: string | null
  effective_date: string | null
  expiration_date: string | null
  insurance_cancel_flag: boolean
  flag: string | null
  needs_review: boolean
  parent_company_id: string | null
}

export interface Contact {
  id: string
  parent_company_id: string
  first_name: string | null
  last_name: string | null
  title: string | null
  email: string | null
  email_status: string | null
  seniority: string | null
  departments: string | null
  sub_departments: string | null
  linkedin_url: string | null
  city: string | null
  state: string | null
  country: string | null
  created_at: string
  updated_at: string
}

export const PIPELINE_LABELS: Record<PipelineStatus, string> = {
  prospect:        'Prospect',
  contacted:       'Contacted',
  qualified:       'Qualified',
  proposal_sent:   'Proposal Sent',
  won:             'Won',
  lost:            'Lost',
  not_interested:  'Not Interested',
}

export const PIPELINE_COLOURS: Record<PipelineStatus, string> = {
  prospect:        'bg-slate-100 text-slate-700',
  contacted:       'bg-blue-100 text-blue-700',
  qualified:       'bg-violet-100 text-violet-700',
  proposal_sent:   'bg-amber-100 text-amber-700',
  won:             'bg-green-100 text-green-700',
  lost:            'bg-red-100 text-red-700',
  not_interested:  'bg-gray-100 text-gray-500',
}

export const CLIENT_TYPE_LABELS: Record<ClientType, string> = {
  shoreline: 'Shoreline',
  hudson:    'Hudson',
  both:      'Shoreline + Hudson',
}

export const CLIENT_TYPE_COLOURS: Record<ClientType, string> = {
  shoreline: 'bg-orange-100 text-orange-700',
  hudson:    'bg-purple-100 text-purple-700',
  both:      'bg-teal-100 text-teal-700',
}

/** Days until a date string (ISO). Negative = already past. */
export function daysUntil(dateStr: string | null | undefined): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

export type UrgencyTier = 'expired' | 'urgent' | 'upcoming' | 'clear'

/** Urgency tier for a COFR expiration date. */
export function urgencyTier(dateStr: string | null | undefined): UrgencyTier | null {
  const days = daysUntil(dateStr)
  if (days === null) return null
  if (days <= 0)   return 'expired'
  if (days <= 60)  return 'urgent'
  if (days <= 180) return 'upcoming'
  return 'clear'
}

export const URGENCY_BADGE: Record<UrgencyTier, string> = {
  expired:  'bg-red-200 text-red-800 border border-red-300',
  urgent:   'bg-red-100 text-red-700 border border-red-200',
  upcoming: 'bg-amber-100 text-amber-700 border border-amber-200',
  clear:    'bg-green-100 text-green-700 border border-green-200',
}

export const URGENCY_LABEL: Record<UrgencyTier, string> = {
  expired:  'Expired',
  urgent:   'Urgent',
  upcoming: 'Upcoming',
  clear:    'Clear',
}
