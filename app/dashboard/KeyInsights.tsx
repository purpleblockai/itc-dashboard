import React from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";
import { useData } from "@/components/data-provider";
import { useSession } from "next-auth/react";

interface KeyInsightsProps {}

// Define types for the insights
type AvailabilityGap = {
  name: string;
  clientAvailability: number;
  competitorAvailability: number;
  availabilityDelta: number;
};

type CoverageRegion = {
  name: string;
  value: number;
  competitorCoverage: number;
  delta: number;
};

type CoveragePlatform = {
  name: string;
  clientCoverage: number;
  competitorCoverage: number;
  coverageDelta: number;
};

type AvailabilityPlatform = {
  name: string;
  clientAvailability: number;
  competitorAvailability: number;
  availabilityDelta: number;
};

type KeyInsightsResult = {
  largestAvailabilityGap: AvailabilityGap | null;
  lowCoverageRegion: CoverageRegion | null;
  lowCoveragePlatform: CoveragePlatform | null;
  lowAvailabilityPlatform: AvailabilityPlatform | null;
};

export const KeyInsights: React.FC<KeyInsightsProps> = () => {
  const { isLoading, unfilteredSummaryData } = useData();
  const { data: session } = useSession();
  const userClientName = (session?.user as any)?.clientName || "";

  // Compute key insights from unfiltered summary data from DataProvider (never changes with filters)
  const keyInsights = React.useMemo((): KeyInsightsResult => {
    if (!unfilteredSummaryData || unfilteredSummaryData.length === 0 || !userClientName) {
      return {
        largestAvailabilityGap: null,
        lowCoverageRegion: null,
        lowCoveragePlatform: null,
        lowAvailabilityPlatform: null,
      };
    }

    // Normalize the data similar to how it's done in data-provider
    const staticSummaryData = unfilteredSummaryData.map((item: any) => ({
      ...item,
      brand: item.Brand || item.brand,
      name: item.Name || item.name,
      company: item.Company || item.company,
      city: item.City || item.city,
      platform: item.Platform || item.platform,
      category: item.Category || item.category,
      uniqueProductId: item.Unique_Product_ID || item.uniqueProductId,
      availability: (item.listedCount || item.listed_count || 0) > 0 ? 
        (item.availableCount || item.available_count || 0) / (item.listedCount || item.listed_count || 0) : 0,
      coverage: (item.listedCount || item.listed_count || 0) > 0 ? 
        (item.availableCount || item.available_count || 0) / (item.listedCount || item.listed_count || 0) : 0,
      discount: item.Discount ?? item.discount ?? 0,
      mrp: item.MRP ?? item.mrp ?? 0,
      sellingPrice: item.Selling_Price ?? item.sellingPrice ?? 0,
    }));

    // Separate client data from competitor data
    const clientData = staticSummaryData.filter((item: any) => item.company === userClientName);
    const competitorData = staticSummaryData.filter((item: any) => item.company !== userClientName);

    // 1. Largest Availability Gap by City - aggregate by city first
    const cityAggregation = new Map<string, {
      clientListed: number;
      clientAvailable: number;
      competitorListed: number;
      competitorAvailable: number;
    }>();

    // Aggregate client data by city
    clientData.forEach((item: any) => {
      const city = item.city;
      const listed = item.listedCount || item.listed_count || 0;
      const available = item.availableCount || item.available_count || 0;
      
      if (!cityAggregation.has(city)) {
        cityAggregation.set(city, { clientListed: 0, clientAvailable: 0, competitorListed: 0, competitorAvailable: 0 });
      }
      const entry = cityAggregation.get(city)!;
      entry.clientListed += listed;
      entry.clientAvailable += available;
    });

    // Aggregate competitor data by city
    competitorData.forEach((item: any) => {
      const city = item.city;
      const listed = item.listedCount || item.listed_count || 0;
      const available = item.availableCount || item.available_count || 0;
      
      if (!cityAggregation.has(city)) {
        cityAggregation.set(city, { clientListed: 0, clientAvailable: 0, competitorListed: 0, competitorAvailable: 0 });
      }
      const entry = cityAggregation.get(city)!;
      entry.competitorListed += listed;
      entry.competitorAvailable += available;
    });

    // Calculate availability percentages and find largest gap
    let largestAvailabilityGap = null;
    let maxGap = -Infinity;
    cityAggregation.forEach((value, city) => {
      const clientAvailability = value.clientListed > 0 ? (value.clientAvailable / value.clientListed) * 100 : 0;
      const competitorAvailability = value.competitorListed > 0 ? (value.competitorAvailable / value.competitorListed) * 100 : 0;
      const gap = competitorAvailability - clientAvailability;
      
      if (gap > maxGap) {
        maxGap = gap;
        largestAvailabilityGap = {
          name: city,
          clientAvailability: parseFloat(clientAvailability.toFixed(1)),
          competitorAvailability: parseFloat(competitorAvailability.toFixed(1)),
          availabilityDelta: parseFloat((clientAvailability - competitorAvailability).toFixed(1)),
        };
      }
    });

    // 2. Low Coverage Region - find region with highest coverage gap (like availability)
    let lowCoverageRegion = null;
    let maxCoverageGap = -Infinity;
    cityAggregation.forEach((value, city) => {
      const clientCoverage = value.clientListed > 0 ? (value.clientAvailable / value.clientListed) * 100 : 0;
      const competitorCoverage = value.competitorListed > 0 ? (value.competitorAvailable / value.competitorListed) * 100 : 0;
      const coverageGap = competitorCoverage - clientCoverage;
      
      if (coverageGap > maxCoverageGap) {
        maxCoverageGap = coverageGap;
        lowCoverageRegion = {
          name: city,
          value: parseFloat(clientCoverage.toFixed(1)),
          competitorCoverage: parseFloat(competitorCoverage.toFixed(1)),
          delta: parseFloat((clientCoverage - competitorCoverage).toFixed(1)),
        };
      }
    });

    // 3. Low Coverage Platform - aggregate by platform
    const platformAggregation = new Map<string, {
      clientListed: number;
      clientAvailable: number;
      competitorListed: number;
      competitorAvailable: number;
    }>();

    // Aggregate client data by platform
    clientData.forEach((item: any) => {
      const platform = item.platform;
      const listed = item.listedCount || item.listed_count || 0;
      const available = item.availableCount || item.available_count || 0;
      
      if (!platformAggregation.has(platform)) {
        platformAggregation.set(platform, { clientListed: 0, clientAvailable: 0, competitorListed: 0, competitorAvailable: 0 });
      }
      const entry = platformAggregation.get(platform)!;
      entry.clientListed += listed;
      entry.clientAvailable += available;
    });

    // Aggregate competitor data by platform
    competitorData.forEach((item: any) => {
      const platform = item.platform;
      const listed = item.listedCount || item.listed_count || 0;
      const available = item.availableCount || item.available_count || 0;
      
      if (!platformAggregation.has(platform)) {
        platformAggregation.set(platform, { clientListed: 0, clientAvailable: 0, competitorListed: 0, competitorAvailable: 0 });
      }
      const entry = platformAggregation.get(platform)!;
      entry.competitorListed += listed;
      entry.competitorAvailable += available;
    });

    // Find platform with lowest client coverage
    let lowCoveragePlatform = null;
    let minPlatformCoverage = Infinity;
    platformAggregation.forEach((value, platform) => {
      const clientCoverage = value.clientListed > 0 ? (value.clientAvailable / value.clientListed) * 100 : 0;
      const competitorCoverage = value.competitorListed > 0 ? (value.competitorAvailable / value.competitorListed) * 100 : 0;
      const coverageDelta = clientCoverage - competitorCoverage;
      
      if (clientCoverage < minPlatformCoverage) {
        minPlatformCoverage = clientCoverage;
        lowCoveragePlatform = {
          name: platform,
          clientCoverage: parseFloat(clientCoverage.toFixed(1)),
          competitorCoverage: parseFloat(competitorCoverage.toFixed(1)),
          coverageDelta: parseFloat(coverageDelta.toFixed(1)),
        };
      }
    });

    // 4. Low Availability Platform - same as coverage but for availability
    let lowAvailabilityPlatform = null;
    let minPlatformAvailability = Infinity;
    platformAggregation.forEach((value, platform) => {
      const clientAvailability = value.clientListed > 0 ? (value.clientAvailable / value.clientListed) * 100 : 0;
      const competitorAvailability = value.competitorListed > 0 ? (value.competitorAvailable / value.competitorListed) * 100 : 0;
      const availabilityDelta = clientAvailability - competitorAvailability;
      
      if (clientAvailability < minPlatformAvailability) {
        minPlatformAvailability = clientAvailability;
        lowAvailabilityPlatform = {
          name: platform,
          clientAvailability: parseFloat(clientAvailability.toFixed(1)),
          competitorAvailability: parseFloat(competitorAvailability.toFixed(1)),
          availabilityDelta: parseFloat(availabilityDelta.toFixed(1)),
        };
      }
    });

    return {
      largestAvailabilityGap,
      lowCoverageRegion,
      lowCoveragePlatform,
      lowAvailabilityPlatform,
    };
  }, [unfilteredSummaryData, userClientName]);

  if (isLoading) {
    return (
      <Card className="data-card mb-6">
        <CardHeader className="border-b">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Icons.lightbulb className="h-6 w-6 text-yellow-500" />
            Key Insights
          </CardTitle>
          <CardDescription>Loading insights...</CardDescription>
        </CardHeader>
        <CardContent className="platform-metrics">
          <div className="animate-pulse space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="data-card mb-6">
      <CardHeader className="border-b">
        <CardTitle className="flex items-center gap-2 text-2xl">
          <Icons.lightbulb className="h-6 w-6 text-yellow-500" />
          Key Insights
        </CardTitle>
        <CardDescription>A comparative analysis of your brand against key competitors across critical performance metrics, including percentage changes from the previous reporting period.</CardDescription>
      </CardHeader>
      <CardContent className="platform-metrics">
        {/* Largest Availability Gap */}
        {keyInsights.largestAvailabilityGap && (
          <div className="data-card card-hover">
            <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
              <Icons.alert className="h-5 w-5 text-red-500" />
              <h3 className="font-medium text-lg">Largest Availability Gap</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold capitalize">{keyInsights.largestAvailabilityGap.name}</p>
                <Badge variant="outline" className="badge-change-negative">
                  {keyInsights.largestAvailabilityGap.availabilityDelta > 0 ? '+' : ''}{keyInsights.largestAvailabilityGap.availabilityDelta}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Your Availability</span>
                  <span className="font-semibold">{keyInsights.largestAvailabilityGap.clientAvailability}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.max(keyInsights.largestAvailabilityGap.clientAvailability, 1)}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Competitor Availability</span>
                  <span className="font-semibold">{keyInsights.largestAvailabilityGap.competitorAvailability}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${Math.max(keyInsights.largestAvailabilityGap.competitorAvailability, 1)}%` }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                This city has the largest availability gap compared to competitor brands.
                This represents an opportunity to improve your distribution in a competitive marketplace.
              </p>
            </div>
          </div>
        )}

        {/* Low Coverage Region */}
        {keyInsights.lowCoverageRegion && (
          <div className="data-card card-hover">
            <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
              <Icons.alert className="h-5 w-5 text-red-500" />
              <h3 className="font-medium text-lg">Low Coverage Region</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold capitalize">{keyInsights.lowCoverageRegion.name}</p>
                <Badge variant="outline" className={keyInsights.lowCoverageRegion.delta > 0 ? "badge-change-positive" : "badge-change-negative"}>
                  {keyInsights.lowCoverageRegion.delta > 0 ? "+" : ""}{keyInsights.lowCoverageRegion.delta}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Your Coverage</span>
                  <span className="font-semibold">{keyInsights.lowCoverageRegion.value}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${keyInsights.lowCoverageRegion.value}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Competitor Coverage</span>
                  <span className="font-semibold">{keyInsights.lowCoverageRegion.competitorCoverage}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${Math.max(keyInsights.lowCoverageRegion.competitorCoverage, 1)}%` }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                This region has the lowest product coverage for your brand.
                {keyInsights.lowCoverageRegion.delta !== 0 && (
                  <span> Here, coverage is {keyInsights.lowCoverageRegion.delta > 0 ? 'higher' : 'lower'} by {Math.abs(keyInsights.lowCoverageRegion.delta)}% compared to competitors.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Low Coverage Platform */}
        {keyInsights.lowCoveragePlatform && (
          <div className="data-card card-hover">
            <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
              <Icons.alert className="h-5 w-5 text-red-500" />
              <h3 className="font-medium text-lg">Low Coverage Platform</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold capitalize">{keyInsights.lowCoveragePlatform.name}</p>
                <Badge variant="outline" className={`${keyInsights.lowCoveragePlatform.coverageDelta > 0 ? 'badge-change-positive' : 'badge-change-negative'}`}>
                  {keyInsights.lowCoveragePlatform.coverageDelta > 0 ? '+' : ''}{keyInsights.lowCoveragePlatform.coverageDelta}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Your Coverage</span>
                  <span className="font-semibold">{keyInsights.lowCoveragePlatform.clientCoverage}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${keyInsights.lowCoveragePlatform.clientCoverage}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Competitor Coverage</span>
                  <span className="font-semibold">{keyInsights.lowCoveragePlatform.competitorCoverage}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${keyInsights.lowCoveragePlatform.competitorCoverage}%` }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                This platform has the lowest product coverage for your brand.
                {keyInsights.lowCoveragePlatform.coverageDelta !== 0 && (
                  <span> Here, coverage is {keyInsights.lowCoveragePlatform.coverageDelta > 0 ? 'higher' : 'lower'} by {Math.abs(keyInsights.lowCoveragePlatform.coverageDelta)}% compared to competitors.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Low Availability Platform */}
        {keyInsights.lowAvailabilityPlatform && (
          <div className="data-card card-hover">
            <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
              <Icons.alert className="h-5 w-5 text-red-500" />
              <h3 className="font-medium text-lg">Low Availability Platform</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold capitalize">{keyInsights.lowAvailabilityPlatform.name}</p>
                <Badge variant="outline" className={`${keyInsights.lowAvailabilityPlatform.availabilityDelta > 0 ? 'badge-change-positive' : 'badge-change-negative'}`}>
                  {keyInsights.lowAvailabilityPlatform.availabilityDelta > 0 ? '+' : ''}{keyInsights.lowAvailabilityPlatform.availabilityDelta}%
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Your Availability</span>
                  <span className="font-semibold">{keyInsights.lowAvailabilityPlatform.clientAvailability}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${keyInsights.lowAvailabilityPlatform.clientAvailability}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Competitor Availability</span>
                  <span className="font-semibold">{keyInsights.lowAvailabilityPlatform.competitorAvailability}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${keyInsights.lowAvailabilityPlatform.competitorAvailability}%` }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                This platform has the lowest product availability for your brand.
                {keyInsights.lowAvailabilityPlatform.availabilityDelta !== 0 && (
                  <span> Here, availability is {keyInsights.lowAvailabilityPlatform.availabilityDelta > 0 ? 'higher' : 'lower'} by {Math.abs(keyInsights.lowAvailabilityPlatform.availabilityDelta)}% compared to competitors.</span>
                )}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 
