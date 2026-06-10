import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/AdminSidebar'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  return (
    <div className="flex min-h-screen">
      <AdminSidebar email={user.email!} />
      <main className="flex-1 p-4 md:p-8 overflow-auto pt-16 md:pt-8">{children}</main>
    </div>
  )
}
