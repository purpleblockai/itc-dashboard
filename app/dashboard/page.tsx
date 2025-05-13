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
import { useSession } from "next-auth/react"
import { useFilters } from "@/components/filters/filter-provider"
import { getCoverageByBrandData } from "@/lib/data-service"
import { badgeVariants } from "@/components/ui/badge"

// Define type for the user with additional properties
interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  clientName?: string;
}

export default function DashboardPage() {
  const { isLoading, error, kpis: originalKpis, timeSeriesData, platformShareData, refreshData, rawData, brandData, filteredData } = useData()
  const kpis = originalKpis as any;
  const { data: session } = useSession()
  const { filters } = useFilters()
  
  // Cast the user to our extended type
  const user = session?.user as ExtendedUser | undefined;

  // Get current date for welcome message
  const today = new Date()
  const formattedDate = format(today, "EEEE, MMMM d, yyyy")
  
  // Welcome message based on user role
  const welcomeMessage = user?.role === "admin" ? 
    "Welcome Back Raghav" : 
    `Welcome Back ${user?.clientName || ""}`;

  // Find top performing brand
  const topBrand = !isLoading && brandData.length > 0
    ? brandData.sort((a, b) => b.availability - a.availability)[0]
    : null

  // Get bottom performing brand for insights
  const bottomBrand = !isLoading && brandData.length > 0
    ? brandData.sort((a, b) => a.availability - b.availability)[0]
    : null

  // Get competitor coverage data based on brands instead of platforms
  const coverageByBrandData = !isLoading ? getCoverageByBrandData(filteredData) : []

  // Last updated time
  const lastUpdated = format(new Date(), "h:mm a")
  
  // Get report date information for delta calculation explanation
  const getReportDates = () => {
    if (isLoading || !rawData.length) return null;
    
    // Get unique report dates
    const reportDates = Array.from(
      new Set(rawData.map(item => {
        if (item.reportDate instanceof Date) {
          return format(item.reportDate, "MMM d, yyyy");
        } else {
          return format(new Date(), "MMM d, yyyy");
        }
      }))
    ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    
    if (reportDates.length < 2) {
      return {
        currentReportDate: reportDates[0],
        previousReportDate: null,
        hasBothDates: false
      };
    }
    
    return {
      currentReportDate: reportDates[reportDates.length - 1],
      previousReportDate: reportDates[reportDates.length - 2],
      hasBothDates: true
    };
  };
  
  const reportDateInfo = getReportDates();

  if (error) {
    return <ErrorMessage message={error.message} retry={refreshData} />
  }

  return (
    <div className="space-y-6">
      {/* Welcome section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">{welcomeMessage}</h2>
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

      {/* Report date info */}
      {reportDateInfo && reportDateInfo.hasBothDates && (
        <Alert className="bg-blue-950/20 border-blue-900/30">
          <Icons.info className="h-4 w-4 text-blue-400" />
          <AlertTitle>Data Comparison Information</AlertTitle>
          <AlertDescription>
            All delta percentages compare the latest report ({reportDateInfo.currentReportDate}) with the previous report ({reportDateInfo.previousReportDate}).
          </AlertDescription>
        </Alert>
      )}

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
            <KpiCard 
              title="SKU Tracks" 
              value={kpis.skuTracks}
              icon={Icons.layers} 
              tooltip="Total unique SKUs tracked in the system"
            />
            <KpiCard
              title="Coverage"
              value={`${kpis.coverage.toFixed(1)}%`}
              icon={Icons.network}
              tooltip="Coverage = Availability % × Penetration %"
            />
            <KpiCard 
              title="Penetration" 
              value={`${kpis.penetration.toFixed(1)}%`}
              icon={Icons.chart} 
              tooltip="Penetration = Listed Pincodes / Serviceable Pincodes"
            />
            <KpiCard
              title="Availability"
              value={`${kpis.availability.toFixed(1)}%`}
              icon={Icons.check}
              tooltip="Availability = Available Pincodes / Listed Pincodes"
            />
          </>
        )}
      </div>

      {/* Main charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover md:col-span-1">
          <CardHeader>
            <CardTitle>Coverage by Brand</CardTitle>
            <CardDescription>Percentage of pincodes covered by each brand</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : (
              coverageByBrandData && coverageByBrandData.length > 0 ? (
                <BarChart
                  data={coverageByBrandData}
                  categories={["coverage"]}
                  index="name"
                  colors={["#ff6d00"]}
                  valueFormatter={(value: number) => `${value}%`}
                  showLegend={false}
                  showGridLines={true}
                  className="h-full w-full"
                  xAxisLabel="Brand"
                  yAxisLabel="Coverage %"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">No brand coverage data available</p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        <Card className="card-hover md:col-span-1 overflow-hidden p-0 bg-black/30">
          <div className="px-6 pt-6 pb-2">
            <h3 className="text-xl font-semibold">Pincode Metrics</h3>
            <p className="text-sm text-muted-foreground">Pincode coverage statistics</p>
          </div>
          <div className="grid grid-cols-2 h-full">
            {isLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              <>
                <div className="p-6 border-r border-b border-gray-800/30">
                  <p className="text-sm font-medium text-muted-foreground">Total Pincodes</p>
                  <p className="text-4xl font-bold text-blue-500 mt-1">{kpis.totalSKUs}</p>
                </div>
                <div className="p-6 border-b border-gray-800/30">
                  <p className="text-sm font-medium text-muted-foreground">Serviceable Pincodes</p>
                  <p className="text-4xl font-bold text-green-500 mt-1">{kpis.serviceableSKUs}</p>
                </div>
                <div className="p-6 border-r border-gray-800/30">
                  <p className="text-sm font-medium text-muted-foreground">Penetration %</p>
                  <p className="text-4xl font-bold text-yellow-500 mt-1">{kpis.penetration.toFixed(1)}%</p>
                </div>
                <div className="p-6">
                  <p className="text-sm font-medium text-muted-foreground">Availability %</p>
                  <p className="text-4xl font-bold text-red-500 mt-1">{kpis.availability.toFixed(1)}%</p>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>

      {/* Key Insights Section */}
      {!isLoading && (
        <Card className="card-hover">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Icons.lightbulb className="h-5 w-5 text-yellow-500" />
              Key Insights
            </CardTitle>
            <CardDescription>Critical insights from your data comparing latest report with previous report</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-md border overflow-hidden bg-black/5 dark:bg-black/20">
                <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
                  <Icons.alert className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium text-lg">Low Coverage Region</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold capitalize">{kpis.lowestCoverageRegion.name || "-"}</p>
                    <Badge 
                      variant="outline" 
                      className={`${
                        kpis.lowestCoverageRegion.delta > 0 
                          ? "bg-green-900/20 text-green-400 border-green-800/50" 
                          : "bg-red-900/20 text-red-400 border-red-800/50"
                      }`}
                    >
                      {kpis.lowestCoverageRegion.delta > 0 ? "+" : ""}
                      {kpis.lowestCoverageRegion.delta.toFixed(1)}%
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Your Coverage</span>
                      <span className="font-semibold">{kpis.lowestCoverageRegion.value.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                      <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${kpis.lowestCoverageRegion.value}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Competitor Coverage</span>
                      <span className="font-semibold">{(kpis.lowestCoverageRegion as any).competitorCoverage?.toFixed(1) || '0.0'}%</span>
                    </div>
                    <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                      <div className="bg-orange-500 h-2.5 rounded-full" 
                        style={{ width: `${(kpis.lowestCoverageRegion as any).competitorCoverage || 0}%` }}></div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-3">
                    This region has the lowest product coverage, representing an opportunity to improve distribution.
                    {kpis.lowestCoverageRegion.delta !== 0 && (
                      <span> Coverage has {kpis.lowestCoverageRegion.delta > 0 ? 'increased' : 'decreased'} by {Math.abs(kpis.lowestCoverageRegion.delta).toFixed(1)}% since last report.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-md border overflow-hidden bg-black/5 dark:bg-black/20">
                <div className="bg-green-900/10 dark:bg-green-900/20 p-4 border-b flex items-center gap-2">
                  <Icons.trendingUp className="h-5 w-5 text-green-500" />
                  <h3 className="font-medium text-lg">Highest Availability vs. Competitors</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold capitalize">
                      {(kpis as any).highestAvailabilityDeltaFromCompetitors?.name || 
                       kpis.highestAvailabilityDeltaRegion.name || "-"}
                    </p>
                    <Badge 
                      variant="outline" 
                      className="bg-green-900/20 text-green-400 border-green-800/50"
                    >
                      +{(kpis as any).highestAvailabilityDeltaFromCompetitors?.delta?.toFixed(1) || 
                         kpis.highestAvailabilityDeltaRegion.delta.toFixed(1) || '0.0'}%
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Your Availability</span>
                      <span className="font-semibold">
                        {(kpis as any).highestAvailabilityDeltaFromCompetitors?.value?.toFixed(1) || 
                         kpis.highestAvailabilityDeltaRegion.value.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                      <div className="bg-green-500 h-2.5 rounded-full" 
                        style={{ width: `${(kpis as any).highestAvailabilityDeltaFromCompetitors?.value || 
                                           kpis.highestAvailabilityDeltaRegion.value || 0}%` }}></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Competitor Availability</span>
                      <span className="font-semibold">
                        {(kpis as any).highestAvailabilityDeltaFromCompetitors?.competitors?.toFixed(1) || '0.0'}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                      <div className="bg-orange-500 h-2.5 rounded-full" 
                        style={{ width: `${(kpis as any).highestAvailabilityDeltaFromCompetitors?.competitors || 0}%` }}></div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-3">
                    This region has the highest availability advantage over competitors, showing your distribution strength.
                    {((kpis as any).highestAvailabilityDeltaFromCompetitors?.delta || kpis.highestAvailabilityDeltaRegion.delta) !== 0 && (
                      <span> This advantage has {((kpis as any).highestAvailabilityDeltaFromCompetitors?.delta || kpis.highestAvailabilityDeltaRegion.delta) > 0 ? 'increased' : 'decreased'} since last report.</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Navigation cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href="/dashboard/regional" className="block">
          <Card className="card-hover h-full transition-all hover:border-pinsight-orange/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.map className="mr-2 h-5 w-5 text-pinsight-orange" />
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
          <Card className="card-hover h-full transition-all hover:border-pinsight-orange/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.chart className="mr-2 h-5 w-5 text-pinsight-orange" />
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
          <Card className="card-hover h-full transition-all hover:border-pinsight-orange/50">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.tag className="mr-2 h-5 w-5 text-pinsight-orange" />
                Brand Evaluation
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Analyze product performance across different brands.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  )
}
