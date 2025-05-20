"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import {
  fetchCompetitionData,
  type ProcessedData,
  calculateKPIs,
  getTimeSeriesData,
  getRegionalData,
  getPlatformData,
  getPlatformShareData,
  getBrandData,
  getProductData,
  getChoroplethData,
  getCityRegionalData,
  getCityChoroplethData,
  getHeatmapDataByType,
} from "@/lib/data-service"
import { useFilters } from "./filters/filter-provider"
import { parseISO } from 'date-fns'

// Define extended user type to include role and clientName
interface ExtendedUser {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role?: string;
  clientName?: string;
}

interface DataContextType {
  isLoading: boolean
  error: Error | null
  rawData: ProcessedData[]
  filteredData: ProcessedData[]
  kpis: {
    skusTracked: number
    avgDiscount: number
    topPlatform: string
    stockOutPercentage: number
    stockOutDelta: number
    avgDiscountDelta: number
    competitorCoverage: number
    totalSKUs: number
    serviceableSKUs: number
    listedSKUs: number
    availableSKUs: number
    notAvailableSKUs?: number
    penetration: number
    availability: number
    coverage: number
    coverageMethod1: number
    coverageMethod2: number
    discount: number
    lowestCoverageRegion: {
      name: string
      value: number
      delta: number
      competitorCoverage: number
    }
    highestAvailabilityDeltaRegion: {
      name: string
      value: number
      delta: number
    }
    highestAvailabilityDeltaFromCompetitors: {
      name: string
      value: number
      competitors: number
      delta: number
    }
  }
  timeSeriesData: { date: string; value: number }[]
  regionalData: {
    city: string
    pincode: string
    stockAvailability: number
    stockOutPercent: number
  }[]
  cityRegionalData: {
    city: string
    stockAvailability: number
    stockOutPercent: number
    pincodeCount: number
    pincodes: string[]
    coverage?: number
    penetration?: number
  }[]
  platformData: {
    name: string
    salesValue: number
    priceChange: number
    discountChange: number
    availabilityChange: number
  }[]
  platformShareData: {
    name: string
    value: number
  }[]
  brandData: {
    name: string
    avgDiscount: number
    availability: number
    penetration?: number
    coverage?: number
    skuCount: number
    products: {
      name: string
      mrp: number
      sellingPrice: number
      availability: number
    }[]
  }[]
  productData: {
    brand: string
    name: string
    mrp: number | null
    sellingPrice: number | null
    availability: number
  }[]
  choroplethData: {
    id: string
    value: number
  }[]
  cityChoroplethData: {
    id: string
    city: string
    value: number
  }[]
  coverageChoroplethData: {
    id: string
    city: string
    value: number
  }[]
  penetrationChoroplethData: {
    id: string
    city: string
    value: number
  }[]
  refreshData: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [rawData, setRawData] = useState<ProcessedData[]>([])
  const { filters } = useFilters()
  const { data: session } = useSession()
  
  // Get user information
  const user = session?.user as ExtendedUser | undefined;
  const isAdmin = user?.role === "admin";
  const userClientName = user?.clientName;

  // const filteredData = rawData

  // Filter data based on selected filters and user's client
  const filteredData = React.useMemo(() => {
    if (!rawData.length) return []

    return rawData.filter((item) => {
      // For non-admin users, filter by their assigned client
      if (!isAdmin && userClientName && item.clientName && item.clientName !== userClientName) {
        return false;
      }
      
      // Filter by brand
      if (filters.brand.length > 0 && !filters.brand.includes(item.brand)) {
        return false
      }

      // Filter by product
      if (filters.product.length > 0 && !filters.product.includes(item.productId)) {
        return false
      }

      // Filter by city
      if (
        filters.city.length > 0 &&
        !filters.city.map((c) => c.toLowerCase()).includes((item.city || "").toLowerCase())
      ) {
        return false
      }

      // Filter by pincode
      if (filters.pincode && item.pincode !== filters.pincode) {
        return false
      }

      // Filter by platform
      if (filters.platform.length > 0 && !filters.platform.includes(item.platform)) {
        return false
      }

      // Filter by selected date or date range
      if (filters.dateRange.from) {
        const itemDate = new Date(item.reportDate);
        const fromDate = new Date(filters.dateRange.from);
        // Normalize fromDate to start of day
        fromDate.setHours(0, 0, 0, 0);
        if (filters.dateRange.to) {
          // Range selected: include up to end of toDate
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (itemDate < fromDate || itemDate > toDate) {
            return false;
          }
        } else {
          // Single date selected: match exact date only
          if (
            itemDate.getFullYear() !== fromDate.getFullYear() ||
            itemDate.getMonth() !== fromDate.getMonth() ||
            itemDate.getDate() !== fromDate.getDate()
          ) {
            return false;
          }
        }
      }

      return true
    })
  }, [rawData, filters, isAdmin, userClientName])

  // Filter data only by client for non-admin users (for key insights)
  const clientFilteredData = React.useMemo(() => {
    if (!rawData.length) return []

    return rawData.filter((item) => {
      // For non-admin users, filter by their assigned client
      if (!isAdmin && userClientName && item.clientName && item.clientName !== userClientName) {
        return false;
      }
      return true
    })
  }, [rawData, isAdmin, userClientName])

