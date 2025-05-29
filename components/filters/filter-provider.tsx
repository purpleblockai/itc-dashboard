"use client"

import type React from "react"

import { createContext, useContext, useState } from "react"

export type FilterState = {
  brand: string[]
  company: string[]
  product: string[]
  city: string[]
  pincode: string
  platform: string[]
  dateRange: {
    from: Date | undefined
    to: Date | undefined
  }
}

export type FilterContextType = {
  filters: FilterState
  setFilters: (filters: Partial<FilterState>) => void
  resetFilters: () => void
}

const initialFilters: FilterState = {
  brand: [],
  company: [],
  product: [],
  city: [],
  pincode: "",
  platform: [],
  dateRange: {
    from: undefined,
    to: undefined,
  },
}

const FilterContext = createContext<FilterContextType | undefined>(undefined)

export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFiltersState] = useState<FilterState>(initialFilters)

  const setFilters = (newFilters: Partial<FilterState>) => {
    setFiltersState((prev) => {
      // Special handling for date range to ensure proper update
      if (newFilters.dateRange) {
        return {
          ...prev,
          ...newFilters,
          dateRange: {
            ...prev.dateRange,
            ...newFilters.dateRange
          }
        };
      }
      return {
        ...prev,
        ...newFilters,
      };
    });
  }

  const resetFilters = () => {
    setFiltersState(initialFilters)
  }

  return <FilterContext.Provider value={{ filters, setFilters, resetFilters }}>{children}</FilterContext.Provider>
}

export function useFilters() {
  const context = useContext(FilterContext)
  if (!context) {
    throw new Error("useFilters must be used within a FilterProvider")
  }
  return context
}
