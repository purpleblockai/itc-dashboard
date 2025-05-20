"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { ThemeSwitch } from "./theme-switch";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { signOut } from "next-auth/react";

// Define type for the user with additional properties
interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  clientName?: string;
}

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { data: session } = useSession();
  const {
    setOpen,
    toggleSidebar: toggleContextSidebar,
    open,
    state,
  } = useSidebar();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const toggleSidebar = () => {
    setOpen(!open);
  };

  // Cast the user to our extended type
  const user = session?.user as ExtendedUser | undefined;
  const isAdmin = user?.role === "admin";

  return (
    <div className="relative">
      <Sidebar
        collapsible="icon"
        className={
          state === "collapsed"
            ? "w-[5rem] text-foreground"
            : "w-[240px] text-foreground"
        }
      >
        <SidebarHeader className="flex items-center justify-center py-6">
          <div
            className={`flex items-center ${
              state === "collapsed" ? "justify-center" : "space-x-2"
            }`}
          >
            <Icons.logo className="h-8 w-8 text-pinsight-orange" />
            {!(state === "collapsed") && (
              <span className="text-xl font-bold text-foreground">Pinsight</span>
            )}
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="mt-4">
          <SidebarMenu
            className={state === "collapsed" ? "items-center gap-2" : "gap-2"}
          >
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={isActive("/dashboard")}>
                <Link
                  href="/dashboard"
                  className={`flex ${
                    state === "collapsed" ? "justify-center" : "justify-start"
                  } text-foreground hover:text-foreground`}
                >
                  <Icons.home className="h-5 w-5" />
                  {!(state === "collapsed") && (
                    <span className="ml-2">Overview</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/dashboard/regional")}
              >
                <Link
                  href="/dashboard/regional"
                  className={`flex ${
                    state === "collapsed" ? "justify-center" : "justify-start"
                  } text-foreground hover:text-foreground`}
                >
                  <Icons.map className="h-5 w-5" />
                  {!(state === "collapsed") && (
                    <span className="ml-2">Regional Analysis</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/dashboard/platform")}
              >
                <Link
                  href="/dashboard/platform"
                  className={`flex ${
                    state === "collapsed" ? "justify-center" : "justify-start"
                  } text-foreground hover:text-foreground`}
                >
                  <Icons.chart className="h-5 w-5" />
                  {!(state === "collapsed") && (
                    <span className="ml-2">Platform Insights</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/dashboard/brand")}
              >
                <Link
                  href="/dashboard/brand"
                  className={`flex ${
                    state === "collapsed" ? "justify-center" : "justify-start"
                  } text-foreground hover:text-foreground`}
                >
                  <Icons.tag className="h-5 w-5" />
                  {!(state === "collapsed") && (
                    <span className="ml-2">Brand Evaluation</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/dashboard/register")}
                >
                  <Link
                    href="/dashboard/register"
                    className={`flex ${
                      state === "collapsed" ? "justify-center" : "justify-start"
                    } text-foreground hover:text-foreground`}
                  >
                    <Icons.userPlus className="h-5 w-5" />
                    {!(state === "collapsed") && (
                      <span className="ml-2">Register Users</span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            
            {isAdmin && (
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  isActive={isActive("/dashboard/set-client")}
                >
                  <Link
                    href="/dashboard/set-client"
                    className={`flex ${
                      state === "collapsed" ? "justify-center" : "justify-start"
                    } text-foreground hover:text-foreground`}
                  >
                    <Icons.user className="h-5 w-5" />
                    {!(state === "collapsed") && (
                      <span className="ml-2">Assign Client</span>
                    )}
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
            
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={isActive("/dashboard/settings")}
              >
                <Link
                  href="/dashboard/settings"
                  className={`flex ${
                    state === "collapsed" ? "justify-center" : "justify-start"
                  } text-foreground hover:text-foreground`}
                >
                  <Icons.settings className="h-5 w-5" />
                  {!(state === "collapsed") && (
                    <span className="ml-2">Settings</span>
                  )}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <SidebarMenuButton>
                    <Icons.logout className="h-5 w-5" />
                    {!(state === "collapsed") && <span className="ml-2">Log out</span>}
                  </SidebarMenuButton>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Sign out</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to sign out?
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>No</AlertDialogCancel>
                    <AlertDialogAction onClick={() => signOut()}>
                      Yes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarContent>
        <SidebarSeparator />
        <SidebarFooter className="p-4 space-y-4">
          {!(state === "collapsed") && (
            <div className="flex items-center justify-between px-2">
              <span className="text-sm text-foreground/70">Theme</span>
              <ThemeSwitch />
            </div>
          )}
        </SidebarFooter>
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-[68px] h-6 w-6 rounded-full border bg-background shadow-md z-10 text-foreground"
          onClick={toggleSidebar}
        >
          {state === "collapsed" ? (
            <ChevronRight size={14} />
          ) : (
            <ChevronLeft size={14} />
          )}
        </Button>
      </Sidebar>
    </div>
  );
}
