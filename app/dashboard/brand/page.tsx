// @ts-nocheck
"use client";
import React from "react";
import { FilterBar } from "@/components/filters/filter-bar";
import { DataTable } from "@/components/data-table";
import { getProductData, getCoverageByBrandData } from "@/lib/data-service";
import { useData } from "@/components/data-provider";
import { useEffect, useMemo } from "react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ScatterChart, BarChart, LineChart, PieChart } from "@/components/ui/chart";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import type { ProcessedData } from "@/lib/data-service";
import {
  ResponsiveContainer,
  RadarChart as RechartsRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  Legend,
  Tooltip as RechartsTooltip,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LabelList,
} from "recharts";
import { useTheme } from "next-themes";

export default function BrandEvaluationPage() {
  const { isLoading, brandCoverage, summaryAvailabilityByBrand, summaryPenetrationByBrand, filteredData, brandData, normalizedSummaryData } = useData();
  const { resolvedTheme, theme } = useTheme();
  const isDarkMode = resolvedTheme === 'dark';

  // Derive product-level data for the products table from normalized summary data (one row per product with aggregated values)
  const productData = useMemo(() => getProductData((normalizedSummaryData as unknown) as ProcessedData[]), [normalizedSummaryData]);

  // Define columns for the product data table with fixed widths and consistent styling
  const columns: ColumnDef<{
    brand: string;
    name: string;
    mrp: number | null;
    sellingPrice: number | null;
    availability: number;
    coverage?: number;
    penetration?: number;
    discount?: number;
  }>[] = [
    {
      accessorKey: "brand",
      header: "Brand",
      size: 100, // Fixed width
    },
    {
      accessorKey: "name",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Product
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      size: 250, // Fixed width
    },
    {
      accessorKey: "mrp",
      header: "MRP (₹)",
      size: 100, // Fixed width
      cell: ({ row }) => {
        const val = row.getValue("mrp");
        const num = typeof val === "string" ? parseFloat(val) : (val as number);
        return <span>{!isNaN(num) && num !== null ? Math.round(num) : "-"}</span>;
      },
    },
    {
      accessorKey: "sellingPrice",
      header: "Selling Price (₹)",
      size: 120, // Fixed width
      cell: ({ row }) => {
        const val = row.getValue("sellingPrice");
        const num = typeof val === "string" ? parseFloat(val) : (val as number);
        return <span>{!isNaN(num) && num !== null ? Math.round(num) : "-"}</span>;
      },
    },
    {
      accessorKey: "discount",
      header: "Discount %",
      size: 100, // Fixed width
      cell: ({ row }) => {
        const discountVal = row.getValue("discount");
        if (discountVal !== undefined && discountVal !== null) {
          const discount = typeof discountVal === "string" ? parseFloat(discountVal) : (discountVal as number);
          return <span>{!isNaN(discount) ? discount.toFixed(1) + "%" : "-"}</span>;
        }
          
        const mrpRaw = row.getValue("mrp");
        const spRaw = row.getValue("sellingPrice");
        const mrp =
          typeof mrpRaw === "string" ? parseFloat(mrpRaw) : (mrpRaw as number);
        const sp =
          typeof spRaw === "string" ? parseFloat(spRaw) : (spRaw as number);

        if (!isNaN(mrp) && mrp !== 0 && !isNaN(sp)) {
          const d = ((mrp - sp) / mrp) * 100;
          return <span>{d.toFixed(1)}%</span>;
        }
        return <span>-</span>;
      },
    },
    {
      accessorKey: "coverage",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Coverage %
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      size: 120, // Fixed width
      cell: ({ row }) => {
        const raw = row.getValue("coverage") as any;
        const value =
          typeof raw === "string" ? parseFloat(raw) : (raw as number);
        const pct = !isNaN(value) ? value : 0;
        return (
          <div className="flex items-center">
            <div
              className="mr-2 h-2 w-16 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full ${
                  pct > 80
                    ? "bg-green-500"
                    : pct > 50
                    ? "bg-yellow-500"
                    : pct > 0
                    ? "bg-red-500"
                    : "bg-gray-300"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span>{pct > 0 ? pct.toFixed(1) + "%" : "-"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "penetration",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Penetration %
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      size: 120, // Fixed width
      cell: ({ row }) => {
        const raw = row.getValue("penetration") as any;
        const value =
          typeof raw === "string" ? parseFloat(raw) : (raw as number);
        const pct = !isNaN(value) ? value : 0;
        return (
          <div className="flex items-center">
            <div
              className="mr-2 h-2 w-16 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full ${
                  pct > 80
                    ? "bg-green-500"
                    : pct > 50
                    ? "bg-yellow-500"
                    : pct > 0
                    ? "bg-red-500"
                    : "bg-gray-300"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span>{pct > 0 ? pct.toFixed(1) + "%" : "-"}</span>
          </div>
        );
      },
    },
    {
      accessorKey: "availability",
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        >
          Availability %
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      size: 120, // Fixed width
      cell: ({ row }) => {
        const raw = row.getValue("availability") as any;
        const value =
          typeof raw === "string" ? parseFloat(raw) : (raw as number);
        const pct = !isNaN(value) ? value : 0;
        return (
          <div className="flex items-center">
            <div
              className="mr-2 h-2 w-16 rounded-full bg-muted overflow-hidden"
              role="progressbar"
              aria-valuenow={pct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <div
                className={`h-full ${
                  pct > 80
                    ? "bg-green-500"
                    : pct > 50
                    ? "bg-yellow-500"
                    : pct > 0
                    ? "bg-red-500"
                    : "bg-gray-300"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span>{pct > 0 ? pct.toFixed(1) + "%" : "-"}</span>
          </div>
        );
      },
    },
  ];

  // Prepare radar data for brand performance radar using summary context
  const radarData = !isLoading
    ? brandCoverage.map(item => ({
        name: item.name,
        availability: summaryAvailabilityByBrand.find(a => a.name === item.name)?.availability ?? 0,
        penetration: summaryPenetrationByBrand.find(p => p.name === item.name)?.penetration ?? 0,
        coverage: item.coverage,
        discount: brandData.find(b => b.name === item.name)?.avgDiscount ?? 0,
      }))
    : [];

  // Update the coverage by brand data with capitalized key for BarChart
  const coverageByBrandData = !isLoading
    ? brandCoverage.map(item => ({ name: item.name, Coverage: item.coverage }))
    : [];

  // Helper to get unique brands and products
  function getUniqueBrandsAndProducts(productData: any[]) {
    const brands = Array.from(new Set(productData.map((p: any) => p.brand)));
    const products = Array.from(new Set(productData.map((p: any) => p.name)));
    return { brands, products };
  }

  // Add debug logs for BarChart data
  if (brandData && brandData.length > 0) {
    const missingAvgDiscount = brandData.filter(
      (b) => typeof b.avgDiscount !== "number" || isNaN(b.avgDiscount)
    );
    if (missingAvgDiscount.length > 0) {
      console.warn("Some brands are missing avgDiscount:", missingAvgDiscount);
    }
  } else {
    console.warn("brandData is empty or undefined!");
  }

  // Determine top brands for summary cards
  const topAvailabilityBrand = !isLoading && summaryAvailabilityByBrand.length > 0
    ? [...summaryAvailabilityByBrand].sort((a, b) => b.availability - a.availability)[0]
    : null;
  const availabilityBarWidth = topAvailabilityBrand ? `${topAvailabilityBrand.availability}%` : '0%';
  const availabilityPercent = topAvailabilityBrand ? `${topAvailabilityBrand.availability.toFixed(1)}%` : '';
  const topPenetrationBrand = !isLoading && summaryPenetrationByBrand.length > 0
    ? [...summaryPenetrationByBrand].sort((a, b) => b.penetration - a.penetration)[0]
    : null;
  const penetrationBarWidth = topPenetrationBrand ? `${topPenetrationBrand.penetration}%` : '0%';
  const penetrationPercent = topPenetrationBrand ? `${topPenetrationBrand.penetration.toFixed(1)}%` : '';

  // Transform brand data for scatter plot with improved visuals
  const scatterData = !isLoading
    ? summaryPenetrationByBrand.map(item => ({
        name: item.name,
        x: item.penetration,
        y: summaryAvailabilityByBrand.find(a => a.name === item.name)?.availability ?? 0,
        size: brandCoverage.find(c => c.name === item.name)?.coverage ?? 0,
        category: item.name,
        labelText: item.name,
      }))
    : [];

  // For a single brand case (when filtering), create a metrics-based radar
  const singleBrandRadarData = radarData.length === 1 && radarData[0] ? [
    { name: "Availability", value: radarData[0].availability },
    { name: "Penetration", value: radarData[0].penetration },
    { name: "Coverage", value: radarData[0].coverage },
    { name: "Discount", value: radarData[0].discount },
  ] : [];

  // Stronger saturated colors for clearer visibility
  const radarColors = ["#7C3AED", "#1D4ED8", "#047857", "#CA8A04", "#DB2777", "#4F46E5"];
  const multiBrandRadarData = radarData.length > 1 ? ["Availability", "Penetration", "Coverage", "Discount"].map(metricName => {
    const metricKey = metricName.toLowerCase();
    const entry: any = { metric: metricName };
    radarData.forEach(brand => {
      entry[brand.name] = (brand as any)[metricKey];
    });
    return entry;
  }) : [];
  // Sort brands by total 'insight' descending (availability+penetration+coverage+discount)
  const sortedRadarDataByInsight = [...radarData].sort((a, b) => {
    const aSum = a.availability + a.penetration + a.coverage + a.discount;
    const bSum = b.availability + b.penetration + b.coverage + b.discount;
    return bSum - aSum;
  });
  // Compute discount axis max (max discount + 10)
  const maxDiscountValue = radarData.reduce((max, b) => Math.max(max, b.discount), 0);
  const discountAxisMax = maxDiscountValue + 10;

  // Format data for brand performance comparison
  const brandComparisonChartData = !isLoading ? brandData
    .filter(brand => brand.skuCount > 0)
    .slice(0, 10) // Get top 10 brands
    .sort((a, b) => (b.availability + b.penetration) - (a.availability + a.penetration))
    .map(brand => ({
      name: brand.name,
      Availability: brand.availability || 0,
      Penetration: brand.penetration || 0,
      "Avg. Discount": brand.avgDiscount || 0,
      skuCount: brand.skuCount,
    })) : [];
  const brandDiscountChartData = !isLoading ? brandData
    .filter((brand) => brand.skuCount > 0)
    .map((brand) => ({
      name: brand.name,
      Discount: brand.avgDiscount || 0,
    }))
    .sort((a, b) => b.Discount - a.Discount) : [];

  // Helper formatter functions with correct typing
  const percentFormatter = (value: any): string => {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return `${typeof value === 'number' ? value.toFixed(1) : value}%`;
  };

  const numberFormatter = (value: any): string => {
    if (value === null || value === undefined || isNaN(value)) return "-";
    return typeof value === 'number' ? Math.round(value).toString() : value.toString();
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight dashboard-text">
          Brand Evaluation
        </h2>
        <p className="text-muted-foreground">
          Analyze brand metrics and product performance
        </p>
      </div>

      <Separator />

      <FilterBar />

      {/* Top metrics summary cards - Improved readability */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-50 dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Brand by Coverage</span>
              <span className="text-2xl font-bold text-slate-800 dark:text-white">
                {!isLoading && coverageByBrandData.length > 0 
                  ? coverageByBrandData[0].name 
                  : "Loading..."}
              </span>
              <div className="flex items-center mt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div 
                    className="bg-blue-500 h-2.5 rounded-full" 
                    style={{ width: !isLoading && coverageByBrandData.length > 0 
                      ? `${Math.min(100, coverageByBrandData[0].Coverage)}%` 
                      : "0%" 
                    }}
                  ></div>
                </div>
                <span className="ml-2 text-lg font-semibold text-blue-500">
                  {!isLoading && coverageByBrandData.length > 0 
                    ? `${coverageByBrandData[0].Coverage.toFixed(1)}%` 
                    : ""}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Brand by Availability</span>
              <span className="text-2xl font-bold text-slate-800 dark:text-white">
                {topAvailabilityBrand ? topAvailabilityBrand.name : 'Loading...'}
              </span>
              <div className="flex items-center mt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div
                    className="bg-green-500 h-2.5 rounded-full"
                    style={{ width: availabilityBarWidth }}
                  ></div>
                </div>
                <span className="ml-2 text-lg font-semibold text-green-500">
                  {availabilityPercent}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-50 dark:bg-slate-800 shadow-md hover:shadow-lg transition-shadow">
          <CardContent className="pt-6">
            <div className="flex flex-col space-y-2">
              <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Top Brand by Penetration</span>
              <span className="text-2xl font-bold text-slate-800 dark:text-white">
                {topPenetrationBrand ? topPenetrationBrand.name : 'Loading...'}
              </span>
              <div className="flex items-center mt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div
                    className="bg-purple-500 h-2.5 rounded-full"
                    style={{ width: penetrationBarWidth }}
                  ></div>
                </div>
                <span className="ml-2 text-lg font-semibold text-purple-500">
                  {penetrationPercent}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-8 md:grid-cols-2">
        {/* Graph 1: Scatter plot—Availability on y, Penetration on x, dot size = Coverage */}
        <Card className="card-hover md:col-span-2 overflow-hidden border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-700 text-white pb-6">
            <CardTitle className="text-2xl font-bold">Brand Availability vs Penetration</CardTitle>
            <CardDescription className="text-slate-200 opacity-90">
              Average availability on y-axis, average penetration on x-axis, dot size represents coverage
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[450px] p-6">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : scatterData && scatterData.length > 0 ? (
              <ScatterChart
                data={scatterData}
                xAxisLabel="Average Penetration (%)"
                yAxisLabel="Average Availability (%)"
                sizeKey="size"
                sizeScale={[20, 90]} // Slightly larger dots for better visibility
                colors={radarColors} // Use same brand colors as radar
                categoryColors={{
                  "Amul": "#7C3AED",
                  "Cavin's": "#1D4ED8",
                  "Britannia": "#047857",
                  "Smoodh": "#CA8A04"
                }}
                valueFormatter={{
                  x: (value: number) => `${value.toFixed(1)}%`,
                  y: (value: number) => `${value.toFixed(1)}%`
                }}
                showLegend={true}
                className="h-full"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NEW: Brand Performance Radar Chart */}
        <Card className="card-hover overflow-hidden border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-purple-800 to-purple-700 text-white pb-6">
            <CardTitle className="text-2xl font-bold">Brand Performance Radar</CardTitle>
            <CardDescription className="text-purple-100 opacity-90">
              Multi-dimensional comparison of top brands across key metrics
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[450px] p-6">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : radarData && radarData.length > 1 ? (
              // Multi-brand radar: one shape per brand over fixed metrics axes
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={multiBrandRadarData}>
                  <PolarGrid stroke={isDarkMode ? '#4B5563' : '#D1D5DB'} />
                  <PolarAngleAxis dataKey="metric" tick={{ fill: isDarkMode ? '#374151' : '#4B5563', fontSize: 12 }} />
                  {/* Use domain based on max discount + 10% for better discount visibility */}
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: isDarkMode ? '#374151' : '#4B5563' }} />
                  {sortedRadarDataByInsight.map((brand, idx) => (
                    <Radar
                      key={brand.name}
                      name={brand.name}
                      dataKey={brand.name}
                      stroke={radarColors[idx % radarColors.length]}
                      fill={radarColors[idx % radarColors.length]}
                      fillOpacity={0.6}
                      strokeWidth={2}
                      dot={{ r: 3, stroke: radarColors[idx % radarColors.length], strokeWidth: 1, fill: '#fff' }}
                    />
                  ))}
                  <Legend wrapperStyle={{ color: isDarkMode ? '#fff' : '#000' }} />
                  <RechartsTooltip formatter={(value: any) => {
                    if (value === null || value === undefined) return ["-", ""];
                    return [typeof value === 'number' ? `${value.toFixed(1)}%` : value, ""];
                  }} />
                </RechartsRadarChart>
              </ResponsiveContainer>
            ) : singleBrandRadarData.length > 0 ? (
              // Single brand mode - display metrics radar
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={singleBrandRadarData}>
                  <PolarGrid stroke={isDarkMode ? '#4B5563' : '#D1D5DB'} />
                  <PolarAngleAxis dataKey="name" tick={{ fill: isDarkMode ? '#374151' : '#4B5563', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: isDarkMode ? '#374151' : '#4B5563' }} />
                  <Radar 
                    name={radarData[0]?.name || "Brand"} 
                    dataKey="value" 
                    stroke="#0047AB" 
                    fill="#0047AB" 
                    fillOpacity={0.8}
                    strokeWidth={2} 
                  />
                  <Legend wrapperStyle={{ color: isDarkMode ? '#fff' : '#000' }} />
                  <RechartsTooltip formatter={(value: any) => {
                    if (value === null || value === undefined) return ["-", ""];
                    return [typeof value === 'number' ? `${value.toFixed(1)}%` : value, ""];
                  }} />
                </RechartsRadarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* NEW: Horizontal Bar Chart - Brand Performance Comparison */}
        <Card className="card-hover overflow-hidden border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-yellow-800 to-yellow-700 text-white pb-6">
            <CardTitle className="text-2xl font-bold">Average Discount by Brand</CardTitle>
            <CardDescription className="text-yellow-100 opacity-90">
              Average discount percentage for each brand
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[450px] p-6">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : brandDiscountChartData && brandDiscountChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={brandDiscountChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 'dataMax + 5']} tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <RechartsTooltip formatter={(value: any) => {
                    if (value === null || value === undefined) return ["-", ""];
                    return [typeof value === 'number' ? `${value.toFixed(1)}%` : value, ""];
                  }} />
                  <Bar dataKey="Discount" fill="#F59E0B" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="Discount" position="right" formatter={(value: number) => `${value.toFixed(1)}%`} />
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Graph 3: "Coverage by Brand" */}
        <Card className="card-hover md:col-span-2 overflow-hidden border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-emerald-800 to-emerald-700 text-white pb-6">
            <CardTitle className="text-2xl font-bold">Coverage by Brand</CardTitle>
            <CardDescription className="text-emerald-100 opacity-90">
              Brand coverage percentage comparison (Availability × Penetration)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px] p-6">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : coverageByBrandData.length > 0 ? (
              <BarChart
                data={coverageByBrandData}
                categories={["Coverage"]} // Use capitalized key for consistency
                index="name"
                colors={["#10B981"]} // Emerald color for consistency
                valueFormatter={(value: number) => `${value.toFixed(1)}%`}
                showLegend={false}
                showGridLines={true}
                className="h-full"
                xAxisLabel="Brand"
                yAxisLabel="Coverage %"
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <p className="text-muted-foreground">No data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Brand Products Table */}
        <Card className="card-hover md:col-span-2 overflow-hidden border-none shadow-lg">
          <CardHeader className="bg-gradient-to-r from-slate-700 to-slate-600 text-white pb-6">
            <CardTitle className="text-2xl font-bold">Brand Products</CardTitle>
            <CardDescription className="text-slate-200 opacity-90">
              Detailed metrics for individual products
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <DataTable
                columns={columns}
                data={productData
                  .filter((p: any) => {
                    // Remove items with null/undefined critical values
                    return p && p.brand && p.name;
                  })
                  // Use the aggregated data directly from getProductData (no need to recalculate)
                }
                pageSize={10}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
