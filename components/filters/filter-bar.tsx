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
import { useFilters } from "@/components/filters/filter-provider"
import { useData } from "@/components/data-provider"
import { getUniqueValues } from "@/lib/data-service"
import type { ProcessedData } from "@/lib/data-service"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

type DateRange = { from?: Date; to?: Date };


export function FilterBar() {
  const { setFilters, filters, resetFilters } = useFilters()
  const { unfilteredSummaryData, isLoading } = useData()
  const [brandOpen, setBrandOpen] = useState(false)
  const [productOpen, setProductOpen] = useState(false)
  const [platformOpen, setPlatformOpen] = useState(false)
  const [cityOpen, setCityOpen] = useState(false)
  const [calendarOpen, setCalendarOpen] = useState(false)
  const [products, setProducts] = useState<{ label: string; value: string }[]>([])
  const [companyOpen, setCompanyOpen] = useState(false)
  const [companies, setCompanies] = useState<{ label: string; value: string }[]>([
    { label: "All Companies", value: "all" }
  ])

  // Generate filter options from actual data
  const [brands, setBrands] = useState<{ label: string; value: string }[]>([{ label: "All Brands", value: "all" }])

  const [platforms, setPlatforms] = useState<{ label: string; value: string }[]>([
    { label: "All Platforms", value: "all" },
  ])

  const [cities, setCities] = useState<{ label: string; value: string }[]>([{ label: "All Cities", value: "all" }])

  // Keep a normalized superset of all summary options for filters
  const [supersetOptions, setSupersetOptions] = useState<Array<{ brand: string; company: string; productDescription: string; city: string; platform: string }>>([])

  // Normalize unfiltered summary data from DataProvider instead of fetching separately
  useEffect(() => {
    if (unfilteredSummaryData.length > 0) {
      const normalized = unfilteredSummaryData.map((doc: any) => ({
        brand: doc.Brand || doc.brand || "",
        company: doc.Company || doc.company || "",
        productDescription: doc.Name || doc.productDescription || "",
        city: doc.City || doc.city || "",
        platform: doc.Platform || doc.platform || "",
      }))
      setSupersetOptions(normalized)
    }
  }, [unfilteredSummaryData])

  // Update filter options when filters change, using the supersetOptions
  useEffect(() => {
    const source = supersetOptions
    if (!source.length) return;

    // Brand options (ignore current brand filter)
    let brandSource = source.filter(item => !!item.brand);
    if (filters.company.length) brandSource = brandSource.filter(item => filters.company.includes(item.company))
    if (filters.product.length) brandSource = brandSource.filter(item => filters.product.includes(item.productDescription))
    if (filters.city.length) brandSource = brandSource.filter(item => filters.city.includes(item.city))
    if (filters.platform.length) brandSource = brandSource.filter(item => filters.platform.includes(item.platform))
    const uniqueBrands = getUniqueValues(brandSource as unknown as ProcessedData[], "brand")
    setBrands([{ label: "All Brands", value: "all" }, ...uniqueBrands.map(b => ({ label: b, value: b }))])

    // Company options (ignore current company filter)
    let companySource = source.filter(item => !!item.company);
    if (filters.brand.length) companySource = companySource.filter(item => filters.brand.includes(item.brand))
    if (filters.product.length) companySource = companySource.filter(item => filters.product.includes(item.productDescription))
    if (filters.city.length) companySource = companySource.filter(item => filters.city.includes(item.city))
    if (filters.platform.length) companySource = companySource.filter(item => filters.platform.includes(item.platform))
    const uniqueCompanies = getUniqueValues(companySource as unknown as ProcessedData[], "company")
    setCompanies([{ label: "All Companies", value: "all" }, ...uniqueCompanies.map(c => ({ label: c, value: c }))])

    // Platform options (ignore current platform filter)
    let platformSource = source.filter(item => !!item.platform);
    if (filters.brand.length) platformSource = platformSource.filter(item => filters.brand.includes(item.brand))
    if (filters.company.length) platformSource = platformSource.filter(item => filters.company.includes(item.company))
    if (filters.product.length) platformSource = platformSource.filter(item => filters.product.includes(item.productDescription))
    if (filters.city.length) platformSource = platformSource.filter(item => filters.city.includes(item.city))
    const uniquePlatformValues = getUniqueValues(platformSource as unknown as ProcessedData[], "platform")
    setPlatforms([{ label: "All Platforms", value: "all" }, ...uniquePlatformValues.map(p => ({ label: p, value: p }))])

    // City options (ignore current city filter)
    let citySource = source.filter(item => !!item.city);
    if (filters.brand.length) citySource = citySource.filter(item => filters.brand.includes(item.brand))
    if (filters.company.length) citySource = citySource.filter(item => filters.company.includes(item.company))
    if (filters.product.length) citySource = citySource.filter(item => filters.product.includes(item.productDescription))
    if (filters.platform.length) citySource = citySource.filter(item => filters.platform.includes(item.platform))
    const uniqueCities = getUniqueValues(citySource as unknown as ProcessedData[], "city")
    setCities([{ label: "All Cities", value: "all" }, ...uniqueCities.map(ct => ({ label: ct.charAt(0).toUpperCase() + ct.slice(1), value: ct }))])

    // Product options (ignore current product filter)
    let prodSource = source.filter(item => !!item.productDescription);
    if (filters.brand.length) prodSource = prodSource.filter(item => filters.brand.includes(item.brand))
    if (filters.company.length) prodSource = prodSource.filter(item => filters.company.includes(item.company))
    if (filters.city.length) prodSource = prodSource.filter(item => filters.city.includes(item.city))
    if (filters.platform.length) prodSource = prodSource.filter(item => filters.platform.includes(item.platform))
    const prodMap = new Map<string, string>()
    prodSource.forEach(item => prodMap.set(item.productDescription, item.productDescription))
    const uniqueProducts = Array.from(prodMap.keys())
      .map((v: string) => ({ label: v, value: v }))
      .sort((a, b) => a.label.localeCompare(b.label))
    setProducts(uniqueProducts)
  }, [supersetOptions, filters.brand, filters.company, filters.product, filters.city, filters.platform])

  // Derive actual filter options (exclude placeholder entries)
  const actualBrandOptions = brands.filter((b) => b.value !== "all");
  const actualCompanyOptions = companies.filter((c) => c.value !== "all");
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

        <Popover open={companyOpen} onOpenChange={setCompanyOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={companyOpen}
              className="w-full justify-between md:w-[200px]"
              disabled={isLoading}
            >
              {filters.company && filters.company.length > 0
                ? `${filters.company.length} Companies`
                : "Select Companies"}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-0 md:w-[200px]">
            <Command>
              <CommandInput placeholder="Search companies..." />
              <CommandList>
                <CommandEmpty>No companies found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    key="__all_companies"
                    value="Select All Companies"
                    onSelect={() => {
                      const allValues = actualCompanyOptions.map((c) => c.value);
                      const isAllSelected = filters.company.length === actualCompanyOptions.length;
                      const newSelections = isAllSelected ? [] : allValues;
                      setFilters({ company: newSelections });
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        filters.company.length === actualCompanyOptions.length
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    Select All Companies
                  </CommandItem>
                  {actualCompanyOptions.map((c) => (
                    <CommandItem
                      key={c.value}
                      value={c.label}
                      onSelect={() => {
                        const newSelections = filters.company.includes(c.value)
                          ? filters.company.filter((v) => v !== c.value)
                          : [...filters.company, c.value];
                        setFilters({ company: newSelections });
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          filters.company.includes(c.value) ? "opacity-100" : "opacity-0"
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
                  {products.map((prod, idx) => (
                    <CommandItem
                      key={`${prod.value}-${idx}`}
                      value={prod.value}
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
                    {format(filters.dateRange.from, "dd-MM-yyyy")} - {format(filters.dateRange.to, "dd-MM-yyyy")}
                  </>
                ) : (
                  format(filters.dateRange.from, "dd-MM-yyyy")
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
