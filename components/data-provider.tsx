"use client"

import React, { createContext, useContext, useEffect, useState, useRef } from "react"
import { useSession } from "next-auth/react"
import {
  fetchSummaryData,
  fetchRawData,
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
import { parseISO, parse, format } from 'date-fns'

// Keep track of last fetched filters globally to avoid duplicate fetches
let lastFetchedFiltersKey = "";

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
  normalizedSummaryData: any[]
  unfilteredSummaryData: any[]
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
  summaryAvailabilityByBrand: { name: string; availability: number }[]
  summaryPenetrationByBrand: { name: string; penetration: number }[]
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
  summaryPlatformMetrics: { name: string; availability: number; penetration: number; discount: number }[]
  pauseSummary: boolean
  setPauseSummary: React.Dispatch<React.SetStateAction<boolean>>
}

const DataContext = createContext<DataContextType | undefined>(undefined)

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [rawData, setRawData] = useState<ProcessedData[]>([])
  const [summaryData, setSummaryData] = useState<ProcessedData[]>([])
  const [serverDashboard, setServerDashboard] = useState<DashboardPayload | null>(null)
  const [unfilteredSummaryData, setUnfilteredSummaryData] = useState<any[]>([])
  const [pauseSummary, setPauseSummary] = useState(false)
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
      if (filters.product.length > 0 && !filters.product.includes(item.productDescription)) {
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

  // Compute client-side KPIs for filtered data (unique SKUs count)
  const clientKPIs = React.useMemo(() => calculateKPIs(filteredData), [filteredData])

  // Use server-provided or client-computed aggregates; trust server skusTracked
  const kpis = React.useMemo(() => {
    return serverDashboard ? serverDashboard.kpis : clientKPIs;
  }, [serverDashboard, clientKPIs])

  // Always get server-side KPIs (full data) for Key Insights
  const serverKpis = React.useMemo(() => {
    return serverDashboard?.kpis ?? calculateKPIs(rawData);
  }, [serverDashboard, rawData]);

  // Calculate other metrics using filtered data
  const timeSeriesData = React.useMemo(() => {
    if (serverDashboard) return serverDashboard.timeSeriesData;
    return getTimeSeriesData(filteredData);
  }, [serverDashboard, filteredData]);
  const regionalData = React.useMemo(() => {
    if (serverDashboard) return serverDashboard.regionalData;
    return getRegionalData(filteredData);
  }, [serverDashboard, filteredData]);
  const cityRegionalData = React.useMemo(() => {
    // Use summary data directly for city regional data calculation
    if (!summaryData || summaryData.length === 0) {
      return [];
    }
    
    // Group summary data by city and calculate metrics
    const cityMap = new Map<string, { available: number; listed: number; total: number; pincodes: Set<string> }>();
    
    summaryData.forEach((doc: any, index: number) => {
      const city = (doc.City || doc.city || "").toString().toLowerCase().trim();
      const pincode = String(doc.Pincode || doc.pincode || "").trim();
      

      
      if (!city || city === 'undefined' || city === 'null' || city.length === 0) {
        return;
      }
      
      const available = Number(doc.availableCount ?? doc.available_count ?? 0);
      const listed = Number(doc.listedCount ?? doc.listed_count ?? 0);
      const total = Number(doc.totalCount ?? doc.total_count ?? 0);
      
      if (!cityMap.has(city)) {
        cityMap.set(city, { available: 0, listed: 0, total: 0, pincodes: new Set() });
      }
      
      const entry = cityMap.get(city)!;
      entry.available += available;
      entry.listed += listed;
      entry.total += total;
      
      if (pincode && pincode !== 'undefined' && pincode !== 'null' && pincode.length > 0) {
        entry.pincodes.add(pincode);
      }
    });
    

    
    // Convert to final format
    const result = Array.from(cityMap.entries())
      .filter(([city]) => city && city.length > 0)
      .map(([city, { available, listed, total, pincodes }]) => {
        const stockAvailability = listed > 0 ? Math.round((available / listed) * 100) : 0;
        const stockOutPercent = listed > 0 ? Math.round(((listed - available) / listed) * 100) : 0;
        const penetration = total > 0 ? Math.round((listed / total) * 100) : 0;
        const coverage = total > 0 ? Math.round((available / total) * 100) : 0;
        
        return {
          city,
          stockAvailability,
          stockOutPercent,
          pincodeCount: pincodes.size,
          pincodes: Array.from(pincodes),
          coverage,
          penetration,
        };
      })
      .sort((a, b) => b.stockAvailability - a.stockAvailability);
    

    return result;
  }, [summaryData])
  const platformData = React.useMemo(() => getPlatformData(filteredData), [filteredData])
  const platformShareData = React.useMemo(() => {
    if (serverDashboard) return serverDashboard.platformShareData;
    return getPlatformShareData(
      filteredData,
      filters.brand.length === 1 ? filters.brand[0] : undefined
    );
  }, [serverDashboard, filteredData, filters, noFilters]);

  // Normalize summaryData field names for chart hooks
  const normalizedSummaryData = React.useMemo(
    () => summaryData.map(item => {
      const doc = item as any;
      // Parse and normalize report date from summary data
      let reportDate: Date;
      if (doc.Report_Date instanceof Date) {
        reportDate = doc.Report_Date;
      } else if (typeof doc.Report_Date === 'string') {
        // Summary stores dates as 'DD-MM-YYYY'
        reportDate = parse(doc.Report_Date, 'dd-MM-yyyy', new Date());
      } else {
        reportDate = new Date(doc.Report_Date);
      }
      const available = doc.availableCount ?? doc.available_count ?? 0;
      const listed = doc.listedCount ?? doc.listed_count ?? 0;
      const total = doc.totalCount ?? doc.total_count ?? 0;
      const availability = listed > 0 ? available / listed : 0;
      const penetration = total > 0 ? listed / total : 0;
      const coverage = listed > 0 ? available / listed : 0;
      return {
        ...item,
        reportDate,
        brand: doc.Brand || doc.brand,
        name: doc.Name || doc.name,
        company: doc.Company || doc.company,
        productDescription: doc.Name || doc.productDescription,
        city: doc.City || doc.city,
        platform: doc.Platform || doc.platform,
        category: doc.Category || doc.category,
        uniqueProductId: doc.Unique_Product_ID || doc.uniqueProductId,
        availability,
        penetration,
        coverage,
        discount: doc.Discount ?? doc.discount ?? 0,
        mrp: doc.MRP ?? doc.mrp ?? 0,
        sellingPrice: doc.Selling_Price ?? doc.sellingPrice ?? 0,
      };
    }),
    [summaryData]
  );

  const brandData = React.useMemo(() => getBrandData((normalizedSummaryData as unknown) as ProcessedData[]), [normalizedSummaryData])
  const productData = React.useMemo(() => getProductData((normalizedSummaryData as unknown) as ProcessedData[]), [normalizedSummaryData])
  const brandCoverage = React.useMemo(() => {
    // Always prefer server-computed brand coverage if present (reflects current filters)
    if (serverDashboard) {
      return serverDashboard.brandCoverage;
    }
    // Fallback: compute coverage from summary data
    return getCoverageByBrandData((normalizedSummaryData as unknown) as ProcessedData[]);
  }, [serverDashboard, normalizedSummaryData]);
  
  // Compute availability by brand from summary counts
  const summaryAvailabilityByBrand = React.useMemo(() => {
    const map = new Map<string, { available: number; listed: number }>();
    summaryData.forEach((doc: any) => {
      const brand = doc.Brand || doc.brand;
      const available = doc.availableCount ?? doc.available_count ?? 0;
      const listed = doc.listedCount ?? doc.listed_count ?? 0;
      const entry = map.get(brand) || { available: 0, listed: 0 };
      entry.available += available;
      entry.listed += listed;
      map.set(brand, entry);
    });
    return Array.from(map.entries()).map(([name, { available, listed }]) => ({
      name,
      availability: listed > 0 ? parseFloat(((available / listed) * 100).toFixed(1)) : 0,
    }));
  }, [summaryData]);
  
  // Compute penetration by brand from summary counts
  const summaryPenetrationByBrand = React.useMemo(() => {
    const map = new Map<string, { listed: number; total: number }>();
    summaryData.forEach((doc: any) => {
      const brand = doc.Brand || doc.brand;
      const listed = doc.listedCount ?? doc.listed_count ?? 0;
      const total = doc.totalCount ?? doc.total_count ?? 0;
      const entry = map.get(brand) || { listed: 0, total: 0 };
      entry.listed += listed;
      entry.total += total;
      map.set(brand, entry);
    });
    return Array.from(map.entries()).map(([name, { listed, total }]) => ({
      name,
      penetration: total > 0 ? parseFloat(((listed / total) * 100).toFixed(1)) : 0,
    }));
  }, [summaryData]);

  // Compute platform-level metrics from summary data
  const summaryPlatformMetrics = React.useMemo(() => {
    const map = new Map<string, { available: number; listed: number; total: number; discount: number; count: number }>();
    summaryData.forEach((doc: any) => {
      const platform = doc.Platform || doc.platform;
      if (!platform) return;
      const available = doc.availableCount ?? doc.available_count ?? 0;
      const listed = doc.listedCount ?? doc.listed_count ?? 0;
      const total = doc.totalCount ?? doc.total_count ?? 0;
      const discount = doc.Discount ?? doc.discount ?? 0;
      const entry = map.get(platform) || { available: 0, listed: 0, total: 0, discount: 0, count: 0 };
      entry.available += available;
      entry.listed += listed;
      entry.total += total;
      entry.discount += discount;
      entry.count += 1;
      map.set(platform, entry);
    });
    return Array.from(map.entries()).map(([name, { available, listed, total, discount, count }]) => ({
      name,
      availability: listed > 0 ? parseFloat(((available / listed) * 100).toFixed(1)) : 0,
      penetration: total > 0 ? parseFloat(((listed / total) * 100).toFixed(1)) : 0,
      discount: count > 0 ? parseFloat((discount / count).toFixed(1)) : 0,
    }));
  }, [summaryData]);

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

  // Create stable serverFilters object to prevent unnecessary re-fetches
  const serverFiltersRef = useRef<any>(null);
  const serverFilters = React.useMemo(() => {
    const newFilters = {
      brand: filters.brand.length > 0 ? filters.brand : undefined,
      company: filters.company.length > 0 ? filters.company : undefined,
      product: filters.product.length > 0 ? filters.product : undefined,
      city: filters.city.length > 0 ? filters.city : undefined,
      platform: filters.platform.length > 0 ? filters.platform : undefined,
      pincode: filters.pincode || undefined,
      from: filters.dateRange.from ? format(filters.dateRange.from, 'dd-MM-yyyy') : undefined,
      to: filters.dateRange.to ? format(filters.dateRange.to, 'dd-MM-yyyy') : undefined,
    };
    
    // Deep comparison to avoid unnecessary re-renders
    const hasChanged = !serverFiltersRef.current || 
      JSON.stringify(serverFiltersRef.current) !== JSON.stringify(newFilters);
    
    if (hasChanged) {
      serverFiltersRef.current = newFilters;
      return newFilters;
    }
    
    return serverFiltersRef.current;
  }, [
    filters.brand.join(','), 
    filters.company.join(','), 
    filters.product.join(','), 
    filters.city.join(','), 
    filters.platform.join(','), 
    filters.pincode, 
    filters.dateRange.from?.getTime(), 
    filters.dateRange.to?.getTime()
  ]);

  // Fetch summary (pre-aggregated) data
  const fetchingRef = useRef(false);
  const fetchData = async () => {
    // Dedupe identical fetches across remounts by checking filter key
    const currentFiltersKey = JSON.stringify(serverFilters);
    if (currentFiltersKey === lastFetchedFiltersKey) {
      return;
    }
    lastFetchedFiltersKey = currentFiltersKey;
    if (fetchingRef.current) {
      return;
    }
    
    fetchingRef.current = true;
    setIsLoading(true);
    
    try {
      const payload: DashboardPayload & { summaryData?: ProcessedData[] } = await fetchSummaryData(serverFilters);
      // Log summary calculation: numerator and denominator for KPIs
      const docs: any[] = (payload as any).summaryData || [];
      const sumTotal = docs.reduce((a, d) => a + (d.totalCount ?? d.total_count ?? 0), 0);
      const sumListed = docs.reduce((a, d) => a + (d.listedCount ?? d.listed_count ?? 0), 0);
      const sumAvailable = docs.reduce((a, d) => a + (d.availableCount ?? d.available_count ?? 0), 0);
      setServerDashboard(payload);
      setSummaryData(docs);
      setRawData(payload.rawData || []);
      // Only set unfiltered data if this is the first fetch (no filters applied)
      const hasFilters = Object.values(serverFilters).some(value => 
        Array.isArray(value) ? value.length > 0 : value !== undefined
      );
      if (!hasFilters && unfilteredSummaryData.length === 0) {
        setUnfilteredSummaryData(docs);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error occurred"));
    } finally {
      setIsLoading(false);
      fetchingRef.current = false;
    }
  }

  // Fetch unfiltered summary data once on mount for filters and key insights
  useEffect(() => {
    const fetchUnfilteredData = async () => {
      if (unfilteredSummaryData.length > 0) return; // Already cached
      
      try {
        const payload = await fetchSummaryData({}); // No filters
        const docs = (payload as any).summaryData || [];
        setUnfilteredSummaryData(docs);
      } catch (err) {
        console.error('Error fetching unfiltered summary data:', err);
      }
    };
    
    fetchUnfilteredData();
  }, []); // Only run once on mount

  // Only fetch on first mount or when server-side filters are applied
  const didMountRef = useRef(false)
  
  useEffect(() => {
    if (pauseSummary) return; // Skip summary fetch when paused
    if (!didMountRef.current) {
      didMountRef.current = true
      fetchData()
    } else {
      // Refetch summary data whenever any serverFilters value changes
      fetchData()
    }
  }, [serverFilters, pauseSummary])

  // Fetch raw detail data when a pincode is selected
  useEffect(() => {
    if (filters.pincode) {
      fetchRawData({ pincode: filters.pincode, from: serverFilters.from, to: serverFilters.to })
        .then(res => {
          setRawData(res.rawData.map(r => ({
            ...r,
            reportDate: typeof r.reportDate === 'string' && r.reportDate
              ? parseISO(r.reportDate)
              : new Date()
          })));
        })
        .catch(err => setError(err instanceof Error ? err : new Error(String(err))));
    }
  }, [filters.pincode, serverFilters.from, serverFilters.to]);

  // Raw data fetching for city drill-down is now handled individually by pages that need it
  // (e.g., Regional Analysis page) rather than globally in the data provider

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
        normalizedSummaryData,
        unfilteredSummaryData,
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
        summaryAvailabilityByBrand,
        summaryPenetrationByBrand,
        productData,
        choroplethData,
        cityChoroplethData,
        coverageChoroplethData,
        penetrationChoroplethData,
        lowestCoveragePlatform,
        lowestAvailabilityPlatform,
        refreshData,
        summaryPlatformMetrics,
        pauseSummary,
        setPauseSummary,
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
