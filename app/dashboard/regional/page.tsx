// @ts-nocheck
"use client"

import { useState, useMemo, useEffect, useRef } from "react"
import { FilterBar } from "@/components/filters/filter-bar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, ChevronRight, ChevronDown, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/components/data-provider"
import { useFilters } from "@/components/filters/filter-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { ChoroplethMap } from "@/components/choropleth-map"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { calculateKPIs } from "@/lib/data-service"
import "@/styles/table-styles.css"
import type { ProcessedData } from "@/lib/data-service"
import { getRegionalData, fetchRawData, getChoroplethData } from "@/lib/data-service"
import { parseISO, format } from 'date-fns'

// Define columns for the city data table
const cityColumns: ColumnDef<{
  city: string
  stockAvailability: number
  stockOutPercent: number
  pincodeCount: number
  coverage?: number
  penetration?: number
}>[] = [
  {
    accessorKey: "city",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        City
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const city = row.getValue("city") as string;
      return <span className="font-medium" style={{textTransform: 'capitalize'}}>{city}</span>
    }
  },
  {
    accessorKey: "coverage",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Coverage %
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("coverage") as number || 0
      return (
        <div className="flex items-center">
          <div
            className="mr-2 h-3 w-20 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full ${value > 90 ? "bg-green-500" : value > 80 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="font-medium">{value}%</span>
        </div>
      )
    },
  },
  {
    accessorKey: "penetration",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Penetration %
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("penetration") as number || 0
      return (
        <div className="flex items-center">
          <div
            className="mr-2 h-3 w-20 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full ${value > 90 ? "bg-green-500" : value > 80 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="font-medium">{value}%</span>
        </div>
      )
    },
  },
  {
    accessorKey: "stockAvailability",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Availability %
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("stockAvailability") as number
      return (
        <div className="flex items-center">
          <div
            className="mr-2 h-3 w-20 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full ${value > 90 ? "bg-green-500" : value > 80 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="font-medium">{value}%</span>
        </div>
      )
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      return (
        <Button variant="ghost" size="sm" className="px-2">
          <ChevronRight className="h-4 w-4" />
        </Button>
      )
    },
  },
];

// Define columns for the pincode data table
const pincodeColumns: ColumnDef<{
  pincode: string
  city: string
  area?: string
  stockAvailability: number
  stockOutPercent: number
  coverage?: number
  penetration?: number
}>[] = [
  {
    accessorKey: "pincode",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Pincode
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      return <span className="font-medium">{row.getValue("pincode")}</span>
    }
  },
  {
    accessorKey: "city",
    header: "City",
    cell: ({ row }) => {
      const city = row.getValue("city") as string;
      return <span style={{textTransform: 'capitalize'}}>{city}</span>
    }
  },
  {
    accessorKey: "coverage",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Coverage %
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("coverage") as number || 0
      return (
        <div className="flex items-center">
          <div
            className="mr-2 h-3 w-20 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full ${value > 90 ? "bg-green-500" : value > 80 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="font-medium">{value}%</span>
        </div>
      )
    },
  },
  {
    accessorKey: "penetration",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Penetration %
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("penetration") as number || 0
      return (
        <div className="flex items-center">
          <div
            className="mr-2 h-3 w-20 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full ${value > 90 ? "bg-green-500" : value > 80 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="font-medium">{value}%</span>
        </div>
      )
    },
  },
  {
    accessorKey: "stockAvailability",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Availability %
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("stockAvailability") as number
      return (
        <div className="flex items-center">
          <div
            className="mr-2 h-3 w-20 rounded-full bg-muted overflow-hidden"
            role="progressbar"
            aria-valuenow={value}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className={`h-full ${value > 90 ? "bg-green-500" : value > 80 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${value}%` }}
            />
          </div>
          <span className="font-medium">{value}%</span>
        </div>
      )
    },
  },
];

