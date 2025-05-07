"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"

export type FilterState = {
  brand: string
  product: string
  city: string
  pincode: string
  platform: string
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
}

type FilterContextType = {
  filters: FilterState
  setFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
}

const initialFilters: FilterState = {
  brand: "all",
  product: "all",
  city: "all",
  pincode: "",
  platform: "all",
  dateRange: {
    from: undefined,
    to: undefined,
  },
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<FilterState>(initialFilters)

  const setFilters = (newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => ({
      ...prev,
      ...newFilters,
    }))
  }

  const resetFilters = () => {
    setFiltersState(initialFilters)
  }

  return <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (context === undefined) {
    throw new Error("useFilters must be used within a FilterProvider")
  }
  return context
}
