"use client";

import type React from "react";
import { useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { FilterProvider } from "@/components/filters/filter-provider";
import { DataProvider } from "@/components/data-provider";
import { Icons } from "@/components/icons";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="flex h-screen items-center justify-center">
        <Icons.spinner className="h-10 w-10 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!session) {
    return null; // Will redirect in the useEffect
  }

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
