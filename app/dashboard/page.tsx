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
  const { isLoading, error, kpis: originalKpis, timeSeriesData, platformShareData, refreshData, rawData, brandData, filteredData, lowestCoveragePlatform, lowestAvailabilityPlatform } = useData()
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

  // Get availability by brand data for dashboard
  const availabilityByBrandData = useMemo(() => {
    if (isLoading) return [];
    return [...brandData]
      .map(item => ({ name: item.name, availability: item.availability }))
      .sort((a, b) => b.availability - a.availability);
  }, [brandData, isLoading]);

  // Compute average MRP and Selling Price per product for the bar chart
  const avgPriceByProductData = useMemo(() => {
    if (isLoading) return [];
    const nameMap = new Map<string, string>();
    const map = new Map<string, { totalMrp: number; totalSp: number; count: number }>();
    filteredData.forEach(item => {
      const rawName = item.productDescription;
      const cleanedName = rawName.replace(/\s*\(.*\)/, '');
      const name = cleanedName.length > 20 ? `${cleanedName.slice(0, 20)}...` : cleanedName;
      nameMap.set(name, cleanedName);
      const mrp = item.mrp;
      const sp = item.sellingPrice;
      if (!map.has(name)) {
        map.set(name, { totalMrp: 0, totalSp: 0, count: 0 });
      }
      const entry = map.get(name)!;
      entry.totalMrp += mrp;
      entry.totalSp += sp;
      entry.count += 1;
    });
    return Array.from(map.entries()).map(([name, { totalMrp, totalSp, count }]) => {
      const avgMrp = parseFloat((totalMrp / count).toFixed(2));
      const avgSp = parseFloat((totalSp / count).toFixed(2));
      return { name, fullName: nameMap.get(name) || name, avgMrp, avgSp };
    });
  }, [filteredData, isLoading]);

  // Compute average discount per product for Discount chart
  const avgDiscountByProductData = useMemo(() => {
    if (isLoading) return [];
    const nameMap2 = new Map<string, string>();
    const map = new Map<string, { totalDiscount: number; count: number }>();
    filteredData.forEach(item => {
      const rawName = item.productDescription;
      const cleanedName = rawName.replace(/\s*\(.*\)/, '');
      const name = cleanedName.length > 20 ? `${cleanedName.slice(0, 20)}...` : cleanedName;
      nameMap2.set(name, cleanedName);
      const discount = item.discount;
      if (!map.has(name)) {
        map.set(name, { totalDiscount: 0, count: 0 });
      }
      const entry = map.get(name)!;
      entry.totalDiscount += discount;
      entry.count += 1;
    });
    return Array.from(map.entries()).map(([name, { totalDiscount, count }]) => ({
      name,
      fullName: nameMap2.get(name) || name,
      avgDiscount: parseFloat((totalDiscount / count).toFixed(1)),
    }));
  }, [filteredData, isLoading]);

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

        <Card className="card-hover md:col-span-1">
          <CardHeader>
            <CardTitle>Availability by Brand</CardTitle>
            <CardDescription>Percentage of products available for each brand</CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : availabilityByBrandData && availabilityByBrandData.length > 0 ? (
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
                    width={60}
                    tick={{ fontSize: 12 }}
                    tickLine={{ stroke: "#888" }}
                    axisLine={{ stroke: "#888" }}
                  />
                  <Tooltip formatter={(value: number) => `${value}%`} />
                  <Bar dataKey="availability" fill="#10B981" barSize={20}>
                    <LabelList dataKey="availability" position="right" formatter={(value: number) => `${value}%`} />
                  </Bar>
                </ReBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <p className="text-muted-foreground">No availability data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Average Price by Product with horizontal stacked bar chart */}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Average Product Prices</CardTitle>
            <CardDescription>Average MRP and Selling Price per product</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] overflow-x-scroll overflow-y-hidden">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : avgPriceByProductData && avgPriceByProductData.length > 0 ? (
              <div style={{ width: '100%', minWidth: avgPriceByProductData.length * 200 }} className="h-full">
                <BarChart
                  data={avgPriceByProductData}
                  categories={["avgMrp", "avgSp"]}
                  index="name"
                  colors={["#6B7280", "#F59E0B"]}
                  valueFormatter={(value: number) => `${value}`}
                  showLegend={true}
                  showGridLines={true}
                  className="h-full w-full"
                  xAxisLabel="Product"
                  yAxisLabel="Price"
                  labelFormatter={(label) => {
                    const item = avgPriceByProductData.find(d => d.name === label);
                    return item?.fullName || label;
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
            <CardTitle>Average Discount by Product</CardTitle>
            <CardDescription>Average Discount % per product</CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] overflow-x-scroll overflow-y-hidden">
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
                  labelFormatter={(label) => {
                    const item = avgDiscountByProductData.find(d => d.name === label);
                    return item?.fullName || label;
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

      <KeyInsights
        kpis={kpis}
        lowestCoveragePlatform={lowestCoveragePlatform}
        lowestAvailabilityPlatform={lowestAvailabilityPlatform}
      />

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
