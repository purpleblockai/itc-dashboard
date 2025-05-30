"use client"

import { useState } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { useData } from "@/components/data-provider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { useTheme } from "next-themes"
import { ExportCSV } from "@/components/export-csv"

export default function SettingsPage() {
  const { isLoading, rawData } = useData()
  const { theme, setTheme } = useTheme()
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [analyticsCookies, setAnalyticsCookies] = useState(true)
  const [marketingCookies, setMarketingCookies] = useState(false)

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground">Manage your dashboard preferences and data settings.</p>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Data Management</CardTitle>
            <CardDescription>Export your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">           
            <div>
              <h3 className="text-lg font-medium">Export Data</h3>
              <p className="text-sm text-muted-foreground">
                Download your current data as a CSV file.
              </p>
              <div className="flex gap-4 mt-4">                
                {rawData.length > 0 && (
                  <ExportCSV data={rawData} filename="dashboard-data" />
                )}
                
                {!rawData.length && (
                  <Button variant="outline" disabled>
                    <Icons.download className="mr-2 h-4 w-4" />
                    No Data Available
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Theme Settings</CardTitle>
            <CardDescription>Customize your dashboard experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme-toggle">Dark Mode</Label>
                <p className="text-sm text-muted-foreground">
                  Switch between dark and light mode
                </p>
              </div>
              <Switch
                id="theme-toggle"
                checked={theme === "dark"}
                onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="auto-refresh">Auto Refresh</Label>
                <p className="text-sm text-muted-foreground">
                  Automatically refresh data every 5 minutes
                </p>
              </div>
              <Switch
                id="auto-refresh"
                checked={autoRefresh}
                onCheckedChange={setAutoRefresh}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Privacy Settings</CardTitle>
            <CardDescription>Manage cookie preferences</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="analytics-cookies">Analytics Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Allow us to analyze dashboard usage
                </p>
              </div>
              <Switch
                id="analytics-cookies"
                checked={analyticsCookies}
                onCheckedChange={setAnalyticsCookies}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="marketing-cookies">Marketing Cookies</Label>
                <p className="text-sm text-muted-foreground">
                  Allow us to personalize marketing content
                </p>
              </div>
              <Switch
                id="marketing-cookies"
                checked={marketingCookies}
                onCheckedChange={setMarketingCookies}
              />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>About</CardTitle>
            <CardDescription>Dashboard information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h3 className="text-lg font-medium">Pinsight Dashboard</h3>
              <p className="text-sm text-muted-foreground">
                Powered by {" "}
                <Link href="https://www.purpleblock.ai" target="_blank" rel="noopener noreferrer" className="underline">
                  Purple Block
                </Link>
              </p>
              <div className="flex gap-2 mt-4">
                <Button variant="outline" asChild>
                  <Link href="/dashboard">
                    <Icons.home className="mr-2 h-4 w-4" />
                    Dashboard
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
} 
