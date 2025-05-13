"use client"

import { useState } from "react"
import { FilterBar } from "@/components/filters/filter-bar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { DataTable } from "@/components/data-table"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowUpDown, ChevronRight, ChevronDown, Map } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/components/data-provider"
import { Skeleton } from "@/components/ui/skeleton"
import { ChoroplethMap } from "@/components/choropleth-map"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
      return <span className="font-medium">{row.getValue("city")}</span>
    }
  },
  {
    accessorKey: "pincodeCount",
    header: "Pincodes",
    cell: ({ row }) => {
      const count = row.getValue("pincodeCount") as number
      return <span>{count}</span>
    },
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
  },
  {
    accessorKey: "area",
    header: "Area",
    cell: ({ row }) => {
      const area = row.getValue("area") as string
      return area ? area : "-"
    },
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
    accessorKey: "stockOutPercent",
    header: ({ column }) => (
      <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
        Stock-out %
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </Button>
    ),
    cell: ({ row }) => {
      const value = row.getValue("stockOutPercent") as number
      return (
        <Badge
          variant="outline"
          className={`${
            value < 10
              ? "badge-change-positive"
              : value < 20
                ? "badge-change-neutral"
                : "badge-change-negative"
          } font-medium`}
        >
          {value}%
        </Badge>
      )
    },
  },
];

export default function RegionalAnalysisPage() {
  const { 
    isLoading, 
    regionalData, 
    choroplethData, 
    cityRegionalData, 
    cityChoroplethData, 
    coverageChoroplethData, 
    penetrationChoroplethData, 
    filteredData 
  } = useData()
  const [selectedCity, setSelectedCity] = useState<string | null>(null)
  const [viewType, setViewType] = useState<"city" | "pincode">("city")
  const [heatmapType, setHeatmapType] = useState<"availability" | "coverage" | "penetration">("availability")

  // Filter pincode data by selected city
  const filteredPincodeData = selectedCity 
    ? regionalData.filter(item => item.city.toLowerCase() === selectedCity.toLowerCase())
    : regionalData;

  // Get the appropriate choropleth data based on the selected metric
  const getActiveHeatmapData = () => {
    if (viewType === "pincode") {
      return choroplethData;
    }
    
    // Choose the correct dataset based on the metric type
    switch (heatmapType) {
      case "coverage":
        return coverageChoroplethData;
      case "penetration":
        return penetrationChoroplethData;
      default:
        return cityChoroplethData;
    }
  };

  // Calculate coverage and penetration for cities using actual data
  const enhancedCityData = !isLoading ? cityRegionalData.map(city => {
    // Calculate serviceable and listed pincodes for this city
    const cityData = filteredData.filter(item => item.city.toLowerCase() === city.city.toLowerCase());
    
    // Get all unique pincodes for this city
    const serviceablePincodes = new Set(cityData.map(item => item.pincode));
    
    // Get pincodes where products are listed
    const listedPincodes = new Set();
    cityData.forEach(item => {
      if (item.platform) {
        listedPincodes.add(item.pincode);
      }
    });
    
    // Get pincodes where products are available
    const availablePincodes = new Set();
    cityData.forEach(item => {
      if (item.stockAvailable) {
        availablePincodes.add(item.pincode);
      }
    });
    
    // Calculate penetration = Listed / Serviceable
    const penetration = serviceablePincodes.size > 0 ? 
      (listedPincodes.size / serviceablePincodes.size) * 100 : 0;
    
    // Calculate availability = Available / Listed (we already have this from the city data)
    const availability = city.stockAvailability;
    
    // Calculate coverage = Penetration * Availability / 100
    const coverage = (penetration * availability) / 100;
    
    return {
      ...city,
      coverage: parseFloat(coverage.toFixed(1)),
      penetration: parseFloat(penetration.toFixed(1))
    };
  }) : [];

  // Calculate coverage and penetration for pincodes using actual data
  const enhancedPincodeData = !isLoading ? filteredPincodeData.map(pincode => {
    // Isolate data for this specific pincode
    const pincodeData = filteredData.filter(item => item.pincode === pincode.pincode);
    
    // All items with this pincode are considered serviceable
    const serviceableCount = pincodeData.length;
    
    // Count items that are listed on any platform
    const listedCount = pincodeData.filter(item => item.platform).length;
    
    // Calculate penetration = Listed / Serviceable
    const penetration = serviceableCount > 0 ?
      (listedCount / serviceableCount) * 100 : 0;
    
    // We already have availability from the pincode data
    const availability = pincode.stockAvailability;
    
    // Calculate coverage = Penetration * Availability / 100
    const coverage = (penetration * availability) / 100;
    
    return {
      ...pincode,
      coverage: parseFloat(coverage.toFixed(1)),
      penetration: parseFloat(penetration.toFixed(1))
    };
  }) : [];

  const handleCityRowClick = (city: string) => {
    setSelectedCity(city);
    setViewType("pincode");
  };

  const handleBackToCity = () => {
    setSelectedCity(null);
    setViewType("city");
  };

  return (
    <div className="space-y-8">
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

        <TabsContent value="map">
          <div className="grid gap-8">
            <Card className="card-hover">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="text-xl dashboard-text">
                      {viewType === "city" ? "City-wise Heatmap" : `Pincode Heatmap: ${selectedCity}`}
                    </CardTitle>
                    <CardDescription>
                      {viewType === "city" 
                        ? "Geographical distribution across cities" 
                        : "Detailed pincode view for the selected city"}
                    </CardDescription>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant={heatmapType === "availability" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setHeatmapType("availability")}
                    >
                      Availability
                    </Button>
                    <Button 
                      variant={heatmapType === "coverage" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setHeatmapType("coverage")}
                    >
                      Coverage
                    </Button>
                    <Button 
                      variant={heatmapType === "penetration" ? "default" : "outline"} 
                      size="sm"
                      onClick={() => setHeatmapType("penetration")}
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
                  viewType === "city" ? (
                    <ChoroplethMap data={getActiveHeatmapData()} height={450} heatmapType={heatmapType} />
                  ) : (
                    <>
                      <div className="mb-4">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={handleBackToCity} 
                          className="flex items-center gap-1"
                        >
                          <ChevronDown className="h-4 w-4" />
                          Back to Cities
                        </Button>
                      </div>
                      <ChoroplethMap data={choroplethData} height={450} heatmapType={heatmapType} />
                    </>
                  )
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="table">
          <Card className="card-hover">
            <CardHeader className="pb-3">
              <CardTitle className="text-xl dashboard-text flex items-center justify-between">
                <span>
                  {viewType === "city" 
                    ? "Cities by Stock-out Percentage" 
                    : `Pincodes in ${selectedCity}`}
                </span>
                {viewType === "pincode" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleBackToCity} 
                    className="flex items-center gap-1"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Back to Cities
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                {viewType === "city"
                  ? "Click on a city to view its pincodes"
                  : "Pincode-level availability for the selected city"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[500px]">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : viewType === "city" ? (
                <DataTable
                  columns={cityColumns}
                  data={enhancedCityData}
                  searchKey="city"
                  searchPlaceholder="Search by city..."
                  onRowClick={(row) => handleCityRowClick(row.city)}
                />
              ) : (
                <DataTable
                  columns={pincodeColumns}
                  data={enhancedPincodeData}
                  searchKey="pincode"
                  searchPlaceholder="Search by pincode..."
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
