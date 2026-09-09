import type { ReactNode } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'
import { MobileNav } from './MobileNav'

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <Topbar />
      <main className="min-h-screen pb-20 pt-14 md:ml-60 md:pb-8">{children}</main>
      <MobileNav />
    </div>
  )
}