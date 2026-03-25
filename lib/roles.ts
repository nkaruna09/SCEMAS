import type { Role } from '@/lib/types/roles'

// Typed as `any` to avoid fighting SupabaseClient's complex generic resolution.
// The typed return value is still enforced via Role.
export async function getUserRole(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
): Promise<Role | null> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .single()

  return (data?.role as Role) ?? null
}
