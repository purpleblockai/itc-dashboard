"use client"

import { FilterBar } from "@/components/filters/filter-bar"
import { KpiCard } from "@/components/kpi-card"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
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
import { useEffect, useState, useMemo } from "react"
import { useToast } from "@/components/ui/use-toast"

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
  
  // Welcome message using user's name
  const welcomeMessage = `Welcome, ${user?.name?.split(' ')[0] || ""}`;

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

  // Platform insights: compute coverage & availability comparisons per platform
  const platformMetrics = useMemo(() => {
    if (isLoading) return [];
    const clientNameFromData = filteredData.find(item => item.clientName)?.clientName || "";
    if (!clientNameFromData) return [];
    const map = new Map<string, { clientItems: any[]; competitorItems: any[] }>();
    filteredData.forEach(item => {
      const platform = item.platform;
      if (!map.has(platform)) {
        map.set(platform, { clientItems: [], competitorItems: [] });
      }
      const entry = map.get(platform)!;
      if (item.brand === clientNameFromData) {
        entry.clientItems.push(item);
      } else if (item.brand) {
        entry.competitorItems.push(item);
      }
    });
    return Array.from(map.entries()).map(([name, { clientItems, competitorItems }]) => {
      // Compute client metrics
      const clientTotal = clientItems.length;
      const clientAvailable = clientItems.filter(i => i.availability === "Yes").length;
      const clientCoverage = clientTotal > 0 ? (clientAvailable / clientTotal) * 100 : 0;
      const clientListed = clientItems.filter(i => i.availability === "Yes" || i.availability === "No").length;
      const clientAvailability = clientListed > 0 ? (clientAvailable / clientListed) * 100 : 0;
      // Compute competitor metrics
      const compTotal = competitorItems.length;
      const compAvailable = competitorItems.filter(i => i.availability === "Yes").length;
      const competitorCoverage = compTotal > 0 ? (compAvailable / compTotal) * 100 : 0;
      const compListed = competitorItems.filter(i => i.availability === "Yes" || i.availability === "No").length;
      const competitorAvailability = compListed > 0 ? (compAvailable / compListed) * 100 : 0;
      return {
        name,
        clientCoverage: parseFloat(clientCoverage.toFixed(1)),
        competitorCoverage: parseFloat(competitorCoverage.toFixed(1)),
        coverageDelta: parseFloat((clientCoverage - competitorCoverage).toFixed(1)),
        clientAvailability: parseFloat(clientAvailability.toFixed(1)),
        competitorAvailability: parseFloat(competitorAvailability.toFixed(1)),
        availabilityDelta: parseFloat((clientAvailability - competitorAvailability).toFixed(1)),
      };
    });
  }, [filteredData, isLoading]);

  // Determine lowest coverage and availability platforms
  const lowestCoveragePlatform = platformMetrics.length > 0
    ? platformMetrics.reduce((prev, curr) => curr.clientCoverage < prev.clientCoverage ? curr : prev)
    : null;
  const lowestAvailabilityPlatform = platformMetrics.length > 0
    ? platformMetrics.reduce((prev, curr) => curr.clientAvailability < prev.clientAvailability ? curr : prev)
    : null;

  // Last updated time
  const lastUpdated = format(new Date(), "h:mm a")
  
  // Get report date information for delta calculation explanation
  const getReportDates = () => {
    if (isLoading || !rawData.length) return null;
    
    // Get unique report dates in DD-MM-YYYY format
    const reportDates = Array.from(
      new Set(rawData.map(item => {
        if (item.reportDate instanceof Date) {
          return format(item.reportDate, "dd-MM-yyyy");
        } else {
          return format(new Date(), "dd-MM-yyyy");
        }
      }))
    ).sort((a, b) => {
      // Sort by actual date values parsed from DD-MM-YYYY
      const [dA, mA, yA] = a.split('-').map(Number);
      const [dB, mB, yB] = b.split('-').map(Number);
      return new Date(yA, mA - 1, dA).getTime() - new Date(yB, mB - 1, dB).getTime();
    });
    
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

  // Show data comparison info via toast on page mount
  const { toast } = useToast();
  const [infoToastShown, setInfoToastShown] = useState(false);
  useEffect(() => {
    if (!infoToastShown && reportDateInfo && reportDateInfo.hasBothDates) {
      toast({
        title: "Data Comparison Information",
        description: `All delta percentages compare the latest report (${reportDateInfo.currentReportDate}) with the previous report (${reportDateInfo.previousReportDate}).`,
        variant: "default",
      });
      setInfoToastShown(true);
    }
  }, [infoToastShown, reportDateInfo, toast]);

  if (error) {
    return <ErrorMessage message={error.message} retry={refreshData} />
  }

  return (
    <div className="space-y-4">
      {/* Welcome section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border pb-4">
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

      {/* Show message if no data */}
      {!isLoading && rawData.length === 0 && (
        <Card>
          <CardHeader>
            <CardTitle>No Data Available</CardTitle>
            <CardDescription>Contact your administrator to load data.</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Key Insights Section */}
      {!isLoading && (
        <Card className="card-hover">
          <CardHeader className="border-b bg-muted/40">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Icons.lightbulb className="h-5 w-5 text-yellow-500" />
              Key Insights
            </CardTitle>
            <CardDescription>Critical insights from your brand data</CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
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
                      <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${(kpis.lowestCoverageRegion as any).competitorCoverage > 0 ? Math.max((kpis.lowestCoverageRegion as any).competitorCoverage, 1) : 0}%` }}></div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-3">
                    This region has the lowest product coverage, representing an opportunity to improve distribution.
                    {kpis.lowestCoverageRegion.delta !== 0 && (
                      <span> Here, coverage is {kpis.lowestCoverageRegion.delta > 0 ? 'higher' : 'lower'} by {Math.abs(kpis.lowestCoverageRegion.delta).toFixed(1)}% compared to competitors.</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-md border overflow-hidden bg-black/5 dark:bg-black/20">
                <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
                  <Icons.alert className="h-5 w-5 text-red-500" />
                  <h3 className="font-medium text-lg">Largest Availability Gap vs. Competitors</h3>
                </div>
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-2xl font-bold capitalize">
                      {(kpis as any).highestAvailabilityDeltaFromCompetitors?.name || 
                       kpis.highestAvailabilityDeltaRegion.name || "-"}
                    </p>
                    <Badge 
                      variant="outline" 
                      className="bg-red-900/20 text-red-400 border-red-800/50"
                    >
                      {((kpis as any).highestAvailabilityDeltaFromCompetitors?.delta || 
                        kpis.highestAvailabilityDeltaRegion.delta || 0) > 0 ? "+" : ""}
                      {((kpis as any).highestAvailabilityDeltaFromCompetitors?.delta?.toFixed(1) || 
                         kpis.highestAvailabilityDeltaRegion.delta.toFixed(1) || '0.0')}%
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
                      <div className="bg-blue-600 h-2.5 rounded-full" 
                        style={{ width: `${Math.max((kpis as any).highestAvailabilityDeltaFromCompetitors?.value || 
                                           kpis.highestAvailabilityDeltaRegion.value || 0, 1)}%` }}></div>
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
                      <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${Math.max((kpis as any).highestAvailabilityDeltaFromCompetitors?.competitors || 0, 1)}%` }}></div>
                    </div>
                  </div>
                  
                  <p className="text-sm text-muted-foreground mt-3">
                    This region has the largest availability gap compared to competitor brands.
                    This represents an opportunity to improve your distribution in a competitive marketplace.
                  </p>
                </div>
              </div>

              {lowestCoveragePlatform && (
                <div className="rounded-md border overflow-hidden bg-black/5 dark:bg-black/20">
                  <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
                    <Icons.alert className="h-5 w-5 text-red-500" />
                    <h3 className="font-medium text-lg">Low Coverage Platform</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold capitalize">{lowestCoveragePlatform.name}</p>
                      <Badge
                        variant="outline"
                        className={`${
                          lowestCoveragePlatform.coverageDelta > 0
                            ? "bg-green-900/20 text-green-400 border-green-800/50"
                            : "bg-red-900/20 text-red-400 border-red-800/50"
                        }`}
                      >
                        {lowestCoveragePlatform.coverageDelta > 0 ? "+" : ""}
                        {lowestCoveragePlatform.coverageDelta.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Your Coverage</span>
                        <span className="font-semibold">{lowestCoveragePlatform.clientCoverage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${lowestCoveragePlatform.clientCoverage}%` }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Competitor Coverage</span>
                        <span className="font-semibold">{lowestCoveragePlatform.competitorCoverage.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                        <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${lowestCoveragePlatform.competitorCoverage}%` }}></div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      This platform has the lowest product coverage, highlighting an area for potential growth.
                      {lowestCoveragePlatform.coverageDelta !== 0 && (
                        <span> Here, coverage is {lowestCoveragePlatform.coverageDelta > 0 ? 'higher' : 'lower'} by {Math.abs(lowestCoveragePlatform.coverageDelta).toFixed(1)}% compared to competitors.</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
              {lowestAvailabilityPlatform && (
                <div className="rounded-md border overflow-hidden bg-black/5 dark:bg-black/20">
                  <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
                    <Icons.alert className="h-5 w-5 text-red-500" />
                    <h3 className="font-medium text-lg">Low Availability Platform</h3>
                  </div>
                  <div className="p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <p className="text-2xl font-bold capitalize">{lowestAvailabilityPlatform.name}</p>
                      <Badge
                        variant="outline"
                        className={`${
                          lowestAvailabilityPlatform.availabilityDelta > 0
                            ? "bg-green-900/20 text-green-400 border-green-800/50"
                            : "bg-red-900/20 text-red-400 border-red-800/50"
                        }`}
                      >
                        {lowestAvailabilityPlatform.availabilityDelta > 0 ? "+" : ""}
                        {lowestAvailabilityPlatform.availabilityDelta.toFixed(1)}%
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Your Availability</span>
                        <span className="font-semibold">{lowestAvailabilityPlatform.clientAvailability.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                        <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${lowestAvailabilityPlatform.clientAvailability}%` }}></div>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">Competitor Availability</span>
                        <span className="font-semibold">{lowestAvailabilityPlatform.competitorAvailability.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                        <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${lowestAvailabilityPlatform.competitorAvailability}%` }}></div>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground mt-3">
                      This platform has the lowest product availability, indicating potential distribution challenges.
                      {lowestAvailabilityPlatform.availabilityDelta !== 0 && (
                        <span> Here, availability is {lowestAvailabilityPlatform.availabilityDelta > 0 ? 'higher' : 'lower'} by {Math.abs(lowestAvailabilityPlatform.availabilityDelta).toFixed(1)}% compared to competitors.</span>
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

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
              title="SKUs Tracked" 
              value={kpis.skusTracked}
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
                  colors={["#8b5cf6"]}
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

        <Card className="card-hover md:col-span-1 overflow-hidden p-0">
          <CardHeader>
            <CardTitle>Pincode Metrics</CardTitle>
            <CardDescription>Pincode coverage statistics</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <>
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
                <Skeleton className="h-32" />
              </>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground">Total Pincodes</p>
                  <p className="text-4xl font-bold text-blue-500 mt-1">{kpis.totalSKUs}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground">Serviceable Pincodes</p>
                  <p className="text-4xl font-bold text-green-500 mt-1">{kpis.serviceableSKUs}</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground">Penetration %</p>
                  <p className="text-4xl font-bold text-yellow-500 mt-1">{kpis.penetration.toFixed(1)}%</p>
                </div>
                <div className="rounded-md border p-4">
                  <p className="text-sm font-medium text-muted-foreground">Availability %</p>
                  <p className="text-4xl font-bold text-red-500 mt-1">{kpis.availability.toFixed(1)}%</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
