"use client"

import React, { createContext, useContext, useEffect, useState } from "react"
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
  getCityChoroplethData
} from "@/lib/data-service"
import { useFilters } from "./filters/filter-provider"

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
  refreshData: () => void
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [rawData, setRawData] = useState<ProcessedData[]>([])
  const { filters } = useFilters()

  // Filter data based on selected filters
  const filteredData = React.useMemo(() => {
    if (!rawData.length) return []

    return rawData.filter((item) => {
      // Filter by brand
      if (filters.brand && filters.brand !== "all" && item.brand !== filters.brand) {
        return false
      }

      // Filter by product
      if (filters.product && filters.product !== "all" && item.productId !== filters.product) {
        return false
      }

      // Filter by city
      if (filters.city && filters.city !== "all" && item.city.toLowerCase() !== filters.city.toLowerCase()) {
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
  }, [rawData, filters])

  // Calculate derived data
  const kpis = React.useMemo(() => calculateKPIs(filteredData), [filteredData])
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

  // Fetch data on component mount
  const fetchData = async () => {
    try {
      setIsLoading(true)
      const data = await fetchCompetitionData()
      setRawData(data)
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
