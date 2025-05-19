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
  const [brandOpen, setBrandOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const [platformOpen, setPlatformOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [products, setProducts] = useState<{ label: string; value: string }[]>([])

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

      // Get unique products, filtered by selected brands if any
      let dataForProducts = rawData
      if (filters.brand && filters.brand.length > 0) {
        dataForProducts = rawData.filter((item) => filters.brand.includes(item.brand))
      }
      const productMap = new Map<string, string>()
      dataForProducts.forEach((item) => {
        if (!productMap.has(item.productId)) {
          productMap.set(item.productId, item.productDescription)
        }
      })
      const uniqueProducts = Array.from(productMap.entries())
        .map(([value, label]) => ({ label, value }))
        .sort((a, b) => a.label.localeCompare(b.label))
      setProducts(uniqueProducts)
    }
  }, [rawData, filters.brand])

  // Derive actual filter options (exclude placeholder entries)
  const actualBrandOptions = brands.filter((b) => b.value !== "all");
  const actualPlatformOptions = platforms.filter((p) => p.value !== "all");
  const actualCityOptions = cities.filter((c) => c.value !== "all");

  return (
    <div className="flex flex-col space-y-4 md:flex-row md:items-center md:space-x-4 md:space-y-0">
      <div className="flex flex-1 flex-wrap items-center gap-2">
        <Popover open={brandOpen} onOpenChange={setBrandOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={brandOpen}
              className="w-full justify-between md:w-[200px]"
              disabled={isLoading}
            >
              {filters.brand && filters.brand.length > 0
                ? `${filters.brand.length} Brands`
                : "Select Brands"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 md:w-[200px]">
            <Command>
              <CommandInput placeholder="Search brands..." />
              <CommandList>
                <CommandEmpty>No brands found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    key="__all_brands"
                    value="Select All Brands"
                    onSelect={() => {
                      const allValues = actualBrandOptions.map((b) => b.value);
                      const isAllSelected = filters.brand.length === actualBrandOptions.length;
                      const newSelections = isAllSelected ? [] : allValues;
                      setFilters({ brand: newSelections, product: [] });
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filters.brand.length === actualBrandOptions.length
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    Select All Brands
                  </CommandItem>
                  {actualBrandOptions.map((b) => (
                    <CommandItem
                      key={b.value}
                      value={b.label}
                      onSelect={() => {
                        const newSelections = filters.brand.includes(b.value)
                          ? filters.brand.filter((v) => v !== b.value)
                          : [...filters.brand, b.value];
                        setFilters({ brand: newSelections, product: [] });
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.brand.includes(b.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {b.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <Popover open={productOpen} onOpenChange={setProductOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={productOpen}
              className="w-full justify-between md:w-[200px]"
              disabled={isLoading}
            >
              {filters.product && filters.product.length > 0
                ? `${filters.product.length} Products`
                : "Select Products"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 md:w-[200px]">
            <Command>
              <CommandInput placeholder="Search products..." />
              <CommandList>
                <CommandEmpty>No products found.</CommandEmpty>
                <CommandGroup>
                  {products.map((prod) => (
                    <CommandItem
                      key={prod.value}
                      value={prod.label}
                      onSelect={() => {
                        const current = filters.product || []
                        const newSelections = current.includes(prod.value)
                          ? current.filter((v) => v !== prod.value)
                          : [...current, prod.value]
                        setFilters({ product: newSelections })
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.product && filters.product.includes(prod.value)
                            ? "opacity-100"
                            : "opacity-0"
                        )}
                      />
                      {prod.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* Platform multi-select filter */}
        <Popover open={platformOpen} onOpenChange={setPlatformOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={platformOpen}
              className="w-full justify-between md:w-[180px]"
              disabled={isLoading}
            >
              {filters.platform && filters.platform.length > 0
                ? `${filters.platform.length} Platforms`
                : "Select Platforms"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 md:w-[180px]">
            <Command>
              <CommandInput placeholder="Search platforms..." />
              <CommandList>
                <CommandEmpty>No platforms found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    key="__all_platforms"
                    value="Select All Platforms"
                    onSelect={() => {
                      const allValues = actualPlatformOptions.map((p) => p.value);
                      const isAllSelected = filters.platform.length === actualPlatformOptions.length;
                      const newSelections = isAllSelected ? [] : allValues;
                      setFilters({ platform: newSelections });
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filters.platform.length === actualPlatformOptions.length
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    Select All Platforms
                  </CommandItem>
                  {actualPlatformOptions.map((p) => (
                    <CommandItem
                      key={p.value}
                      value={p.label}
                      onSelect={() => {
                        const newSelections = filters.platform.includes(p.value)
                          ? filters.platform.filter((v) => v !== p.value)
                          : [...filters.platform, p.value];
                        setFilters({ platform: newSelections });
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.platform.includes(p.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {p.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        {/* City multi-select filter */}
        <Popover open={cityOpen} onOpenChange={setCityOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={cityOpen}
              className="w-full justify-between md:w-[180px]"
              disabled={isLoading}
            >
              {filters.city && filters.city.length > 0
                ? `${filters.city.length} Cities`
                : "Select Cities"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 md:w-[180px]">
            <Command>
              <CommandInput placeholder="Search cities..." />
              <CommandList>
                <CommandEmpty>No cities found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    key="__all_cities"
                    value="Select All Cities"
                    onSelect={() => {
                      const allValues = actualCityOptions.map((c) => c.value);
                      const isAllSelected = filters.city.length === actualCityOptions.length;
                      const newSelections = isAllSelected ? [] : allValues;
                      setFilters({ city: newSelections });
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filters.city.length === actualCityOptions.length
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    Select All Cities
                  </CommandItem>
                  {actualCityOptions.map((c) => (
                    <CommandItem
                      key={c.value}
                      value={c.label}
                      onSelect={() => {
                        const newSelections = filters.city.includes(c.value)
                          ? filters.city.filter((v) => v !== c.value)
                          : [...filters.city, c.value];
                        setFilters({ city: newSelections });
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.city.includes(c.value) ? "opacity-100" : "opacity-0"
                        )}
                      />
                      {c.label}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

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
              mode="range"
              defaultMonth={filters.dateRange.from ?? new Date()}
              selected={{
                from: filters.dateRange.from,
                to: filters.dateRange.to
              }}
              onSelect={(range: DateRange | undefined) => {
                setFilters({
                  dateRange: {
                    from: range?.from,
                    to: range?.to,
                  },
                });
                // Don't close the popover until a complete range is selected
                if (range?.from && range?.to) {
                  setCalendarOpen(false);
                }
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
