import type React from "react";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FilterProvider } from "@/components/filters/filter-provider";
import { DataProvider } from "@/components/data-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider defaultOpen={true}>
      <FilterProvider>
        <DataProvider>
          <div className="flex min-h-screen w-full overflow-hidden">
            <DashboardSidebar />
            <main className="flex-1 p-6 overflow-auto">{children}</main>
          </div>
        </DataProvider>
      </FilterProvider>
    </SidebarProvider>
  );
}