export default function RegionalAnalysisPage() {
  const { 
    isLoading, 
    regionalData,
    normalizedSummaryData,
    choroplethData, 
    cityRegionalData, 
    filteredData,
    pauseSummary,
    setPauseSummary,
  } = useData()
  const { setFilters, filters } = useFilters()
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [viewType, setViewType] = useState<"city" | "pincode">("city")
  const [heatmapType, setHeatmapType] = useState<"availability" | "coverage" | "penetration">("availability")
  // Key to force re-render of heatmap when needed
  const [mapKey, setMapKey] = useState<number>(0)
  
  // State for city-specific raw data
  const [cityRawData, setCityRawData] = useState<ProcessedData[]>([])
  const [isFetchingCityData, setIsFetchingCityData] = useState<boolean>(false)
  const [cityDataError, setCityDataError] = useState<string | null>(null)

  // Handle filter resets - reset only when filters transition from applied to cleared
  const hasInitializedRef = useRef(false);
  const prevNoFiltersRef = useRef(false);
  useEffect(() => {
    const noFiltersApplied =
      filters.brand.length === 0 &&
      filters.company.length === 0 &&
      filters.product.length === 0 &&
      filters.city.length === 0 &&
      filters.platform.length === 0 &&
      !filters.pincode &&
      !filters.dateRange.from;

    if (!hasInitializedRef.current) {
      // On initial mount, just record state
      hasInitializedRef.current = true;
    } else {
      // Detect genuine reset: filters went from some applied to none applied
      if (!prevNoFiltersRef.current && noFiltersApplied && selectedCity && viewType === "pincode") {
        setSelectedCity(null);
        setViewType("city");
        setMapKey(prevKey => prevKey + 1);
        // Clear city raw data and errors
        setCityRawData([]);
        setCityDataError(null);
      }
    }

    // Record current filters empty state for next run
    prevNoFiltersRef.current = noFiltersApplied;
  }, [filters, selectedCity, viewType]);

  // Re-fetch city raw data when filters change and a city is selected
  useEffect(() => {
    if (selectedCity) {
      // Re-fetch raw data with updated filters for the selected city
      fetchCityRawData(selectedCity);
    }
  }, [
    selectedCity,
    filters.brand.join(','),
    filters.company.join(','),
    filters.product.join(','),
    filters.platform.join(','),
    filters.pincode,
    filters.dateRange.from?.getTime(),
    filters.dateRange.to?.getTime(),
  ]);

  // Function to fetch raw data for a specific city
  const fetchCityRawData = async (cityName: string) => {
    setIsFetchingCityData(true);
    setCityDataError(null);
    
    try {
      // Build filters for the city
      const cityFilters = {
        city: [cityName],
        // Include other active filters
        ...(filters.brand.length > 0 && { brand: filters.brand }),
        ...(filters.company.length > 0 && { company: filters.company }),
        ...(filters.product.length > 0 && { product: filters.product }),
        ...(filters.platform.length > 0 && { platform: filters.platform }),
        ...(filters.pincode && { pincode: filters.pincode }),
        ...(filters.dateRange.from && { 
          from: format(filters.dateRange.from, 'dd-MM-yyyy'),
          ...(filters.dateRange.to && { to: format(filters.dateRange.to, 'dd-MM-yyyy') })
        }),
      };
      
      const result = await fetchRawData(cityFilters);

      // Transform the raw data to ensure proper date format and data structure
      const transformedData = result.rawData.map(item => ({
        ...item,
        reportDate: typeof item.reportDate === 'string' ? new Date(item.reportDate) : (item.reportDate || new Date()),
        runDate: typeof item.runDate === 'string' ? new Date(item.runDate) : (item.runDate || new Date()),
        // Ensure all required fields are present
        city: (item.city || ""),
        pincode: String(item.pincode || ""),
        availability: item.availability || "Item Not Found",
        mrp: Number(item.mrp) || 0,
        sellingPrice: Number(item.sellingPrice) || 0,
        discount: Number(item.discount) || 0,
        isListed: Boolean(item.isListed),
        stockAvailable: Boolean(item.stockAvailable)
      }));
      

      
      setCityRawData(transformedData);
    } catch (error) {
      console.error('Error fetching city raw data:', error);
      setCityDataError(error instanceof Error ? error.message : 'Failed to fetch city data');
      setCityRawData([]);
    } finally {
      setIsFetchingCityData(false);
    }
  };

  // Prepare enhanced pincode-level summary table data (using city raw data)
  const enhancedPincodeData = useMemo(() => {
    // Only compute after raw data fetched and if in pincode view
    if (isLoading || isFetchingCityData || !selectedCity) return [];

    // Only raw data for the selected city
    const itemsByPincode = new Map<string, ProcessedData[]>();
    cityRawData.forEach(item => {
      if (!item.pincode) return;
      const key = item.pincode;
      if (!itemsByPincode.has(key)) itemsByPincode.set(key, []);
      itemsByPincode.get(key)!.push(item);
    });
    // Compute metrics per pincode
    const result = Array.from(itemsByPincode.entries()).map(([pincode, items]) => {
      const total = items.length;
      const listed = items.filter(i => i.availability === "Yes" || i.availability === "No").length;
      const available = items.filter(i => i.availability === "Yes").length;
      const penetration = total > 0 ? (listed / total) * 100 : 0;
      const availability = listed > 0 ? (available / listed) * 100 : 0;
      const coverage = total > 0 ? (available / total) * 100 : 0;
      return {
        pincode,
        city: selectedCity,
        coverage: parseFloat(coverage.toFixed(1)),
        penetration: parseFloat(penetration.toFixed(1)),
        stockAvailability: parseFloat(availability.toFixed(1)),
      };
    });
    return result;
  }, [cityRawData, selectedCity, isFetchingCityData, isLoading]);

  // Filter pincode data by selected city
  const filteredPincodeData = selectedCity 
    ? regionalData.filter(item => (item.city || "").toLowerCase() === (selectedCity || "").toLowerCase())
    : regionalData;

  // Get the appropriate choropleth data based on the selected metric
  const getActiveHeatmapData = () => {


    // City-level summary view
    if (viewType === "city") {
      // Always try cityRegionalData first since it's computed from summaryData
      if (cityRegionalData && cityRegionalData.length > 0) {
        let result;
      if (heatmapType === "availability") {
          result = cityRegionalData
            .filter(city => city && city.city) // Filter out undefined or invalid entries
            .map((city) => ({
              id: city.city.toLowerCase(),
              city: city.city,
              value: city.stockAvailability || 0,
            }));
        } else if (heatmapType === "coverage") {
          result = cityRegionalData
            .filter(city => city && city.city) // Filter out undefined or invalid entries
            .map((city) => ({
              id: city.city.toLowerCase(),
              city: city.city,
              value: city.coverage || 0,
            }));
        } else { // penetration
          result = cityRegionalData
            .filter(city => city && city.city) // Filter out undefined or invalid entries
            .map((city) => ({
              id: city.city.toLowerCase(),
              city: city.city,
              value: city.penetration || 0,
            }));
        }

        // Sort alphabetically by city name
        return result.sort((a, b) => a.city.localeCompare(b.city));
      }
      
      // Fallback to regionalData grouped by city (only for availability)
      if (heatmapType === "availability" && regionalData && regionalData.length > 0) {
        const cityMap = new Map<string, { totalAvailability: number; count: number }>();
        regionalData
          .filter(item => item && item.city) // Filter out undefined entries
          .forEach(item => {
            const city = (item.city || "").toLowerCase();
            if (city) {
              const entry = cityMap.get(city) || { totalAvailability: 0, count: 0 };
              entry.totalAvailability += item.stockAvailability || 0;
              entry.count += 1;
              cityMap.set(city, entry);
            }
          });
        const result = Array.from(cityMap.entries())
          .filter(([cityId]) => cityId) // Filter out empty city names
          .map(([cityId, { totalAvailability, count }]) => ({
            id: cityId,
            city: cityId,
            value: count > 0 ? Math.round(totalAvailability / count) : 0,
          }));

        // Sort alphabetically by city name
        return result.sort((a, b) => a.city.localeCompare(b.city));
      }
    }

    // Pincode-level view: filter detailed raw data choropleth
    if (viewType === "pincode") {
      // Pincode-level heatmap using city-specific raw data
      const rawForCity = cityRawData || [];
      if (rawForCity.length > 0) {
        if (heatmapType === "availability") {
          // Sort by pincode numeric
          return getChoroplethData(rawForCity).sort((a, b) => parseInt(a.id) - parseInt(b.id));
        }
        // For coverage or penetration, map enhanced pincode metrics (omit city so labels show pincode)
        return enhancedPincodeData
          .map(p => ({ id: p.pincode, value: heatmapType === "coverage" ? p.coverage || 0 : p.penetration || 0 }))
          .sort((a, b) => parseInt(a.id) - parseInt(b.id));
      }
      // No city raw data: show empty
      return [];
    }
    

    return [];
  };

  // Prepare enhanced city-level summary table data
  const enhancedCityData = useMemo(() => {

    
    if (isLoading) return [];
    
    // If we have cityRegionalData, use it directly (it now includes calculated metrics)
    if (cityRegionalData?.length > 0) {
      const result = cityRegionalData
        .filter(city => city && city.city) // Filter out undefined or invalid entries
        .map(city => ({
          city: city.city,
          stockAvailability: city.stockAvailability || 0,
          stockOutPercent: city.stockOutPercent || 0,
          pincodeCount: city.pincodeCount || 0,
          pincodes: city.pincodes || [],
          coverage: city.coverage || 0,
          penetration: city.penetration || 0,
        }));

      return result;
    }
    

    return [];
  }, [isLoading, cityRegionalData, filters]);

  const handleCityRowClick = (city: string) => {
    setSelectedCity(city);
    // Don't update global filters - we only want to fetch raw data locally
    // setFilters({ city: [city] }); // Removed this line
    
    setViewType("pincode");
    // Reset map to clear any selections when switching views
    setMapKey(prevKey => prevKey + 1);
    // Fetch raw data for the selected city
    fetchCityRawData(city);
  };

  const handleBackToCity = () => {
    setSelectedCity(null);
    // Don't update global filters since we're not setting them for city selection
    // setFilters({ city: [] }); // Removed this line
    setViewType("city");
    // Reset map to clear any selections when switching views
    setMapKey(prevKey => prevKey + 1);
    // Clear city raw data
    setCityRawData([]);
    setCityDataError(null);
  };

  // Handle changes to the heatmap type
  const handleHeatmapTypeChange = (type: "availability" | "coverage" | "penetration") => {
    setHeatmapType(type);
    // Reset map to clear any selections when changing heatmap type
    setMapKey(prevKey => prevKey + 1);
  };

  // Pause or resume summary fetch based on current view
  useEffect(() => {
    setPauseSummary(viewType === "pincode");
  }, [viewType, setPauseSummary]);

  return (
    <div className="space-y-8">
      {/* Debug current state */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{ position: 'fixed', top: '10px', right: '10px', background: 'black', color: 'white', padding: '10px', zIndex: 9999, fontSize: '12px' }}>
          <div>View: {viewType}</div>
          <div>City: {selectedCity || 'None'}</div>
          <div>Raw Data: {cityRawData.length}</div>
          <div>Pincode Data: {enhancedPincodeData.length}</div>
        </div>
      )}
      
      <div>
        <h2 className="text-3xl font-bold tracking-tight high-contrast">Regional Analysis</h2>
        <p className="text-muted-foreground">Analyze stock availability and stock-outs by city and pincode regions.</p>
      </div>

      <Separator />

      <FilterBar />

      <Tabs defaultValue="map" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="map">Heatmap View</TabsTrigger>
          <TabsTrigger value="table">Table View</TabsTrigger>
        </TabsList>

        {/* Heatmap View */}
        <TabsContent value="map">
          <div className="grid gap-8">
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl dashboard-text">
                      {viewType === 'city' ? 'City-Wise Heatmap' : `Pincode Heatmap - ${selectedCity}`}
                    </CardTitle>
                    <CardDescription>
                      {viewType === 'city'
                        ? 'Geographical distribution across cities'
                        : `Geographical distribution across pincodes for ${selectedCity}`}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2 items-center">
                    {viewType === 'pincode' && (
                      <Button variant="outline" size="sm" onClick={handleBackToCity} className="flex items-center gap-2">
                        <ArrowLeft className="h-4 w-4" /> Back to Cities
                      </Button>
                    )}
                    <Button 
                      variant={heatmapType === "coverage" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => handleHeatmapTypeChange("coverage")}
                    >
                      Coverage
                    </Button>
                    <Button 
                      variant={heatmapType === "availability" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => handleHeatmapTypeChange("availability")}
                    >
                      Availability
                    </Button>
                    <Button 
                      variant={heatmapType === "penetration" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => handleHeatmapTypeChange("penetration")}
                    >
                      Penetration
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[450px]">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : (
                    <div className="h-[450px]">
                    {(() => {
                      // Show loading while fetching city-specific raw data for pincode view
                      if (viewType === 'pincode' && isFetchingCityData) {
                        return (
                          <div className="h-full flex items-center justify-center">
                            <Skeleton className="h-full w-full" />
                          </div>
                        );
                      }
                      const heatmapData = getActiveHeatmapData();
                      const filteredData = heatmapData.filter(item => item && item.id && typeof item.value === 'number');

                      
                      if (filteredData.length === 0) {
                        return (
                          <div className="h-full flex items-center justify-center">
                            <p className="text-muted-foreground">No heatmap data available</p>
                          </div>
                        );
                      }
                      
                      return (
                      <ChoroplethMap 
                      key={`${viewType}-map-${mapKey}`} 
                          data={filteredData} 
                        height={450} 
                        heatmapType={heatmapType}
                      onCellClick={(id) => {
                        // drill into pincode on map click
                        if (viewType === "city") {
                              const cityData = cityRegionalData?.find(c => c?.city?.toLowerCase() === id.toLowerCase());
                          if (cityData?.city) handleCityRowClick(cityData.city);
                          }
                        }}
                      />
                      );
                    })()}
                    </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Table View */}
        <TabsContent value="table">
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="text-xl dashboard-text">
                    {viewType === 'city' ? 'City-wise Analysis' : `Pincode Analysis - ${selectedCity}`}
                    {isFetchingCityData && (
                      <span className="ml-2 text-sm text-muted-foreground">(Loading...)</span>
                    )}
                  </CardTitle>
                  <CardDescription>
                    {viewType === 'city' 
                      ? 'Click on any city to view pincode-level details' 
                      : selectedCity && cityRawData.length > 0 
                        ? `Showing ${enhancedPincodeData.length} pincodes with ${cityRawData.length} data points from database`
                        : 'Detailed analysis by pincode for selected city'}
                  </CardDescription>
                </div>
                {viewType === 'pincode' && (
                  <Button 
                    variant="outline" 
                    onClick={handleBackToCity}
                    className="flex items-center gap-2"
                  >
                                         <ArrowLeft className="h-4 w-4" />
                    Back to Cities
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[400px] flex items-center justify-center">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : (
                <>
          {/* City-level summary table */}
          {viewType === 'city' ? (
            enhancedCityData.length === 0 ? (
                  <div className="h-[300px] flex items-center justify-center">
                        <p className="text-muted-foreground text-center">
                          No data available for the selected filters. Try adjusting your date range or filters.
                        </p>
                  </div>
                ) : (
                  <DataTable
                    columns={cityColumns}
                data={enhancedCityData}
                    searchKey="city"
                    searchPlaceholder="Search by city..."
                    onRowClick={(row) => handleCityRowClick(row.city)}
                  />
                )
              ) : (
            /* Pincode-level summary table */
                    (() => {

                      
                      if (isFetchingCityData) {
                        return (
                          <div className="h-[300px] flex items-center justify-center">
                            <div className="flex flex-col items-center gap-2">
                              <Skeleton className="h-8 w-32" />
                              <p className="text-muted-foreground text-sm">Loading pincode data for {selectedCity}...</p>
                            </div>
                          </div>
                        );
                      }
                      
                      if (cityDataError) {
                        return (
                          <div className="h-[300px] flex items-center justify-center">
                            <div className="text-center">
                              <p className="text-red-500 mb-2">Error loading data for {selectedCity}</p>
                              <p className="text-muted-foreground text-sm mb-4">{cityDataError}</p>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => selectedCity && fetchCityRawData(selectedCity)}
                              >
                                Retry
                              </Button>
                            </div>
                          </div>
                        );
                      }
                      
                      if (enhancedPincodeData.length === 0) {
                        return (
                  <div className="h-[300px] flex items-center justify-center">
                            <p className="text-muted-foreground text-center">
                              No pincode data available for {selectedCity}. Try selecting a different city or adjusting your filters.
                            </p>
                  </div>
                        );
                      }
                      
                      return (
                  <DataTable
                    columns={pincodeColumns}
                data={enhancedPincodeData}
                    searchKey="pincode"
                    searchPlaceholder="Search by pincode..."
                  />
                      );
                    })()
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
