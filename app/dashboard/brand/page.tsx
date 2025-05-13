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

export default function BrandEvaluationPage() {
  const { isLoading, brandData: initialBrandData, productData, filteredData } = useData();

  console.log("Sample productData:", productData.slice(0, 10));
  console.log("isLoading:", isLoading);

  useEffect(() => {
    console.log("productData changed:", productData);
  }, [productData]);

  // Function to calculate brand-level metrics from product data
  function calculateBrandData(products: any[]) {
    const brands = Array.from(new Set(products.map((p) => p.brand)));
    return brands.map((brand) => {
      const items = products.filter((p) => p.brand === brand);

      // Build an array of valid discounts by coercing strings → numbers
      const discounts = items
        .map((p: any) => {
          const mrp = parseFloat(p.mrp as any);
          const sp = parseFloat(p.sellingPrice as any);
          if (!isNaN(mrp) && mrp > 0 && !isNaN(sp)) {
            return ((mrp - sp) / mrp) * 100;
          }
          return null;
        })
        .filter((d): d is number => d !== null && isFinite(d));

      const avgDiscount =
        discounts.length > 0
          ? discounts.reduce((a: number, b: number) => a + b, 0) /
            discounts.length
          : 0;

      const availabilities = items
        .map((p: any) => parseFloat(p.availability as any))
        .filter((v: number) => !isNaN(v) && isFinite(v));

      const avgAvailability = availabilities.length
        ? availabilities.reduce((a: number, b: number) => a + b, 0) /
          availabilities.length
        : 0;

      // Calculate penetration metrics
      const penetrations = items
        .map((p: any) => parseFloat(p.penetration as any))
        .filter((v: number) => !isNaN(v) && isFinite(v));

      const avgPenetration = penetrations.length
        ? penetrations.reduce((a: number, b: number) => a + b, 0) /
          penetrations.length
        : 0;

      // Calculate coverage metrics (penetration * availability / 100)
      const avgCoverage = (avgPenetration * avgAvailability) / 100;

      return {
        name: brand,
        avgDiscount,
        availability: avgAvailability,
        penetration: avgPenetration,
        coverage: avgCoverage,
        skuCount: items.length,
      };
    });
  }

  // Use the precomputed brandData if available; otherwise compute from scratch
  const brandData =
    initialBrandData && initialBrandData.length > 0
      ? initialBrandData
      : calculateBrandData(productData);

  console.log("Final brandData:", brandData);

  // Define columns for the product data table
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
    },
    {
      accessorKey: "mrp",
      header: "MRP (₹)",
      cell: ({ row }) => {
        const val = row.getValue("mrp");
        const num = typeof val === "string" ? parseFloat(val) : (val as number);
        return <span>{!isNaN(num) ? Math.round(num) : "-"}</span>;
      },
    },
    {
      accessorKey: "sellingPrice",
      header: "Selling Price (₹)",
      cell: ({ row }) => {
        const val = row.getValue("sellingPrice");
        const num = typeof val === "string" ? parseFloat(val) : (val as number);
        return <span>{!isNaN(num) ? Math.round(num) : "-"}</span>;
      },
    },
    {
      accessorKey: "discount",
      header: "Discount %",
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
                  pct > 90
                    ? "bg-green-500"
                    : pct > 80
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span>{pct.toFixed(1)}%</span>
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
                  pct > 90
                    ? "bg-green-500"
                    : pct > 80
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span>{pct.toFixed(1)}%</span>
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
                  pct > 90
                    ? "bg-green-500"
                    : pct > 80
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${pct}%` }}
              />
            </div>
            <span>{pct.toFixed(1)}%</span>
          </div>
        );
      },
    },
  ];

  // Transform brand data for scatter plot with availability on y-axis and penetration on x-axis
  const scatterData = !isLoading ? brandData.map(brand => {
    return {
      name: brand.name,
      x: brand.penetration || 0, // Penetration on x-axis
      y: brand.availability || 0, // Availability on y-axis
      size: brand.coverage || 0, // Size represents coverage
      category: brand.name
    };
  }) : [];

  // Update the coverage by brand data to use actual coverage values from brand data
  const coverageByBrandData = !isLoading ? brandData.map(brand => ({
    name: brand.name,
    coverage: brand.coverage || 0 // Use the actual coverage value
  })).sort((a, b) => b.coverage - a.coverage) : [];

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

      <div className="grid gap-8 md:grid-cols-2">
        {/* Graph 1: Scatter plot—Availability on y, Penetration on x, dot size = Coverage */}
        <Card className="card-hover md:col-span-2">
          <CardHeader>
            <CardTitle>Brand Availability vs Penetration</CardTitle>
            <CardDescription>
              Average availability on y-axis, average penetration on x-axis, dot size represents coverage
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : scatterData && scatterData.length > 0 ? (
              <ScatterChart
                data={scatterData}
                xAxisLabel="Average Penetration (%)"
                yAxisLabel="Average Availability (%)"
                sizeKey="size"
                sizeScale={[10, 80]}
                colors={["#FF6D00", "#2196F3", "#00C49F", "#FFBB28", "#9C27B0", "#FF7675"]}
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

        {/* Graph 3: "Coverage by Brand" */}
        <Card className="card-hover md:col-span-2">
          <CardHeader>
            <CardTitle>Coverage by Brand</CardTitle>
            <CardDescription>
              Brand coverage percentage comparison (Availability × Penetration)
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[350px]">
            {isLoading ? (
              <Skeleton className="h-full w-full" />
            ) : coverageByBrandData.length > 0 ? (
              <BarChart
                data={coverageByBrandData}
                categories={["coverage"]}
                index="name"
                colors={["#00c49f"]}
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
        <Card className="card-hover md:col-span-2">
          <CardHeader>
            <CardTitle>Brand Products</CardTitle>
            <CardDescription>
              Detailed metrics for individual products
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[400px] w-full" />
            ) : (
              <DataTable
                columns={columns}
                data={productData.map(p => {
                  // Calculate discount from actual mrp and selling price
                  const discount = p.mrp && p.sellingPrice ? 
                    parseFloat((((p.mrp - p.sellingPrice) / p.mrp) * 100).toFixed(1)) : 
                    undefined;
                  
                  // Get all data for this product to calculate coverage and penetration
                  const productItems = filteredData.filter((item: ProcessedData) => 
                    item.productId === p.brand + '_' + p.name || // Try a common product ID pattern
                    item.productDescription === p.name // Or match by description
                  );
                  
                  // If no matching items found, use the existing availability value
                  if (productItems.length === 0) {
                    return {
                      ...p,
                      coverage: 0,
                      penetration: 0,
                      discount
                    };
                  }
                  
                  // Get all unique pincodes for this product (serviceable)
                  const serviceablePincodes = new Set(productItems.map((item: ProcessedData) => item.pincode));
                  
                  // Get pincodes where this product is listed
                  const listedPincodes = new Set();
                  productItems.forEach((item: ProcessedData) => {
                    if (item.platform) {
                      listedPincodes.add(item.pincode);
                    }
                  });
                  
                  // Get pincodes where this product is available
                  const availablePincodes = new Set();
                  productItems.forEach((item: ProcessedData) => {
                    if (item.stockAvailable) {
                      availablePincodes.add(item.pincode);
                    }
                  });
                  
                  // Calculate penetration = Listed / Serviceable
                  const penetration = serviceablePincodes.size > 0 ?
                    (listedPincodes.size / serviceablePincodes.size) * 100 : 0;
                  
                  // Calculate availability = Available / Listed
                  const availability = listedPincodes.size > 0 ?
                    (availablePincodes.size / listedPincodes.size) * 100 : 0;
                  
                  // Calculate coverage = Penetration * Availability / 100
                  const coverage = (penetration * availability) / 100;
                  
                  return {
                    ...p,
                    coverage: parseFloat(coverage.toFixed(1)),
                    penetration: parseFloat(penetration.toFixed(1)),
                    availability: parseFloat(availability.toFixed(1)),
                    discount
                  };
                })}
                pageSize={10}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
