import React from "react";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { Icons } from "@/components/icons";
import { Badge } from "@/components/ui/badge";

interface KeyInsightsProps {
  kpis: any;
  lowestCoveragePlatform: {
    name: string;
    coverageDelta: number;
    clientCoverage: number;
    competitorCoverage: number;
  } | null;
  lowestAvailabilityPlatform: {
    name: string;
    availabilityDelta: number;
    clientAvailability: number;
    competitorAvailability: number;
  } | null;
}

export const KeyInsights: React.FC<KeyInsightsProps> = ({ kpis, lowestCoveragePlatform, lowestAvailabilityPlatform }) => {
  const highestDeltaCompetitor = (kpis as any).highestAvailabilityDeltaFromCompetitors;

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
        {/* Low Coverage Region */}
        <div className="data-card card-hover">
          <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
            <Icons.alert className="h-5 w-5 text-red-500" />
            <h3 className="font-medium text-lg">Low Coverage Region</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold capitalize">{kpis.lowestCoverageRegion.name || "-"}</p>
              <Badge variant="outline" className={kpis.lowestCoverageRegion.delta > 0 ? "badge-change-positive" : "badge-change-negative"}>
                {kpis.lowestCoverageRegion.delta > 0 ? "+" : ""}{kpis.lowestCoverageRegion.delta.toFixed(1)}%
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Your Coverage</span>
                <span className="font-semibold">{kpis.lowestCoverageRegion.value.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${kpis.lowestCoverageRegion.value}%` }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Competitor Coverage</span>
                <span className="font-semibold">{(kpis.lowestCoverageRegion as any).competitorCoverage?.toFixed(1) || '0.0'}%</span>
              </div>
              <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${(kpis.lowestCoverageRegion as any).competitorCoverage > 0 ? Math.max((kpis.lowestCoverageRegion as any).competitorCoverage, 1) : 0}%` }}></div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              This region has the lowest product coverage.
              {kpis.lowestCoverageRegion.delta !== 0 && (
                <span> Here, coverage is {kpis.lowestCoverageRegion.delta > 0 ? 'higher' : 'lower'} by {Math.abs(kpis.lowestCoverageRegion.delta).toFixed(1)}% compared to competitors.</span>
              )}
            </p>
          </div>
        </div>

        {/* Largest Availability Gap vs. Competitors */}
        <div className="data-card card-hover">
          <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
            <Icons.alert className="h-5 w-5 text-red-500" />
            <h3 className="font-medium text-lg">Largest Availability Gap</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-2xl font-bold capitalize">{highestDeltaCompetitor?.name || kpis.highestAvailabilityDeltaRegion.name || "-"}</p>
              <Badge variant="outline" className="badge-change-negative">
                {((highestDeltaCompetitor?.delta ?? kpis.highestAvailabilityDeltaRegion.delta) > 0 ? '+' : '') + ((highestDeltaCompetitor?.delta ?? kpis.highestAvailabilityDeltaRegion.delta).toFixed(1))}%
              </Badge>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Your Availability</span>
                <span className="font-semibold">{(highestDeltaCompetitor?.value ?? kpis.highestAvailabilityDeltaRegion.value).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${Math.max((highestDeltaCompetitor?.value ?? kpis.highestAvailabilityDeltaRegion.value), 1)}%` }}></div>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Competitor Availability</span>
                <span className="font-semibold">{(highestDeltaCompetitor?.competitors ?? 0).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${Math.max(highestDeltaCompetitor?.competitors ?? 0, 1)}%` }}></div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              This region has the largest availability gap compared to competitor brands.
              This represents an opportunity to improve your distribution in a competitive marketplace.
            </p>
          </div>
        </div>

        {/* Low Coverage Platform */}
        {lowestCoveragePlatform && (
          <div className="data-card card-hover">
            <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
              <Icons.alert className="h-5 w-5 text-red-500" />
              <h3 className="font-medium text-lg">Low Coverage Platform</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold capitalize">{lowestCoveragePlatform.name}</p>
                <Badge variant="outline" className={`${lowestCoveragePlatform.coverageDelta > 0 ? 'badge-change-positive' : 'badge-change-negative'}`}>{lowestCoveragePlatform.coverageDelta > 0 ? '+' : ''}{lowestCoveragePlatform.coverageDelta.toFixed(1)}%</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Your Coverage</span>
                  <span className="font-semibold">{lowestCoveragePlatform.clientCoverage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${lowestCoveragePlatform.clientCoverage}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Competitor Coverage</span>
                  <span className="font-semibold">{lowestCoveragePlatform.competitorCoverage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${lowestCoveragePlatform.competitorCoverage}%` }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                This platform has the lowest product coverage.{lowestCoveragePlatform.coverageDelta !== 0 && (<span> Here, coverage is {lowestCoveragePlatform.coverageDelta > 0 ? 'higher' : 'lower'} by {Math.abs(lowestCoveragePlatform.coverageDelta).toFixed(1)}% compared to competitors.</span>)}
              </p>
            </div>
          </div>
        )}

        {/* Low Availability Platform */}
        {lowestAvailabilityPlatform && (
          <div className="data-card card-hover">
            <div className="bg-red-900/10 dark:bg-red-900/20 p-4 border-b flex items-center gap-2">
              <Icons.alert className="h-5 w-5 text-red-500" />
              <h3 className="font-medium text-lg">Low Availability Platform</h3>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-2xl font-bold capitalize">{lowestAvailabilityPlatform.name}</p>
                <Badge variant="outline" className={`${lowestAvailabilityPlatform.availabilityDelta > 0 ? 'badge-change-positive' : 'badge-change-negative'}`}>{lowestAvailabilityPlatform.availabilityDelta > 0 ? '+' : ''}{lowestAvailabilityPlatform.availabilityDelta.toFixed(1)}%</Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Your Availability</span>
                  <span className="font-semibold">{lowestAvailabilityPlatform.clientAvailability.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${lowestAvailabilityPlatform.clientAvailability}%` }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Competitor Availability</span>
                  <span className="font-semibold">{lowestAvailabilityPlatform.competitorAvailability.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-slate-800/50 rounded-full h-2.5">
                  <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${lowestAvailabilityPlatform.competitorAvailability}%` }}></div>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                This platform has the lowest product availability.{lowestAvailabilityPlatform.availabilityDelta !== 0 && (<span> Here, availability is {lowestAvailabilityPlatform.availabilityDelta > 0 ? 'higher' : 'lower'} by {Math.abs(lowestAvailabilityPlatform.availabilityDelta).toFixed(1)}% compared to competitors.</span>)}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 