  // Calculate KPIs using filtered data for most metrics
  const kpis = React.useMemo(() => {
    console.log("🛠 Active Filters:", filters)
    console.log("🛠 rawData.length:", rawData.length)
    console.log("🛠 filteredData.length:", filteredData.length)
    
    const filteredKpis = calculateKPIs(filteredData);
    
    // If filteredData is empty (e.g., due to date filter) return empty insights
    if (filteredData.length === 0) {
      return {
        ...filteredKpis,
        lowestCoverageRegion: {
          name: "No Data",
          value: 0,
          delta: 0,
          competitorCoverage: 0
        },
        highestAvailabilityDeltaRegion: {
          name: "No Data",
          value: 0,
          delta: 0
        },
        highestAvailabilityDeltaFromCompetitors: {
          name: "No Data",
          value: 0,
          competitors: 0,
          delta: 0
        }
      };
    }
    
    // Apply client filter but keep date and other filters for key insights
    const keyInsightsData = clientFilteredData.filter(item => {
      // Filter by selected date or date range for insights
      if (filters.dateRange.from) {
        const itemDate = new Date(item.reportDate);
        const fromDate = new Date(filters.dateRange.from);
        // Normalize fromDate to start of day
        fromDate.setHours(0, 0, 0, 0);
        if (filters.dateRange.to) {
          // Range selected: include up to end of toDate
          const toDate = new Date(filters.dateRange.to);
          toDate.setHours(23, 59, 59, 999);
          if (itemDate < fromDate || itemDate > toDate) {
            return false;
          }
        } else {
          // Single date selected: match exact date only
          if (
            itemDate.getFullYear() !== fromDate.getFullYear() ||
            itemDate.getMonth() !== fromDate.getMonth() ||
            itemDate.getDate() !== fromDate.getDate()
          ) {
            return false;
          }
        }
      }
      return true;
    });
    
    // Calculate insights based on the filtered data
    const fullDataKpis = calculateKPIs(keyInsightsData);
    
    // Use key insights from the proper dataset
    return {
      ...filteredKpis,
      lowestCoverageRegion: {
        name: fullDataKpis.lowestCoverageRegion.name,
        value: fullDataKpis.lowestCoverageRegion.value,
        delta: fullDataKpis.lowestCoverageRegion.delta,
        competitorCoverage: (fullDataKpis.lowestCoverageRegion as any).competitorCoverage || 0
      },
      highestAvailabilityDeltaRegion: fullDataKpis.highestAvailabilityDeltaRegion,
      highestAvailabilityDeltaFromCompetitors: fullDataKpis.highestAvailabilityDeltaFromCompetitors
    };
  }, [filteredData, clientFilteredData, filters.dateRange]);

  // Calculate other metrics using filtered data
  const timeSeriesData = React.useMemo(() => getTimeSeriesData(filteredData), [filteredData])
  const regionalData = React.useMemo(() => getRegionalData(filteredData), [filteredData])
  const cityRegionalData = React.useMemo(() => getCityRegionalData(filteredData), [filteredData])
  const platformData = React.useMemo(() => getPlatformData(filteredData), [filteredData])
  const platformShareData = React.useMemo(
    () => getPlatformShareData(
      filteredData,
      filters.brand.length === 1 ? filters.brand[0] : undefined
    ),
    [filteredData, filters.brand],
  )
  const brandData = React.useMemo(() => getBrandData(filteredData), [filteredData])
  const productData = React.useMemo(() => getProductData(filteredData), [filteredData])
  const choroplethData = React.useMemo(() => getChoroplethData(filteredData), [filteredData])
  const cityChoroplethData = React.useMemo(() => getCityChoroplethData(filteredData), [filteredData])
  const coverageChoroplethData = React.useMemo(() => 
    getHeatmapDataByType(filteredData, cityRegionalData, "coverage"), 
    [filteredData, cityRegionalData]
  )
  const penetrationChoroplethData = React.useMemo(() => 
    getHeatmapDataByType(filteredData, cityRegionalData, "penetration"), 
    [filteredData, cityRegionalData]
  )

  // Fetch data on component mount
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const data = await fetchCompetitionData()        // already ProcessedData[]
      const parsed = data.map(r => ({
        ...r,
        // parse 'YYYY-MM-DD' string into local Date to avoid timezone shifts
        reportDate: parseISO(r.reportDate as unknown as string)
      }))
      setRawData(parsed)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error occurred"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (!isLoading && rawData.length > 0) {
      const pincodeMap: Record<string, { listed: boolean; available: boolean }> = {};
      rawData.forEach(item => {
        if (!pincodeMap[item.pincode]) {
          pincodeMap[item.pincode] = { listed: false, available: false };
        }
        if (item.isListed) pincodeMap[item.pincode].listed = true;
        if (item.stockAvailable) pincodeMap[item.pincode].available = true;
      });
      const unserviceablePincodes = Object.keys(pincodeMap).filter(pincode => !pincodeMap[pincode].listed);
      console.log(`[DATA] Unserviceable pincodes: ${unserviceablePincodes.length}`, unserviceablePincodes);
    }
  }, [isLoading, rawData])

  const refreshData = () => {
    fetchData()
  }

  return (
    <DataContext.Provider
      value={{
        isLoading,
        error,
        rawData,
        filteredData,
        kpis,
        timeSeriesData,
        regionalData,
        cityRegionalData,
        platformData,
        platformShareData,
        brandData,
        productData,
        choroplethData,
        cityChoroplethData,
        coverageChoroplethData,
        penetrationChoroplethData,
        refreshData
      }}
    >
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  const context = useContext(DataContext)
  if (context === undefined) {
    throw new Error("useData must be used within a DataProvider")
  }
  return context
}
