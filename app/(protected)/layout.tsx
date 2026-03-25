import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/roles'
import type { Role } from '@/lib/types/roles'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = await getUserRole(supabase, user.id)
  if (!role) redirect('/login')

  return (
    <div data-role={role as Role}>
      {children}
    </div>
  )
}
