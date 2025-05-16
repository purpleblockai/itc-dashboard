"use client";

import { FilterBar } from "@/components/filters/filter-bar";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { DataTable } from "@/components/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScatterChart, BarChart } from "@/components/ui/chart";
import { useData } from "@/components/data-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";
import { ProcessedData } from "@/lib/data-service";
import { calculateKPIs } from "@/lib/data-service";
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

export default function BrandEvaluationPage() {
  const { isLoading, brandData: initialBrandData, productData, filteredData } = useData();

  console.log("Sample productData:", productData.slice(0, 10));
  console.log("isLoading:", isLoading);

  useEffect(() => {
    console.log("productData changed:", productData);
  }, [productData]);

  // Function to calculate brand-level metrics from product data
  function calculateBrandData(products: any[], filteredData: ProcessedData[]) {
    const brands = Array.from(new Set(products.map((p) => p.brand)));
    return brands.map((brand) => {
      const items = filteredData.filter((item) => item.brand === brand);
      const metrics = calculateKPIs(items);
      return {
        name: brand,
        avgDiscount: parseFloat(metrics.avgDiscount.toFixed(1)),
        availability: parseFloat(metrics.availability.toFixed(1)),
        penetration: parseFloat(metrics.penetration.toFixed(1)),
        coverage: parseFloat(metrics.coverageMethod1.toFixed(1)),
        skuCount: items.length,
      };
    });
  }

  // Use the precomputed brandData if available; otherwise compute from scratch
  const brandData = !isLoading ? calculateBrandData(productData, filteredData) : [];

  console.log("Final brandData:", brandData);

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

  // Transform brand data for scatter plot with improved visuals
  const scatterData = !isLoading ? brandData.map(brand => {
    return {
      name: brand.name,
      x: brand.penetration || 0, // Penetration on x-axis
      y: brand.availability || 0, // Availability on y-axis
      size: brand.coverage || 0, // Size represents coverage
      category: brand.name,
      // Add custom label text for better tooltips
      labelText: brand.name
    };
  }) : [];

  // Update the coverage by brand data with improved visualization
  const coverageByBrandData = !isLoading ? brandData
    .map(brand => ({
      name: brand.name,
      coverage: brand.coverage || 0,
      // Add capitalized key for better visualization
      Coverage: brand.coverage || 0
    }))
    .sort((a, b) => b.coverage - a.coverage) : [];

  // Helper to get unique brands and products
  function getUniqueBrandsAndProducts(productData: any[]) {
    const brands = Array.from(new Set(productData.map((p: any) => p.brand)));
    const products = Array.from(new Set(productData.map((p: any) => p.name)));
    return { brands, products };
  }

  // Helper to compute averages for a product-brand pair
  function getBrandProductAverages(
    productData: any[],
    productName: string,
    brand: string
  ) {
    const items = productData.filter(
      (p: any) => p.name === productName && p.brand === brand
    );
    if (!items.length) return null;
    const avg = (arr: number[]) =>
      arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
    const valid = (arr: number[]) =>
      arr.filter((v) => typeof v === "number" && !isNaN(v));
    const mrps = valid(items.map((p: any) => p.mrp));
    const sellingPrices = valid(items.map((p: any) => p.sellingPrice));
    const avails = valid(items.map((p: any) => p.availability));
    const discounts =
      mrps.length && sellingPrices.length
        ? mrps
            .map((mrp, i) =>
              mrp && sellingPrices[i]
                ? ((mrp - sellingPrices[i]) / mrp) * 100
                : null
            )
            .filter((v) => v !== null)
        : [];
    return {
      discount: discounts.length ? avg(discounts) : null,
      mrp: mrps.length ? avg(mrps) : null,
      sellingPrice: sellingPrices.length ? avg(sellingPrices) : null,
      availability: avails.length ? avg(avails) : null,
    };
  }

  // Brand comparison table data
  const { brands, products } = getUniqueBrandsAndProducts(productData);
  const brandComparisonData = products.map((productName) => {
    const row: Record<string, any> = { name: productName };
    brands.forEach((brand) => {
      const avg = getBrandProductAverages(productData, productName, brand);
      row[`${brand}_discount`] =
        avg && avg.discount !== null ? avg.discount : null;
      row[`${brand}_mrp`] = avg && avg.mrp !== null ? avg.mrp : null;
      row[`${brand}_sellingPrice`] =
        avg && avg.sellingPrice !== null ? avg.sellingPrice : null;
      row[`${brand}_availability`] =
        avg && avg.availability !== null ? avg.availability : null;
    });
    return row;
  });
  // Build columns dynamically
  const brandComparisonColumns = [
    {
      accessorKey: "name",
      header: "Product",
    },
    ...brands.flatMap((brand) => [
      {
        accessorKey: `${brand}_discount`,
        header: `${brand} Discount (avg)`,
        cell: ({ row }: any) => {
          const value = row.getValue(`${brand}_discount`);
          return value !== null && value !== undefined
            ? value.toFixed(1) + "%"
            : "-";
        },
      },
      {
        accessorKey: `${brand}_mrp`,
        header: `${brand} MRP (avg)`,
        cell: ({ row }: any) => {
          const value = row.getValue(`${brand}_mrp`);
          return value !== null && value !== undefined
            ? Math.round(value)
            : "-";
        },
      },
      {
        accessorKey: `${brand}_sellingPrice`,
        header: `${brand} Selling Price (avg)`,
        cell: ({ row }: any) => {
          const value = row.getValue(`${brand}_sellingPrice`);
          return value !== null && value !== undefined
            ? Math.round(value)
            : "-";
        },
      },
      {
        accessorKey: `${brand}_availability`,
        header: `${brand} Availability (avg)`,
        cell: ({ row }: any) => {
          const value = row.getValue(`${brand}_availability`);
          return value !== null && value !== undefined
            ? Math.round(value) + "%"
            : "-";
        },
      },
    ]),
  ];

  // Add debug logs for BarChart data
  console.log("brandData:", brandData);
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

  // Transform brand data for radar chart visualization
  const radarData = !isLoading ? brandData
    .filter(brand => brand.skuCount > 0) // Only include brands with data
    .slice(0, 8) // Limit to top 8 brands for readability
    .map(brand => ({
      name: brand.name,
      availability: brand.availability || 0,
      penetration: brand.penetration || 0,
      coverage: brand.coverage || 0,
      discount: brand.avgDiscount || 0,
    })) : [];

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
                      ? `${Math.min(100, coverageByBrandData[0].coverage)}%` 
                      : "0%" 
                    }}
                  ></div>
                </div>
                <span className="ml-2 text-lg font-semibold text-blue-500">
                  {!isLoading && coverageByBrandData.length > 0 
                    ? `${coverageByBrandData[0].coverage.toFixed(1)}%` 
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
                {!isLoading && brandData.length > 0 
                  ? [...brandData].sort((a, b) => b.availability - a.availability)[0].name
                  : "Loading..."}
              </span>
              <div className="flex items-center mt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div 
                    className="bg-green-500 h-2.5 rounded-full" 
                    style={{ width: !isLoading && brandData.length > 0 
                      ? `${Math.min(100, [...brandData].sort((a, b) => b.availability - a.availability)[0].availability)}%` 
                      : "0%" 
                    }}
                  ></div>
                </div>
                <span className="ml-2 text-lg font-semibold text-green-500">
                  {!isLoading && brandData.length > 0
                    ? `${[...brandData].sort((a, b) => b.availability - a.availability)[0].availability.toFixed(1)}%`
                    : ""}
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
                {!isLoading && brandData.length > 0
                  ? [...brandData].sort((a, b) => b.penetration - a.penetration)[0].name
                  : "Loading..."}
              </span>
              <div className="flex items-center mt-2">
                <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2.5">
                  <div 
                    className="bg-purple-500 h-2.5 rounded-full" 
                    style={{ width: !isLoading && brandData.length > 0 
                      ? `${Math.min(100, [...brandData].sort((a, b) => b.penetration - a.penetration)[0].penetration)}%` 
                      : "0%" 
                    }}
                  ></div>
                </div>
                <span className="ml-2 text-lg font-semibold text-purple-500">
                  {!isLoading && brandData.length > 0
                    ? `${[...brandData].sort((a, b) => b.penetration - a.penetration)[0].penetration.toFixed(1)}%`
                    : ""}
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
                colors={["#F97316", "#3B82F6", "#10B981", "#FBBF24", "#8B5CF6", "#EC4899"]} // Vibrant color palette
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
            ) : radarData && radarData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsRadarChart cx="50%" cy="50%" outerRadius="80%" data={radarData}>
                  <PolarGrid stroke="#e5e7eb" />
                  <PolarAngleAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 12 }} />
                  <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#6b7280' }} />
                  <Radar name="Availability" dataKey="availability" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.6} />
                  <Radar name="Penetration" dataKey="penetration" stroke="#F97316" fill="#F97316" fillOpacity={0.6} />
                  <Radar name="Coverage" dataKey="coverage" stroke="#10B981" fill="#10B981" fillOpacity={0.6} />
                  <Legend />
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
          <CardHeader className="bg-gradient-to-r from-blue-800 to-blue-700 text-white pb-6">
            <CardTitle className="text-2xl font-bold">Brand Performance Comparison</CardTitle>
            <CardDescription className="text-blue-100 opacity-90">
              Side-by-side comparison of key metrics across top brands
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[450px] p-6">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : brandComparisonChartData && brandComparisonChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart
                  data={brandComparisonChartData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} tickFormatter={(value) => `${value}%`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 12 }} />
                  <RechartsTooltip formatter={(value: any) => {
                    if (value === null || value === undefined) return ["-", ""];
                    return [typeof value === 'number' ? `${value.toFixed(1)}%` : value, ""];
                  }} />
                  <Legend />
                  <Bar dataKey="Availability" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="Availability" position="right" formatter={(value: number) => `${value.toFixed(0)}%`} />
                  </Bar>
                  <Bar dataKey="Penetration" fill="#F97316" radius={[0, 4, 4, 0]}>
                    <LabelList dataKey="Penetration" position="right" formatter={(value: number) => `${value.toFixed(0)}%`} />
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
                    // Remove items with null/NaN critical values
                    return p && p.brand && p.name;
                  })
                  .map((p: any) => {
                    // Ensure consistent product IDs for accurate filtering
                    const productId = p.brand + '_' + p.name;
                    const productItems = filteredData.filter((item: ProcessedData) => 
                      item.productId === productId ||
                      item.productDescription === p.name
                    );
                    const metrics = calculateKPIs(productItems);
                    
                    // Clean and format values
                    const coverage = metrics.coverageMethod1 ? parseFloat(metrics.coverageMethod1.toFixed(1)) : 0;
                    const penetration = metrics.penetration ? parseFloat(metrics.penetration.toFixed(1)) : 0;
                    const availability = metrics.availability ? parseFloat(metrics.availability.toFixed(1)) : 0;
                    
                    // Properly handle discount calculation to avoid NaN
                    let discount: number | undefined;
                    if (p.mrp && p.sellingPrice && !isNaN(p.mrp) && !isNaN(p.sellingPrice) && p.mrp > 0) {
                      discount = parseFloat((((p.mrp - p.sellingPrice) / p.mrp) * 100).toFixed(1));
                    } else {
                      discount = undefined;
                    }
                    
                    return {
                      ...p,
                      coverage,
                      penetration,
                      availability,
                      discount,
                      // Ensure all properties are defined for consistent column ordering
                      brand: p.brand || "",
                      name: p.name || "",
                      mrp: typeof p.mrp === 'number' && !isNaN(p.mrp) ? p.mrp : null,
                      sellingPrice: typeof p.sellingPrice === 'number' && !isNaN(p.sellingPrice) ? p.sellingPrice : null,
                    };
                  })
                  // Sort by brand and then by name for consistency across pages
                  .sort((a, b) => {
                    if (a.brand !== b.brand) {
                      return a.brand.localeCompare(b.brand);
                    }
                    return a.name.localeCompare(b.name);
                  })
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
