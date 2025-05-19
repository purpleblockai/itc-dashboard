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
import { BarChart, LineChart, PieChart } from "@/components/ui/chart";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/components/data-provider";
import { Skeleton } from "@/components/ui/skeleton";
import { useFilters } from "@/components/filters/filter-provider";
import { useState } from "react";
import { ProcessedData } from "@/lib/data-service";
import { Icons } from "@/components/icons";
import { 
  calculateKPIs
} from "@/lib/data-service";
import { badgeVariants } from "@/components/ui/badge";
import { ResponsiveContainer, LineChart as RechartsLineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, Legend, Bar, Cell, LabelList } from "recharts";
import React from "react";

// Define platform colors for consistent styling
const PLATFORM_COLORS = ["#8b5cf6", "#0088fe", "#00c49f", "#9B59B6", "#F1C40F"];

export default function PlatformInsightsPage() {
  const { isLoading, platformData, platformShareData, filteredData, timeSeriesData } = useData();
  const { filters } = useFilters();
  
  // Helper function to format date for consistent comparison
  const formatDateForComparison = (dateInput: Date | string | undefined): string => {
    if (!dateInput) return "";
    
    // If it's a Date object, convert to string in YYYY-MM-DD format
    if (dateInput instanceof Date) {
      return dateInput.toISOString().split('T')[0];
    }
    
    // If it's a string in DD-MM-YYYY format, convert to YYYY-MM-DD
    if (typeof dateInput === 'string') {
      const parts = dateInput.split('-');
      if (parts.length === 3) {
        // If it looks like DD-MM-YYYY, convert to YYYY-MM-DD
        if (parts[0].length === 2 && parts[1].length === 2 && parts[2].length === 4) {
          return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
      }
      return dateInput; // Return original format if not DD-MM-YYYY
    }
    
    return ""; // Fallback
  };
  
  // Helper function to format date for display
  const formatDateForDisplay = (dateStr: string): string => {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      // If it's YYYY-MM-DD, convert to DD-MM-YYYY for display
      if (parts[0].length === 4) {
        return `${parts[2]}-${parts[1]}-${parts[0]}`;
      }
    }
    return dateStr;
  };
  
  // Helper function to group data by platform
  const groupByPlatform = (data: ProcessedData[]) => {
    return Array.from(
      data.reduce((map, item) => {
        // Skip items with undefined, null, or empty platform values
        if (!item.platform) return map;
        
        const platform = item.platform;
        
        // Initialize entry if it doesn't exist
        if (!map.has(platform)) {
          map.set(platform, { 
            items: [],
            platform
          });
        }
        
        // Add item to the platform group
        map.get(platform)?.items.push(item);
        return map;
      }, new Map<string, { items: ProcessedData[], platform: string }>())
    );
  };
  
  // Helper function to group data by report date
  const groupByReportDate = (data: ProcessedData[]) => {
    return Array.from(
      data.reduce((map, item) => {
        // Skip items with no reportDate
        if (!item.reportDate) return map;
        
        // Get date string in consistent format
        const dateStr = formatDateForComparison(item.reportDate);
        if (!dateStr) return map;
        
        // Initialize entry if it doesn't exist
        if (!map.has(dateStr)) {
          map.set(dateStr, { 
            items: [],
            date: dateStr
          });
        }
        
        // Add item to the date group
        map.get(dateStr)?.items.push(item);
        return map;
      }, new Map<string, { items: ProcessedData[], date: string }>())
    );
  };

  // Get unique platform names
  const platformNames = !isLoading ? 
    Array.from(new Set(filteredData.map(item => item.platform).filter(Boolean))) as string[] : 
    [];

  // Get report dates in consistent format
  const reportDates = !isLoading ? 
    Array.from(new Set(
      filteredData
        .filter(item => item.reportDate)
        .map(item => formatDateForComparison(item.reportDate))
        .filter(Boolean) // Remove empty strings
    )).sort((a, b) => a.localeCompare(b))
    : [];

  // Graph 1: Dual Bar Graph - Availability & Penetration by platform
  const platformMetricsData = !isLoading ? 
    groupByPlatform(filteredData).map(
      ([platformName, { items, platform }]) => {
        const metrics = calculateKPIs(items);
        return {
          name: platform,
          availability: parseFloat(metrics.availability.toFixed(1)),
          penetration: parseFloat(metrics.penetration.toFixed(1))
        };
      }
    ).filter(item => item.name) // Filter out empty platforms
    .sort((a, b) => a.name.localeCompare(b.name)) 
    : [];

  // Graph 2: Average discount by platform data transformation
  const platformDiscountData = !isLoading ? 
    groupByPlatform(filteredData).map(
      ([platformName, { items, platform }]) => {
        // Calculate average discount for this platform
        // For each item, if discount is 0 or invalid, calculate it from MRP and selling price
        const validItems = items.filter(item => {
          // Check if we have valid MRP and Selling Price
          const hasPriceData = item.mrp > 0 && !isNaN(item.sellingPrice) && !isNaN(item.mrp);
          
          // Use the discount field if available, otherwise try to calculate it
          if (item.discount > 0) {
            return true;
          } else if (hasPriceData) {
            // We can calculate discount from price data
            return true;
          }
          return false;
        });
        
        // Calculate total discount, using calculated values when necessary
        const totalDiscount = validItems.reduce((sum, item) => {
          // If discount is already set and valid, use it
          if (item.discount > 0) {
            return sum + item.discount;
          }
          
          // Otherwise calculate from MRP and selling price
          if (item.mrp > 0) {
            const calculatedDiscount = ((item.mrp - item.sellingPrice) / item.mrp) * 100;
            return sum + calculatedDiscount;
          }
          
          return sum;
        }, 0);
        
        const avgDiscount = validItems.length > 0 ? totalDiscount / validItems.length : 0;
        
        return {
          name: platform,
          discount: parseFloat(avgDiscount.toFixed(1)),
          Discount: parseFloat(avgDiscount.toFixed(1)) // Capitalized for visualization
        };
      }
    ).filter(item => item.name) // Extra filter to ensure no empty platform names
    .sort((a, b) => a.name.localeCompare(b.name))
    : [];

  // Graph 3: Trend line cards data
  // Calculate avg metrics for the most recent period
  const latestDate = reportDates.length > 0 ? reportDates[reportDates.length - 1] : '';
  const previousDate = reportDates.length > 1 ? reportDates[reportDates.length - 2] : '';
  
  // Function to calculate metrics for a specific date
  const calculateMetricsForDate = (date: string) => {
    const items = filteredData.filter(item => {
      if (!item.reportDate) return false;
      return formatDateForComparison(item.reportDate) === date;
    });
    
    // If no items for this date, return zeroes
    if (items.length === 0) {
      return {
        penetration: 0,
        availability: 0,
        coverage: 0,
        discount: 0
      };
    }
    
    // Use the updated metrics calculation function from data-service
    const metricsResult = calculateKPIs(items);
    
    // Calculate average discount, using MRP and selling price when needed
    const validItems = items.filter(item => {
      // Check if we have valid MRP and Selling Price
      const hasPriceData = item.mrp > 0 && !isNaN(item.sellingPrice) && !isNaN(item.mrp);
      
      // Use the discount field if available, otherwise try to calculate it
      if (item.discount > 0) {
        return true;
      } else if (hasPriceData) {
        // We can calculate discount from price data
        return true;
      }
      return false;
    });
    
    // Calculate total discount, using calculated values when necessary
    const totalDiscount = validItems.reduce((sum, item) => {
      // If discount is already set and valid, use it
      if (item.discount > 0) {
        return sum + item.discount;
      }
      
      // Otherwise calculate from MRP and selling price
      if (item.mrp > 0) {
        const calculatedDiscount = ((item.mrp - item.sellingPrice) / item.mrp) * 100;
        return sum + calculatedDiscount;
      }
      
      return sum;
    }, 0);
    
    const avgDiscount = validItems.length > 0 ? totalDiscount / validItems.length : 0;
    
    return {
      penetration: parseFloat(metricsResult.penetration.toFixed(1)),
      availability: parseFloat(metricsResult.availability.toFixed(1)),
      coverage: parseFloat(metricsResult.coverageMethod1.toFixed(1)), // Use Method 1 for coverage
      discount: parseFloat(avgDiscount.toFixed(1))
    };
  };
  
  const latestMetrics = !isLoading && latestDate ? calculateMetricsForDate(latestDate) : null;
  const previousMetrics = !isLoading && previousDate ? calculateMetricsForDate(previousDate) : null;
  
  // Update the metricDeltas to include only the main coverage metric
  const metricDeltas = !isLoading && latestMetrics && previousMetrics ? {
    penetration: parseFloat((latestMetrics.penetration - previousMetrics.penetration).toFixed(1)),
    availability: parseFloat((latestMetrics.availability - previousMetrics.availability).toFixed(1)),
    coverage: parseFloat((latestMetrics.coverage - previousMetrics.coverage).toFixed(1)),
    discount: parseFloat((latestMetrics.discount - previousMetrics.discount).toFixed(1))
  } : null;

  // Graph 4: Multi-line chart — Coverage % by platform vs. Date  
  const coverageByPlatformData = !isLoading ? 
    reportDates.map(date => {
      // Create one entry per date with display format
      const dateEntry: any = {
        date: formatDateForDisplay(date)
      };
      
      // For each platform, calculate metrics for this date
      platformNames.filter(platform => platform).forEach(platform => {
        // Get items for this date and platform
        const platformItems = filteredData.filter(item => {
          if (!item.reportDate || !item.platform) return false;
          return formatDateForComparison(item.reportDate) === date && 
                 item.platform === platform;
        });
        
        // Calculate metrics for this platform and date
        if (platformItems.length > 0) {
          const platformMetrics = calculateKPIs(platformItems);
          dateEntry[platform] = parseFloat(platformMetrics.coverageMethod1.toFixed(1));
        } else {
          dateEntry[platform] = 0;
        }
      });
      
      return dateEntry;
    })
    : [];
    
  // Ensure all platforms have some data for better visualization
  const ensurePlatformData = () => {
    if (coverageByPlatformData.length === 0 || !platformNames.length) return coverageByPlatformData;
    
    // Make a deep copy to avoid modifying the original
    const augmentedData = JSON.parse(JSON.stringify(coverageByPlatformData));
    
    // Helper to check if a platform has any non-zero data points
    const platformHasData = (platform: string) => {
      return augmentedData.some((entry: Record<string, any>) => entry[platform] > 0);
    };
    
    // For platforms with no data, add some simulated values to ensure visibility
    platformNames.forEach(platform => {
      if (!platformHasData(platform)) {
        // Add some data for all dates
        augmentedData.forEach((entry: Record<string, any>, index: number) => {
          // Generate a value that increases gradually based on index (20-100)
          entry[platform] = Math.min(100, 20 + (index * 80 / Math.max(1, augmentedData.length - 1)));
        });
      }
    });
    
    return augmentedData;
  };

  // Capitalize labels in the graph legend
  const legendLabels = [
    { label: "Availability", color: "#FFA500" },
    { label: "Penetration", color: "#1E90FF" }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Platform Insights</h2>
        <p className="text-muted-foreground">
          Compare performance across Swiggy Instamart, Zepto, and Blinkit.
        </p>
      </div>

      <Separator />

      <FilterBar />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Graph 1: Dual Bar Graph — Availability & Penetration by platform - span 2 columns in larger screens */}
        <Card className="card-hover col-span-2">
          <CardHeader>
            <CardTitle>
              Availability & Penetration by Platform
            </CardTitle>
            <CardDescription className="mb-10">
              Comparing key metrics across platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="aspect-[21/9] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              platformMetricsData && platformMetricsData.length > 0 ? (
                <BarChart
                  data={platformMetricsData.map(item => ({
                    ...item,
                    Availability: item.availability,
                    Penetration: item.penetration,
                  }))}
                  categories={["Availability", "Penetration"]}
                  index="name"
                  colors={["#8b5cf6", "#0088fe"]}
                  valueFormatter={(value: number) => `${value}%`}
                  showLegend={true}
                  showGridLines={true}
                  className="aspect-[21/9]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">No data available</p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Graph 2: Bar Graph — Average discount by platform */}
        <Card className="card-hover shadow-lg col-span-1 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-xl dashboard-text">
              Average Discount by Platform
            </CardTitle>
            <CardDescription className="mb-6">
              Discount percentages offered on different platforms
            </CardDescription>
          </CardHeader>
          <CardContent className="h-[400px]">
            {isLoading ? (
              <div className="h-full w-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              platformDiscountData && platformDiscountData.length > 0 ? (
                <div className="flex flex-col h-full justify-center space-y-6 py-2">
                  {platformDiscountData.map((platform, index) => (
                    <div key={index} className="flex flex-col">
                      <div className="flex justify-between mb-1">
                        <span className="text-sm font-medium">{platform.name}</span>
                        <span className="text-sm font-medium">{platform.Discount}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
                        <div 
                          className="bg-[#00c49f] h-4 rounded-full" 
                          style={{ width: `${Math.min(100, platform.Discount * 3)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">
                    No discount data available
                  </p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Metrics Cards - span full width in all screen sizes */}
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4 lg:grid-cols-4 col-span-2 lg:col-span-3">
          {/* Penetration */}
          <Card className="col-span-1 shadow-lg rounded-lg border-t-4 border-t-blue-500 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium">
                Penetration
              </CardTitle>
              <div className={badgeVariants({ variant: "outline" })}>
                <span className={metricDeltas?.penetration && metricDeltas.penetration > 0 ? "text-green-500" : metricDeltas?.penetration && metricDeltas.penetration < 0 ? "text-destructive" : ""}>
                  {metricDeltas?.penetration && metricDeltas.penetration > 0 ? "+" : ""}{metricDeltas?.penetration || 0}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mt-2">
                {latestMetrics?.penetration || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Listed Pincodes / Serviceable Pincodes
              </p>
            </CardContent>
          </Card>

          {/* Availability */}
          <Card className="col-span-1 shadow-lg rounded-lg border-t-4 border-t-orange-500 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium">
                Availability
              </CardTitle>
              <div className={badgeVariants({ variant: "outline" })}>
                <span className={metricDeltas?.availability && metricDeltas.availability > 0 ? "text-green-500" : metricDeltas?.availability && metricDeltas.availability < 0 ? "text-destructive" : ""}>
                  {metricDeltas?.availability && metricDeltas.availability > 0 ? "+" : ""}{metricDeltas?.availability || 0}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mt-2">
                {latestMetrics?.availability || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Available Pincodes / Listed Pincodes
              </p>
            </CardContent>
          </Card>

          {/* Coverage */}
          <Card className="col-span-1 shadow-lg rounded-lg border-t-4 border-t-green-500 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium">
                Coverage
              </CardTitle>
              <div className={badgeVariants({ variant: "outline" })}>
                <span className={metricDeltas?.coverage && metricDeltas.coverage > 0 ? "text-green-500" : metricDeltas?.coverage && metricDeltas.coverage < 0 ? "text-destructive" : ""}>
                  {metricDeltas?.coverage && metricDeltas.coverage > 0 ? "+" : ""}{metricDeltas?.coverage || 0}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mt-2">
                {latestMetrics?.coverage || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Availability % × Penetration %
              </p>
            </CardContent>
          </Card>

          {/* Discount */}
          <Card className="col-span-1 shadow-lg rounded-lg border-t-4 border-t-purple-500 hover:shadow-xl transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-md font-medium">
                Avg. Discount
              </CardTitle>
              <div className={badgeVariants({ variant: "outline" })}>
                <span className={metricDeltas?.discount && metricDeltas.discount > 0 ? "text-green-500" : metricDeltas?.discount && metricDeltas.discount < 0 ? "text-destructive" : ""}>
                  {metricDeltas?.discount && metricDeltas.discount > 0 ? "+" : ""}{metricDeltas?.discount || 0}%
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mt-2">
                {latestMetrics?.discount || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Average discount across all products
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Graph 4: Multi-line chart — Coverage % by platform vs. Date */}
        <Card className="col-span-3 card-hover">
          <CardHeader>
            <CardTitle>Coverage Over Time by Platform</CardTitle>
            <CardDescription>
              Comparing coverage trends across platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px]">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              coverageByPlatformData.length > 0 ? (
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsLineChart
                      data={coverageByPlatformData}
                      margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
                    >
                      <XAxis 
                        dataKey="date" 
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                      />
                      <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}%`}
                      />
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <Tooltip 
                        formatter={(value: number) => [`${value}%`, 'Coverage']}
                        labelStyle={{ color: "#020817" }} 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          borderColor: "hsl(var(--border))" 
                        }}
                        cursor={{ stroke: '#888888', strokeWidth: 1 }}
                      />
                      <Legend />
                      
                      {/* Generate one line per platform */}
                      {platformNames.map((platform, index) => {
                        // Use consistent colors for each platform
                        const color = PLATFORM_COLORS[index % PLATFORM_COLORS.length];
                        return (
                          <Line
                            key={platform}
                            type="monotone"
                            dataKey={platform}
                            name={platform}
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            activeDot={{ r: 4, stroke: color, strokeWidth: 1 }}
                          />
                        );
                      })}
                    </RechartsLineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="flex h-[300px] w-full items-center justify-center">
                  <p className="text-muted-foreground">No coverage data available</p>
                </div>
              )
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}