"use client"

import { FilterBar } from "@/components/filters/filter-bar"
import { KpiCard } from "@/components/kpi-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BarChart, LineChart, PieChart } from "@/components/ui/chart"
import { Icons } from "@/components/icons"
import Link from "next/link"
import { useData } from "@/components/data-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { RefreshButton } from "@/components/refresh-button"
import { ErrorMessage } from "@/components/error-message"
import { format } from "date-fns"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export default function DashboardPage() {
  const { isLoading, error, kpis, timeSeriesData, platformShareData, refreshData, rawData, brandData } = useData()

  // Get current date for welcome message
  const today = new Date()
  const formattedDate = format(today, "EEEE, MMMM d, yyyy")

  // Find top performing brand
  const topBrand = !isLoading && brandData.length > 0
    ? brandData.sort((a, b) => b.availability - a.availability)[0]
    : null

  // Get bottom performing brand for insights
  const bottomBrand = !isLoading && brandData.length > 0
    ? brandData.sort((a, b) => a.availability - b.availability)[0]
    : null

  // Data source info
  const dataSource = "NuVR Dashboard Data"

  // Last updated time
  const lastUpdated = format(new Date(), "h:mm a")

  if (error) {
    return <ErrorMessage message={error.message} retry={refreshData} />
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome to Your Dashboard</h2>
          <p className="text-muted-foreground">{formattedDate}</p>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton />
          <Button variant="outline" asChild>
            <Link href="/dashboard/settings">
              <Icons.settings className="mr-2 h-4 w-4" />
              Settings
            </Link>
          </Button>
        </div>
      </div>

      {/* Data source info */}
      <Alert>
        <Icons.chart className="h-4 w-4" />
        <AlertTitle>Data Source: {dataSource}</AlertTitle>
        <AlertDescription className="flex items-center gap-2">
          <span>Last updated: {lastUpdated}</span>
        </AlertDescription>
      </Alert>

      {/* Show message if no data */}
      {!isLoading && rawData.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Contact your administrator to load data.</CardDescription>
          </CardHeader>
        </Card>
      )}

      <Separator />

      <FilterBar />

      {/* KPI Cards */}
      <div className="card-grid">
        {isLoading ? (
          <>
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </>
        ) : (
          <>
            <KpiCard title="SKUs Tracked" value={kpis.skusTracked} icon={Icons.layers} />
            <KpiCard
              title="Average Discount"
              value={`${kpis.avgDiscount.toFixed(1)}%`}
              trend={{ value: kpis.avgDiscountDelta, isPositive: kpis.avgDiscountDelta > 0 }}
              icon={Icons.tag}
            />
            <KpiCard title="Top Platform" value={kpis.topPlatform} icon={Icons.chart} />
            <KpiCard
              title="Stock-out Δ"
              value={`${kpis.stockOutDelta}%`}
              description="vs. previous week"
              trend={{ value: kpis.stockOutDelta, isPositive: kpis.stockOutDelta < 0 }}
              icon={Icons.pieChart}
            />
          </>
        )}
      </div>

      {/* Main charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover md:col-span-1">
          <CardHeader>
            <CardTitle>Sales Trend</CardTitle>
            <CardDescription>Daily sales performance over time</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              timeSeriesData && timeSeriesData.length > 0 ? (
                <LineChart
                  data={timeSeriesData}
                  categories={["value"]}
                  index="date"
                  colors={["#ff6d00"]}
                  valueFormatter={(value: number) => `₹${value.toLocaleString()}`}
                  showLegend={false}
                  showGridLines={true}
                  className="h-full w-full"
                  xAxisLabel="Date"
                  yAxisLabel="Sales Amount (₹)"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">No sales trend data available</p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card className="card-hover md:col-span-1">
          <CardHeader>
            <CardTitle>Platform Distribution</CardTitle>
            <CardDescription>Market share by platform</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              platformShareData.length > 0 ? (
                <PieChart
                  data={platformShareData}
                  category="value"
                  index="name"
                  colors={["#ff6d00", "#ff9e40", "#ffbd80", "#ffdcbf"]}
                  valueFormatter={(value: number) => `${value}%`}
                  showLegend={true}
                  className="h-full w-full"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">No platform distribution data available</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>

      {/* Key Insights Section */}
      {!isLoading && topBrand && (
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Key Insights</CardTitle>
            <CardDescription>Critical insights from your data</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="space-y-2 rounded-md border p-5">
                <div className="flex items-center gap-2">
                  <div className="rounded-full bg-green-500/10 p-2">
                    <Icons.chart className="h-5 w-5 text-green-500" />
                  </div>
                  <h3 className="font-medium">Top Performing Brand</h3>
                </div>
                <p className="text-2xl font-bold">{topBrand.name}</p>
                <p className="text-sm text-muted-foreground">
                  {topBrand.availability.toFixed(1)}% availability across platforms
                </p>
              </div>

              {bottomBrand && (
                <div className="space-y-2 rounded-md border p-5">
                  <div className="flex items-center gap-2">
                    <div className="rounded-full bg-red-500/10 p-2">
                      <Icons.pieChart className="h-5 w-5 text-red-500" />
                    </div>
                    <h3 className="font-medium">Needs Attention</h3>
                  </div>
                  <p className="text-2xl font-bold">{bottomBrand.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Only {bottomBrand.availability.toFixed(1)}% availability
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/regional" className="block">
          <Card className="card-hover h-full transition-all hover:border-nuvr-orange/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.map className="mr-2 h-5 w-5 text-nuvr-orange" />
                Regional Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                View stock availability by pincode regions and identify geographical trends.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/platform" className="block">
          <Card className="card-hover h-full transition-all hover:border-nuvr-orange/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.chart className="mr-2 h-5 w-5 text-nuvr-orange" />
                Platform Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Compare performance across Swiggy, Flipkart, Zepto, and Blinkit.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/brand" className="block">
          <Card className="card-hover h-full transition-all hover:border-nuvr-orange/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.tag className="mr-2 h-5 w-5 text-nuvr-orange" />
                Brand Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analyze brand performance metrics and identify category leaders.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
