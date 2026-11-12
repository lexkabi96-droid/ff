// Shared types for the multi-tenant service platform.

export type ServiceCategoryKey =
  | 'laundry'
  | 'cleaning'
  | 'repair'
  | 'grooming'
  | 'other'

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategoryKey, string> = {
  laundry: 'Laundry & Dry Cleaning',
  cleaning: 'Home & Office Cleaning',
  repair: 'Repairs & Maintenance',
  grooming: 'Salon, Spa & Grooming',
  other: 'Other Services',
}

export const SERVICE_CATEGORY_KEYS = Object.keys(SERVICE_CATEGORY_LABELS) as ServiceCategoryKey[]

// A tenant on the platform: any service business can sign up.
export interface Business {
  id: string
  slug: string
  name: string
  category: ServiceCategoryKey
  description: string
  phone: string
  address: string
  createdAt: string
  active: boolean
}

// A bookable service offered by a business.
export interface ServiceCategory {
  id: string
  businessId: string
  name: string
  description: string
  basePrice: string
  unit: string
  active: boolean
}
