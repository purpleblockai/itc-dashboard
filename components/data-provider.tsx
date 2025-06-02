"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from "react"
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
  getCoverageByBrandData,
  DashboardPayload,
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
  // Coverage by brand for dashboard
  brandCoverage: { name: string; coverage: number }[]
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
  // Add static platform insights to context type
  lowestCoveragePlatform: {
    name: string
    coverageDelta: number
    clientCoverage: number
    competitorCoverage: number
  } | null
  lowestAvailabilityPlatform: {
    name: string
    availabilityDelta: number
    clientAvailability: number
    competitorAvailability: number
  } | null
  refreshData: () => void
  serverKpis: {
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
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [rawData, setRawData] = useState<ProcessedData[]>([])
  const [serverDashboard, setServerDashboard] = useState<DashboardPayload | null>(null)
  const { filters } = useFilters()
  const { data: session } = useSession()
  
  // Get user information
  const user = session?.user as ExtendedUser | undefined;
  const isAdmin = user?.role === "admin";
  const userClientName = user?.clientName;

  // Determine if no UI filters are active
  const noFilters = React.useMemo(() =>
    filters.brand.length === 0 &&
    filters.company.length === 0 &&
    filters.product.length === 0 &&
    filters.city.length === 0 &&
    filters.platform.length === 0 &&
    !filters.pincode &&
    !filters.dateRange.from,
    [filters]
  )

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

      // Filter by company
      if (filters.company.length > 0 && !filters.company.includes(item.company)) {
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

  // Use server-provided or client-computed aggregates
  const kpis = React.useMemo(() => {
    if (serverDashboard && noFilters) return serverDashboard.kpis;
    return calculateKPIs(filteredData);
  }, [serverDashboard, filteredData, noFilters]);

  // Always get server-side KPIs (full data) for Key Insights
  const serverKpis = React.useMemo(() => {
    return serverDashboard?.kpis ?? calculateKPIs(rawData);
  }, [serverDashboard, rawData]);

  // Calculate other metrics using filtered data
  const timeSeriesData = React.useMemo(() => {
    if (serverDashboard && noFilters) return serverDashboard.timeSeriesData;
    return getTimeSeriesData(filteredData);
  }, [serverDashboard, filteredData, noFilters]);
  const regionalData = React.useMemo(() => {
    if (serverDashboard && noFilters) return serverDashboard.regionalData;
    return getRegionalData(filteredData);
  }, [serverDashboard, filteredData, noFilters]);
  const cityRegionalData = React.useMemo(() => getCityRegionalData(filteredData), [filteredData])
  const platformData = React.useMemo(() => getPlatformData(filteredData), [filteredData])
  const platformShareData = React.useMemo(() => {
    if (serverDashboard && noFilters) return serverDashboard.platformShareData;
    return getPlatformShareData(
      filteredData,
      filters.brand.length === 1 ? filters.brand[0] : undefined
    );
  }, [serverDashboard, filteredData, filters, noFilters]);
  const brandData = React.useMemo(() => getBrandData(filteredData), [filteredData])
  const productData = React.useMemo(() => getProductData(filteredData), [filteredData])
  const choroplethData = React.useMemo(() => getChoroplethData(filteredData), [filteredData])
  const cityChoroplethData = React.useMemo(() => getCityChoroplethData(filteredData), [filteredData])
  const coverageChoroplethData = React.useMemo(() => 
    cityRegionalData.map(city => {
      const cityName = (city.city || "").toLowerCase();
      const cityDataItems = filteredData.filter(item => (item.city || "").toLowerCase() === cityName);
      const metrics = calculateKPIs(cityDataItems);
      return {
        id: cityName,
        city: city.city || "",
        value: parseFloat(metrics.coverageMethod1.toFixed(1)),
      };
    }),
    [filteredData, cityRegionalData]
  )
  const penetrationChoroplethData = React.useMemo(() => 
    cityRegionalData.map(city => {
      const cityName = (city.city || "").toLowerCase();
      const cityDataItems = filteredData.filter(item => (item.city || "").toLowerCase() === cityName);
      const metrics = calculateKPIs(cityDataItems);
      return {
        id: cityName,
        city: city.city || "",
        value: parseFloat(metrics.penetration.toFixed(1)),
      };
    }),
    [filteredData, cityRegionalData]
  )

  // Coverage by brand data (server or client)
  const brandCoverage = React.useMemo(() => {
    if (serverDashboard && noFilters) return serverDashboard.brandCoverage;
    return getCoverageByBrandData(filteredData);
  }, [serverDashboard, filteredData, noFilters]);

  // Fetch data on component mount
  const fetchData = async () => {
    const payloadStart = performance.now();
    try {
      setIsLoading(true)
      const payload = await fetchCompetitionData()        // DashboardPayload
      setServerDashboard(payload)
      const parsed = payload.rawData.map(r => ({
        ...r,
        // parse 'YYYY-MM-DD' string into local Date to avoid timezone shifts, fallback to now if missing
        reportDate: typeof r.reportDate === 'string' && r.reportDate
          ? parseISO(r.reportDate)
          : new Date()
      }))
      setRawData(parsed)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error occurred"))
    } finally {
      setIsLoading(false)
      const duration = performance.now() - payloadStart;
      console.log(`DataProvider.fetchData took ${duration.toFixed(2)} ms`);
    }
  }

  // Prevent double-fetch in React StrictMode by guarding the initial fetch
  const hasFetchedRef = useRef(false)
  useEffect(() => {
    if (hasFetchedRef.current) return
    hasFetchedRef.current = true
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
    }
  }, [isLoading, rawData])

  const refreshData = () => {
    fetchData()
  }

  // Calculate static platform metrics independent of filters
  const staticPlatformMetrics = React.useMemo(() => {
    if (isLoading) return [];
    // Determine client company by finding the company for client's own records
    const clientCompanyFromData = clientFilteredData.find(item => item.company === userClientName)?.company || "";
    if (!clientCompanyFromData) return [];
    const map = new Map<string, { clientItems: ProcessedData[]; competitorItems: ProcessedData[] }>()
    clientFilteredData.forEach(item => {
      const platform = item.platform
      if (!map.has(platform)) {
        map.set(platform, { clientItems: [], competitorItems: [] })
      }
      const entry = map.get(platform)!
      if (item.company === clientCompanyFromData) {
        entry.clientItems.push(item)
      } else if (item.company) {
        entry.competitorItems.push(item)
      }
    })
    return Array.from(map.entries()).map(([name, { clientItems, competitorItems }]) => {
      const clientTotal = clientItems.length
      const clientAvailable = clientItems.filter(i => i.availability === "Yes").length
      const clientCoverage = clientTotal > 0 ? (clientAvailable / clientTotal) * 100 : 0
      const clientListed = clientItems.filter(i => i.availability === "Yes" || i.availability === "No").length
      const clientAvailability = clientListed > 0 ? (clientAvailable / clientListed) * 100 : 0
      const compTotal = competitorItems.length
      const compAvailable = competitorItems.filter(i => i.availability === "Yes").length
      const competitorCoverage = compTotal > 0 ? (compAvailable / compTotal) * 100 : 0
      const compListed = competitorItems.filter(i => i.availability === "Yes" || i.availability === "No").length
      const competitorAvailability = compListed > 0 ? (compAvailable / compListed) * 100 : 0
      return {
        name,
        clientCoverage: parseFloat(clientCoverage.toFixed(1)),
        competitorCoverage: parseFloat(competitorCoverage.toFixed(1)),
        coverageDelta: parseFloat((clientCoverage - competitorCoverage).toFixed(1)),
        clientAvailability: parseFloat(clientAvailability.toFixed(1)),
        competitorAvailability: parseFloat(competitorAvailability.toFixed(1)),
        availabilityDelta: parseFloat((clientAvailability - competitorAvailability).toFixed(1)),
      }
    })
  }, [clientFilteredData, isLoading, userClientName])

  const lowestCoveragePlatform = staticPlatformMetrics.length > 0
    ? staticPlatformMetrics.reduce((prev, curr) => curr.clientCoverage < prev.clientCoverage ? curr : prev)
    : null
  const lowestAvailabilityPlatform = staticPlatformMetrics.length > 0
    ? staticPlatformMetrics.reduce((prev, curr) => curr.clientAvailability < prev.clientAvailability ? curr : prev)
    : null

  return (
    <DataContext.Provider
      value={{
        isLoading,
        error,
        rawData,
        filteredData,
        kpis,
        serverKpis,
        timeSeriesData,
        regionalData,
        cityRegionalData,
        platformData,
        platformShareData,
        brandData,
        brandCoverage,
        productData,
        choroplethData,
        cityChoroplethData,
        coverageChoroplethData,
        penetrationChoroplethData,
        lowestCoveragePlatform,
        lowestAvailabilityPlatform,
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
