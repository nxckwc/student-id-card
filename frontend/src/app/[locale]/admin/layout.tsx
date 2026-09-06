"use client"

import { useState } from 'react'
import axios from 'axios'
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query'
import { AdminSidebar, AdminMobileNav } from './components/Sidebar'

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100').replace(/\/+$/, '')

interface SessionResponse {
  user: { id: number; username: string; role: string }
}

const getSession = async (): Promise<SessionResponse> => {
  const { data } = await axios.get<SessionResponse>(`${API_BASE_URL}/auth/session`, { withCredentials: true })
  return data
}

const AdminLayoutContent = ({ children }: { children: React.ReactNode }) => {
  const { data: session } = useQuery({ queryKey: ['admin', 'session'], queryFn: getSession })

  return (
    <div className="relative min-h-screen bg-background pt-16 text-text-primary">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle,rgba(112,139,122,0.16)_1px,transparent_1px)] bg-size-[24px_24px]" />
      <div className="relative flex">
        <AdminSidebar username={session?.user?.username} />
        <main className="min-w-0 flex-1 px-4 pb-14 pt-6 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-5xl">
            <AdminMobileNav />
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

const AdminLayout = ({ children }: { children: React.ReactNode }) => {
  const [queryClient] = useState(() => new QueryClient({ defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false } } }))

  return (
    <QueryClientProvider client={queryClient}>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </QueryClientProvider>
  )
}

export default AdminLayout
