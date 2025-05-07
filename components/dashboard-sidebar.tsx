"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Icons } from "@/components/icons"
import { Button } from "@/components/ui/button"
import { ThemeSwitch } from "./theme-switch"
import { ChevronLeft, ChevronRight } from "lucide-react"

export function DashboardSidebar() {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  const isActive = (path: string) => {
    return pathname === path
  }

  const toggleSidebar = () => {
    setCollapsed(!collapsed)
  }

  return (
    <div className="relative">
      <Sidebar className={collapsed ? "w-[4rem] transition-all duration-300" : "transition-all duration-300"}>
        <SidebarHeader className="flex items-center justify-center py-6">
          <div className={`flex items-center ${collapsed ? "justify-center" : "space-x-2"}`}>
            <Icons.logo className="h-8 w-8 text-nuvr-orange" />
            {!collapsed && <span className="text-xl font-bold">Nuvr</span>}
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
                <Link href="/dashboard" className={`flex ${collapsed ? "justify-center" : "justify-start"}`}>
                  <Icons.home className="h-5 w-5" />
                  {!collapsed && <span>Overview</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard/regional")}>
                <Link href="/dashboard/regional" className={`flex ${collapsed ? "justify-center" : "justify-start"}`}>
                  <Icons.map className="h-5 w-5" />
                  {!collapsed && <span>Regional Analysis</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard/platform")}>
                <Link href="/dashboard/platform" className={`flex ${collapsed ? "justify-center" : "justify-start"}`}>
                  <Icons.chart className="h-5 w-5" />
                  {!collapsed && <span>Platform Insights</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard/brand")}>
                <Link href="/dashboard/brand" className={`flex ${collapsed ? "justify-center" : "justify-start"}`}>
                  <Icons.tag className="h-5 w-5" />
                  {!collapsed && <span>Brand Evaluation</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard/settings")}>
                <Link href="/dashboard/settings" className={`flex ${collapsed ? "justify-center" : "justify-start"}`}>
                  <Icons.settings className="h-5 w-5" />
                  {!collapsed && <span>Settings</span>}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="p-4 space-y-4">
          {!collapsed && (
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-sidebar-foreground/70">Theme</span>
              <ThemeSwitch />
            </div>
          )}
          <Button variant="outline" className={`${collapsed ? "justify-center" : "justify-start"} w-full`} asChild>
            <Link href="/login">
              <Icons.logout className={collapsed ? "" : "mr-2"} size={16} />
              {!collapsed && <span>Log out</span>}
            </Link>
          </Button>
        </SidebarFooter>
      </Sidebar>
      {/* Toggle button */}
      <Button 
        variant="outline" 
        size="icon" 
        className="absolute -right-3 top-20 h-6 w-6 rounded-full border bg-background shadow-md"
        onClick={toggleSidebar}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </Button>
    </div>
  )
}
