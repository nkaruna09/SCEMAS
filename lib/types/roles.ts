export const ROLES = [
  'city_operator',
  'system_admin',
  'government_official',
  'emergency_services',
] as const

export type Role = typeof ROLES[number]

/** Maps role → the URL segment for their dashboard */
export const ROLE_ROUTES: Record<Role, string> = {
  city_operator: '/city-operator',
  system_admin: '/system-admin',
  government_official: '/government',
  emergency_services: '/emergency',
}
