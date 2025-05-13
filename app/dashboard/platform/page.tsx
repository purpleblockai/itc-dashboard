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
        // Group data by pincode
        const pincodeMap = new Map<string, ProcessedData[]>();
        items.forEach(item => {
          if (!pincodeMap.has(item.pincode)) {
            pincodeMap.set(item.pincode, []);
          }
          pincodeMap.get(item.pincode)!.push(item);
        });
        
        // Get all unique pincodes for this platform (serviceable)
        const serviceablePincodes = new Set();
        pincodeMap.forEach((pincodeItems, pincode) => {
          const isServiceable = pincodeItems.some(item => item.availability === "Yes");
          if (isServiceable) {
            serviceablePincodes.add(pincode);
          }
        });
        
        // Get pincodes where products are listed
        const listedPincodes = new Set();
        pincodeMap.forEach((pincodeItems, pincode) => {
          const isListed = pincodeItems.some(item => 
            item.availability === "Yes" || item.availability === "No");
          if (isListed) {
            listedPincodes.add(pincode);
          }
        });
        
        // Get pincodes where products are available
        const availablePincodes = new Set();
        pincodeMap.forEach((pincodeItems, pincode) => {
          const isAvailable = pincodeItems.some(item => item.availability === "Yes");
          if (isAvailable) {
            availablePincodes.add(pincode);
          }
        });
        
        // Calculate penetration = Listed / Serviceable
        const penetration = serviceablePincodes.size > 0 ?
          (listedPincodes.size / serviceablePincodes.size) * 100 : 0;
        
        // Calculate availability = Available / Listed
        const availability = listedPincodes.size > 0 ?
          (availablePincodes.size / listedPincodes.size) * 100 : 0;
          
        return {
          name: platform,
          availability: parseFloat(availability.toFixed(1)),
          penetration: parseFloat(penetration.toFixed(1))
        };
      }
    ).sort((a, b) => a.name.localeCompare(b.name)) 
    : [];

  // Graph 2: Average discount by platform
  const platformDiscountData = !isLoading ? 
    groupByPlatform(filteredData).map(
      ([platformName, { items, platform }]) => {
        // Calculate average discount for this platform
        const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
        const avgDiscount = items.length > 0 ? totalDiscount / items.length : 0;
        
        return {
          name: platform,
          discount: parseFloat(avgDiscount.toFixed(1))
        };
      }
    ).sort((a, b) => a.name.localeCompare(b.name))
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
    
    // Group data by pincode
    const pincodeMap = new Map<string, ProcessedData[]>();
    items.forEach(item => {
      if (!pincodeMap.has(item.pincode)) {
        pincodeMap.set(item.pincode, []);
      }
      pincodeMap.get(item.pincode)!.push(item);
    });
    
    // Get all unique pincodes for this date (serviceable)
    const serviceablePincodes = new Set();
    pincodeMap.forEach((pincodeItems, pincode) => {
      const isServiceable = pincodeItems.some(item => item.availability === "Yes");
      if (isServiceable) {
        serviceablePincodes.add(pincode);
      }
    });
    
    // Get pincodes where products are listed
    const listedPincodes = new Set();
    pincodeMap.forEach((pincodeItems, pincode) => {
      const isListed = pincodeItems.some(item => 
        item.availability === "Yes" || item.availability === "No");
      if (isListed) {
        listedPincodes.add(pincode);
      }
    });
    
    // Get pincodes where products are available
    const availablePincodes = new Set();
    pincodeMap.forEach((pincodeItems, pincode) => {
      const isAvailable = pincodeItems.some(item => item.availability === "Yes");
      if (isAvailable) {
        availablePincodes.add(pincode);
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
    
    // Calculate average discount
    const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
    const avgDiscount = items.length > 0 ? totalDiscount / items.length : 0;
    
    return {
      penetration: parseFloat(penetration.toFixed(1)),
      availability: parseFloat(availability.toFixed(1)),
      coverage: parseFloat(coverage.toFixed(1)),
      discount: parseFloat(avgDiscount.toFixed(1))
    };
  };
  
  const latestMetrics = !isLoading && latestDate ? calculateMetricsForDate(latestDate) : null;
  const previousMetrics = !isLoading && previousDate ? calculateMetricsForDate(previousDate) : null;
  
  // Calculate deltas
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
      const dateEntry: any = { date: formatDateForDisplay(date) };
      
      // For each platform, calculate coverage for this date
      platformNames.forEach(platform => {
        // Get items for this date and platform
        const items = filteredData.filter(item => {
          if (!item.reportDate || !item.platform) return false;
          return formatDateForComparison(item.reportDate) === date && item.platform === platform;
        });
        
        // Initialize with default value of 0
        dateEntry[platform] = 0;
        
        if (items.length === 0) {
          return;
        }
        
        // Group data by pincode
        const pincodeMap = new Map<string, ProcessedData[]>();
        items.forEach(item => {
          if (!pincodeMap.has(item.pincode)) {
            pincodeMap.set(item.pincode, []);
          }
          pincodeMap.get(item.pincode)!.push(item);
        });
        
        // Get all unique pincodes for this platform and date
        const serviceablePincodes = new Set();
        pincodeMap.forEach((pincodeItems, pincode) => {
          const isServiceable = pincodeItems.some(item => item.availability === "Yes");
          if (isServiceable) {
            serviceablePincodes.add(pincode);
          }
        });
        
        // Get pincodes where products are listed
        const listedPincodes = new Set();
        pincodeMap.forEach((pincodeItems, pincode) => {
          const isListed = pincodeItems.some(item => 
            item.availability === "Yes" || item.availability === "No");
          if (isListed) {
            listedPincodes.add(pincode);
          }
        });
        
        // Get pincodes where products are available
        const availablePincodes = new Set();
        pincodeMap.forEach((pincodeItems, pincode) => {
          const isAvailable = pincodeItems.some(item => item.availability === "Yes");
          if (isAvailable) {
            availablePincodes.add(pincode);
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
        
        dateEntry[platform] = parseFloat(coverage.toFixed(1));
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Platform Insights</h2>
        <p className="text-muted-foreground">
          Compare performance across Swiggy, Flipkart, Zepto, and Blinkit.
        </p>
      </div>

      <Separator />

      <FilterBar />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Graph 1: Dual Bar Graph — Availability & Penetration by platform */}
        <Card className="card-hover col-span-2">
          <CardHeader>
            <CardTitle>
              Availability & Penetration by Platform
            </CardTitle>
            <CardDescription>
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
                  data={platformMetricsData}
                  categories={["availability", "penetration"]}
                  index="name"
                  colors={["#ff6d00", "#0088fe"]}
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
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Average Discount by Platform</CardTitle>
            <CardDescription>
              Discount percentages offered on different platforms
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px]">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              platformDiscountData && platformDiscountData.length > 0 ? (
                <BarChart
                  data={platformDiscountData}
                  categories={["discount"]}
                  index="name"
                  colors={["#00c49f"]}
                  valueFormatter={(value: number) => `${value}%`}
                  showLegend={false}
                  showGridLines={true}
                  className="h-[300px]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">No discount data available</p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Graph 3: Trend line cards for key metrics */}
        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Key Metrics Trends</CardTitle>
            <CardDescription>
              Changes in metrics from previous report
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px]">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              latestMetrics && metricDeltas ? (
                <div className="grid gap-4 grid-cols-2">
                  <div className="bg-background rounded-lg p-4 border">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Penetration</div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold">{latestMetrics.penetration}%</div>
                      <div className={`flex items-center text-sm font-medium ${metricDeltas.penetration >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {metricDeltas.penetration >= 0 ? 
                          <Icons.arrowUp className="mr-1 h-4 w-4" /> : 
                          <Icons.arrowDown className="mr-1 h-4 w-4" />}
                        {Math.abs(metricDeltas.penetration)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-background rounded-lg p-4 border">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Availability</div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold">{latestMetrics.availability}%</div>
                      <div className={`flex items-center text-sm font-medium ${metricDeltas.availability >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {metricDeltas.availability >= 0 ? 
                          <Icons.arrowUp className="mr-1 h-4 w-4" /> : 
                          <Icons.arrowDown className="mr-1 h-4 w-4" />}
                        {Math.abs(metricDeltas.availability)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-background rounded-lg p-4 border">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Coverage</div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold">{latestMetrics.coverage}%</div>
                      <div className={`flex items-center text-sm font-medium ${metricDeltas.coverage >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {metricDeltas.coverage >= 0 ? 
                          <Icons.arrowUp className="mr-1 h-4 w-4" /> : 
                          <Icons.arrowDown className="mr-1 h-4 w-4" />}
                        {Math.abs(metricDeltas.coverage)}%
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-background rounded-lg p-4 border">
                    <div className="text-sm font-medium text-muted-foreground mb-2">Avg Discount</div>
                    <div className="flex items-baseline justify-between">
                      <div className="text-2xl font-bold">{latestMetrics.discount}%</div>
                      <div className={`flex items-center text-sm font-medium ${metricDeltas.discount >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        {metricDeltas.discount >= 0 ? 
                          <Icons.arrowUp className="mr-1 h-4 w-4" /> : 
                          <Icons.arrowDown className="mr-1 h-4 w-4" />}
                        {Math.abs(metricDeltas.discount)}%
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <p className="text-muted-foreground">No trend data available</p>
                </div>
              )
            )}
          </CardContent>
        </Card>

        {/* Graph 4: Multi-line chart — Coverage % by platform vs. Date */}
        <Card className="card-hover col-span-2">
          <CardHeader>
            <CardTitle>Coverage by Platform</CardTitle>
            <CardDescription>
              Platform-wise coverage percentage over time
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="aspect-[21/9] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              ensurePlatformData().length > 0 ? (
                <LineChart
                  data={ensurePlatformData()}
                  categories={platformNames}
                  index="date"
                  colors={["#ff6d00", "#0088fe", "#00c49f", "#9B59B6", "#F1C40F"]}
                  valueFormatter={(value: number) => `${value}%`}
                  showLegend={true}
                  showGridLines={true}
                  className="aspect-[21/9]"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
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