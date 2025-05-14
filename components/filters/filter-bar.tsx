"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { CalendarIcon, Check, ChevronsUpDown, X } from "lucide-react"
import { format } from "date-fns"
import { Icons } from "@/components/icons"
import { useFilters } from "./filter-provider"
import { useData } from "@/components/data-provider"
import { getUniqueValues } from "@/lib/data-service"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

type DateRange = { from?: Date; to?: Date };


export function FilterBar() {
  const { filters, setFilters, resetFilters } = useFilters()
  const { rawData, isLoading } = useData()
  const [open, setOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)

  // Generate filter options from actual data
  const [brands, setBrands] = useState<{ label: string; value: string }[]>([{ label: "All Brands", value: "all" }])

  const [platforms, setPlatforms] = useState<{ label: string; value: string }[]>([
    { label: "All Platforms", value: "all" },
  ])

  const [cities, setCities] = useState<{ label: string; value: string }[]>([{ label: "All Cities", value: "all" }])

  // Update filter options when data is loaded
  useEffect(() => {
    if (rawData.length > 0) {
      // Get unique brands
      const uniqueBrands = getUniqueValues(rawData, "brand")
      setBrands([
        { label: "All Brands", value: "all" },
        ...uniqueBrands.map((brand) => ({ label: brand, value: brand })),
      ])

      // Get unique platforms
      const uniquePlatforms = getUniqueValues(rawData, "platform")
      setPlatforms([
        { label: "All Platforms", value: "all" },
        ...uniquePlatforms.map((platform) => ({ label: platform, value: platform })),
      ])

      // Get unique cities
      const uniqueCities = getUniqueValues(rawData, "city")
      setCities([
        { label: "All Cities", value: "all" },
        ...uniqueCities.map((city) => ({
          label: city.charAt(0).toUpperCase() + city.slice(1),
          value: city,
        })),
      ])
    }
  }, [rawData])

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="w-full justify-between md:w-[200px]"
              disabled={isLoading}
            >
              {filters.brand && filters.brand !== "all"
                ? brands.find((brand) => brand.value === filters.brand)?.label
                : "Select Brand"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 md:w-[200px]">
            <Command>
              <CommandInput placeholder="Search brand..." />
              <CommandList>
                <CommandEmpty>No brand found.</CommandEmpty>
                <CommandGroup>
                  {brands.map((brand) => (
                    <CommandItem
                      key={brand.value}
                      value={brand.value}
                      onSelect={(currentValue) => {
                        setFilters({ brand: currentValue === filters.brand ? "all" : currentValue })
                        setOpen(false)
                      }}
                    >
                      <Check
                        className={cn("mr-2 h-4 w-4", filters.brand === brand.value ? "opacity-100" : "opacity-0")}
                      />
                      {brand.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Select
          value={filters.platform}
          onValueChange={(value) => setFilters({ platform: value })}
          disabled={isLoading}
        >
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Select Platform" />
          </SelectTrigger>
          <SelectContent>
            {platforms.filter(platform => platform.value !== "").map((platform) => (
              <SelectItem key={platform.value} value={platform.value}>
                {platform.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filters.city} onValueChange={(value) => setFilters({ city: value })} disabled={isLoading}>
          <SelectTrigger className="w-full md:w-[180px]">
            <SelectValue placeholder="Select City" />
          </SelectTrigger>
          <SelectContent>
            {cities.filter(city => city.value !== "").map((city) => (
              <SelectItem key={city.value} value={city.value}>
                {city.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              id="date"
              variant={"outline"}
              className="w-full justify-start text-left font-normal md:w-[300px]"
              disabled={isLoading}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {filters.dateRange.from ? (
                filters.dateRange.to ? (
                  <>
                    {format(filters.dateRange.from, "LLL dd, y")} - {format(filters.dateRange.to, "LLL dd, y")}
                  </>
                ) : (
                  format(filters.dateRange.from, "LLL dd, y")
                )
              ) : (
                <span>Pick a date range</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
          <Calendar
            initialFocus
            mode="range"                                           // ← required!
            defaultMonth={filters.dateRange.from ?? new Date()}   // never undefined
            selected={
              filters.dateRange.from && filters.dateRange.to
                ? { from: filters.dateRange.from, to: filters.dateRange.to }
                : undefined
            }
            onSelect={(range?: DateRange) => {                    // now TS knows what `range` is
              setFilters({
                dateRange: {
                  from: range?.from,
                  to:   range?.to,
                },
              })
            }}
            numberOfMonths={2}
          />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center space-x-2">
        <Button variant="outline" size="sm" onClick={resetFilters} className="h-9" disabled={isLoading}>
          <X className="mr-2 h-4 w-4" />
          Reset
        </Button>
        <Button size="sm" className="h-9 bg-pinsight-orange hover:bg-pinsight-orange/90" disabled={isLoading}>
          {isLoading ? (
            <>
              <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
              Loading...
            </>
          ) : (
            "Apply Filters"
          )}
        </Button>
      </div>
    </div>
  )
}
