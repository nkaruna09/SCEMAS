import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getUserRole } from '@/lib/roles'
import type { Role } from '@/lib/types/roles'
import Navbar from '@/components/Navbar'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const role = await getUserRole(supabase, user.id)
  if (!role) redirect('/pending')

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar role={role as Role} email={user.email ?? ''} />
      <main className="flex-1 p-8">{children}</main>
    </div>
  )
}
