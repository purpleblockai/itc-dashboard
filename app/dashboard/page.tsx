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
import { badgeVariants } from "@/components/ui/badge"
import { useEffect, useState, useMemo, useRef } from "react"
import { useToast } from "@/components/ui/use-toast"
import {
  ResponsiveContainer,
  BarChart as ReBarChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  LabelList,
} from "recharts"
import { KeyInsights } from "./KeyInsights"

// Define type for the user with additional properties
interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  clientName?: string;
}

export default function DashboardPage() {
  const startTimeRef = useRef<number>(performance.now());
  const { isLoading, error, kpis: originalKpis, serverKpis, timeSeriesData, platformShareData, refreshData, rawData, brandData, filteredData, normalizedSummaryData, summaryAvailabilityByBrand, summaryPenetrationByBrand, lowestCoveragePlatform, lowestAvailabilityPlatform, brandCoverage } = useData()
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

  // Use server-provided brand coverage when unfiltered
  const coverageByBrandData = !isLoading ? brandCoverage : []

  // Get availability by brand data for dashboard (from summary)
  const availabilityByBrandData = useMemo(() => {
    if (isLoading) return [];
    return summaryAvailabilityByBrand.sort((a, b) => b.availability - a.availability);
  }, [summaryAvailabilityByBrand, isLoading]);

  // Compute average MRP and Selling Price per product from summary data
  const avgPriceByProductData = useMemo(() => {
    if (isLoading) return [];
    const map = new Map<string, { totalMrp: number; totalSp: number; count: number }>();
    normalizedSummaryData.forEach(item => {
      const key = item.productDescription;
      if (!map.has(key)) map.set(key, { totalMrp: 0, totalSp: 0, count: 0 });
      const entry = map.get(key)!;
      entry.totalMrp += item.mrp;
      entry.totalSp += item.sellingPrice;
      entry.count += 1;
    });
    return Array.from(map.entries())
      .map(([name, { totalMrp, totalSp, count }]) => ({
        name,
        fullName: name,
        avgMrp: parseFloat((totalMrp / count).toFixed(2)),
        avgSp: parseFloat((totalSp / count).toFixed(2)),
      }))
      .sort((a, b) => b.avgMrp - a.avgMrp);
  }, [normalizedSummaryData, isLoading]);

  // Compute average discount per product from summary data
  const avgDiscountByProductData = useMemo(() => {
    if (isLoading) return [];
    const map = new Map<string, { totalDiscount: number; count: number }>();
    normalizedSummaryData.forEach(item => {
      const key = item.productDescription;
      if (!map.has(key)) map.set(key, { totalDiscount: 0, count: 0 });
      const entry = map.get(key)!;
      entry.totalDiscount += item.discount;
      entry.count += 1;
    });
    return Array.from(map.entries())
      .map(([name, { totalDiscount, count }]) => ({
        name,
        fullName: name,
        avgDiscount: parseFloat((totalDiscount / count).toFixed(1)),
      }))
      .sort((a, b) => b.avgDiscount - a.avgDiscount);
  }, [normalizedSummaryData, isLoading]);

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

      {/* Key Insights moved to bottom via KeyInsights component */}

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
              tooltip="This is the total number of unique SKUs that are being tracked in the system. It is calculated by taking the count of unique product names in the data."
            />
            <KpiCard
              title="Coverage"
              value={`${kpis.coverage.toFixed(1)}%`}
              icon={Icons.network}
              tooltip="Coverage for a product is the percentage of total pincodes on which the said product is available to order."
            />
            <KpiCard 
              title="Penetration" 
              value={`${kpis.penetration.toFixed(1)}%`}
              icon={Icons.chart} 
              tooltip="Penetration for a product is the percentage of total pincodes on which the said product is listed. (May be out of stock but listed)"
            />
            <KpiCard
              title="Availability"
              value={`${kpis.availability.toFixed(1)}%`}
              icon={Icons.check}
              tooltip="Availability for a product is the percentage of listed pincodes on which your product is available to order. Listed pincodes are the pincodes on which your product is listed in the system."
            />
          </>
        )}
      </div>

      {/* Main charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover md:col-span-1">
          <CardHeader>
            <CardTitle>Coverage by Brand</CardTitle>
            <CardDescription>Percentage of pincodes covered for each brand</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <div className="h-full w-full overflow-auto">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : (
                coverageByBrandData && coverageByBrandData.length > 0 ? (
                  coverageByBrandData.length > 1 ? (
                    // Multiple brands: use scrollable custom BarChart
                  <div style={{ width: coverageByBrandData.length * 120 }} className="h-full">
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
                  </div>
                  ) : (
                    // Single brand: full width chart with labels
                    <div className="h-full w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <ReBarChart data={coverageByBrandData} margin={{ top: 20, right: 30, left: 0, bottom: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} tickLine={{ stroke: '#888' }} axisLine={{ stroke: '#888' }} />
                          <YAxis
                            tickFormatter={(value: number) => `${value}%`}
                            tick={{ fontSize: 12 }}
                            tickLine={{ stroke: '#888' }}
                            axisLine={{ stroke: '#888' }}
                            width={60}
                          />
                          <Tooltip formatter={(value: number) => `${value}%`} />
                          <Bar dataKey="coverage" fill="#8b5cf6">
                            <LabelList dataKey="coverage" position="top" formatter={(value: number) => `${value}%`} />
                          </Bar>
                        </ReBarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <p className="text-muted-foreground">No brand coverage data available</p>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="card-hover md:col-span-1">
          <CardHeader>
            <CardTitle>Availability by Brand</CardTitle>
            <CardDescription>Percentage of products available for each brand</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            <div className="h-full w-full overflow-auto">
              {isLoading ? (
                <Skeleton className="h-full w-full" />
              ) : availabilityByBrandData && availabilityByBrandData.length > 0 ? (
                availabilityByBrandData.length > 1 ? (
                <div style={{ height: availabilityByBrandData.length * 60 }} className="w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <ReBarChart
                      layout="vertical"
                      data={availabilityByBrandData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} vertical={true} />
                      <XAxis
                        type="number"
                        tickFormatter={(value: number) => `${value}%`}
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: "#888" }}
                        axisLine={{ stroke: "#888" }}
                      />
                      <YAxis
                        dataKey="name"
                        type="category"
                        width={150}
                        tick={{ fontSize: 12 }}
                        tickLine={{ stroke: "#888" }}
                        axisLine={{ stroke: "#888" }}
                      />
                      <Tooltip formatter={(value: number) => `${value}%`} />
                      <Bar dataKey="availability" fill="#10B981" barSize={30}>
                        <LabelList dataKey="availability" position="right" formatter={(value: number) => `${value}%`} />
                      </Bar>
                    </ReBarChart>
                  </ResponsiveContainer>
                </div>
                ) : (
                  <div className="h-full w-full">
                    <BarChart
                      data={availabilityByBrandData}
                      categories={["availability"]}
                      index="name"
                      colors={["#10B981"]}
                      valueFormatter={(value: number) => `${value}%`}
                      showLegend={false}
                      showGridLines={true}
                      className="h-full w-full"
                      xAxisLabel="Brand"
                      yAxisLabel="Availability %"
                    />
                  </div>
                )
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">No availability data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Average Price by Product with horizontal stacked bar chart */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Average Product Prices</CardTitle>
            <CardDescription>Average MRP and Selling Price for each product</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] overflow-auto">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : avgPriceByProductData && avgPriceByProductData.length > 0 ? (
              <div style={{ width: '100%', minWidth: avgPriceByProductData.length * 200 }} className="h-full">
                <BarChart
                  data={avgPriceByProductData.map(item => ({
                    ...item,
                    "Avg. MRP": item.avgMrp,
                    "Avg. Selling Price": item.avgSp,
                  }))}
                  categories={["Avg. MRP", "Avg. Selling Price"]}
                  index="name"
                  colors={["#6B7280", "#F59E0B"]}
                  valueFormatter={(value: number) => `${value}`}
                  showLegend={true}
                  showGridLines={true}
                  className="h-full w-full"
                  xAxisLabel="Product"
                  yAxisLabel="Price"
                  xAxisProps={{ interval: 0, angle: -45, textAnchor: 'end' }}
                  labelFormatter={(label) => {
                    const item = avgPriceByProductData.find(d => d.name === label);
                    return item?.name || label;
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <p className="text-muted-foreground">No price data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Average Discount for each Product</CardTitle>
            <CardDescription>Average Discount % for each product</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] overflow-auto">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : avgDiscountByProductData && avgDiscountByProductData.length > 0 ? (
              <div style={{ width: '100%', minWidth: avgDiscountByProductData.length * 150 }} className="h-full">
                <BarChart
                  data={avgDiscountByProductData}
                  categories={["avgDiscount"]}
                  index="name"
                  colors={["#3B82F6"]}
                  valueFormatter={(value: number) => `${value}%`}
                  showLegend={false}
                  showGridLines={true}
                  className="h-full w-full"
                  xAxisLabel="Product"
                  yAxisLabel="Discount %"
                  xAxisProps={{ interval: 0, angle: -45, textAnchor: 'end' }}
                  labelFormatter={(label) => {
                    const item = avgDiscountByProductData.find(d => d.name === label);
                    return item?.name || label;
                  }}
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <p className="text-muted-foreground">No discount data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <KeyInsights />

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
                View stock availability, coverage, and penetration by pincode regions and identify geographical trends.
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
                Compare performance across Swiggy Instamart, Zepto, and Blinkit.
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
