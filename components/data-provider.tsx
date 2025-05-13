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
  processRow
} from "@/lib/data-service"
import { useFilters } from "./filters/filter-provider"

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
    skuTracks: number
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

  // Filter data based on selected filters and user's client
  const filteredData = React.useMemo(() => {
    if (!rawData.length) return []

    return rawData.filter((item) => {
      // For non-admin users, filter by their assigned client
      if (!isAdmin && userClientName && item.clientName && item.clientName !== userClientName) {
        return false;
      }
      
      // Filter by brand
      if (filters.brand && filters.brand !== "all" && item.brand !== filters.brand) {
        return false
      }

      // Filter by product
      if (filters.product && filters.product !== "all" && item.productId !== filters.product) {
        return false
      }

      // Filter by city
      if (filters.city && filters.city !== "all" && (item.city || "").toLowerCase() !== (filters.city || "").toLowerCase()) {
        return false
      }

      // Filter by pincode
      if (filters.pincode && item.pincode !== filters.pincode) {
        return false
      }

      // Filter by platform
      if (filters.platform && filters.platform !== "all" && item.platform !== filters.platform) {
        return false
      }

      // Filter by date range
      if (filters.dateRange.from && item.reportDate < filters.dateRange.from) {
        return false
      }

      if (filters.dateRange.to) {
        const toDateEnd = new Date(filters.dateRange.to)
        toDateEnd.setHours(23, 59, 59, 999)
        if (item.reportDate > toDateEnd) {
          return false
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
    const filteredKpis = calculateKPIs(filteredData);
    
    // Get key insights from the full dataset (filtered only by client)
    const fullDataKpis = calculateKPIs(clientFilteredData);
    
    // Use key insights from the full dataset
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
  }, [filteredData, clientFilteredData]);

  // Calculate other metrics using filtered data
  const timeSeriesData = React.useMemo(() => getTimeSeriesData(filteredData), [filteredData])
  const regionalData = React.useMemo(() => getRegionalData(filteredData), [filteredData])
  const cityRegionalData = React.useMemo(() => getCityRegionalData(filteredData), [filteredData])
  const platformData = React.useMemo(() => getPlatformData(filteredData), [filteredData])
  const platformShareData = React.useMemo(
    () => getPlatformShareData(filteredData, filters.brand !== "all" ? filters.brand : undefined),
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
      const data = await fetchCompetitionData()
      // Patch: ensure all data is processed through processRow
      const processedData = (data as any[]).map(processRow) as ProcessedData[]
      setRawData(processedData)
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
