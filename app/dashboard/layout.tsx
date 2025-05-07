import type React from "react"
import { DashboardSidebar } from "@/components/dashboard-sidebar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { FilterProvider } from "@/components/filters/filter-provider"
import { DataProvider } from "@/components/data-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <FilterProvider>
        <DataProvider>
          <div className="flex min-h-screen w-full">
            <DashboardSidebar />
            <main className="w-full flex-1 overflow-auto p-6 max-w-full">{children}</main>
          </div>
        </DataProvider>
      </FilterProvider>
    </SidebarProvider>
  )
}
