"use client"

import { FilterBar } from "@/components/filters/filter-bar"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { BarChart, PieChart } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { useData } from "@/components/data-provider"
import { Skeleton } from "@/components/ui/skeleton"

export default function PlatformInsightsPage() {
  const { isLoading, platformData, platformShareData } = useData()

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Platform Insights</h2>
        <p className="text-muted-foreground">Compare performance across Swiggy, Flipkart, Zepto, and Blinkit.</p>
      </div>

      <Separator />

      <FilterBar />

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="card-hover col-span-2">
          <CardHeader>
            <CardTitle>Platform Ranking by Sales Value</CardTitle>
            <CardDescription>Comparative sales performance across all platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="aspect-[21/9] w-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <BarChart
                data={platformData}
                categories={["salesValue"]}
                index="name"
                colors={["#ff6d00"]}
                valueFormatter={(value: number) => `₹${(value / 1000).toFixed(0)}K`}
                showLegend={false}
                showGridLines={true}
                className="aspect-[21/9]"
              />
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader className="pb-3">
            <CardTitle>7-Day Trend Lines</CardTitle>
            <CardDescription>Key metrics changes over the last week</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px]">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <div className="space-y-8">
                <div className="trend-card">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Price Change</h4>
                    <span className="text-xs text-muted-foreground">Last 7 days</span>
                  </div>
                  <div className="platform-metrics">
                    {platformData.map((platform) => (
                      <div key={`price-${platform.name}`} className="metrics-card">
                        <p className="text-xs font-medium">{platform.name}</p>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${
                            platform.priceChange > 0 
                              ? "badge-change-negative" 
                              : platform.priceChange < 0 
                                ? "badge-change-positive" 
                                : "badge-change-neutral"
                          }`}
                        >
                          {isNaN(platform.priceChange) ? "--" : 
                            `${platform.priceChange > 0 ? "+" : ""}${platform.priceChange}%`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="trend-card">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Discount Change</h4>
                    <span className="text-xs text-muted-foreground">Last 7 days</span>
                  </div>
                  <div className="platform-metrics">
                    {platformData.map((platform) => (
                      <div key={`discount-${platform.name}`} className="metrics-card">
                        <p className="text-xs font-medium">{platform.name}</p>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${
                            platform.discountChange > 0 
                              ? "badge-change-positive" 
                              : platform.discountChange < 0 
                                ? "badge-change-negative" 
                                : "badge-change-neutral"
                          }`}
                        >
                          {isNaN(platform.discountChange) ? "--" : 
                            `${platform.discountChange > 0 ? "+" : ""}${platform.discountChange}%`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="trend-card">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-medium">Availability Change</h4>
                    <span className="text-xs text-muted-foreground">Last 7 days</span>
                  </div>
                  <div className="platform-metrics">
                    {platformData.map((platform) => (
                      <div key={`avail-${platform.name}`} className="metrics-card">
                        <p className="text-xs font-medium">{platform.name}</p>
                        <Badge
                          variant="outline"
                          className={`mt-1 ${
                            platform.availabilityChange > 0 
                              ? "badge-change-positive" 
                              : platform.availabilityChange < 0 
                                ? "badge-change-negative" 
                                : "badge-change-neutral"
                          }`}
                        >
                          {isNaN(platform.availabilityChange) ? "--" : 
                            `${platform.availabilityChange > 0 ? "+" : ""}${platform.availabilityChange}%`}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle>Platform Share</CardTitle>
            <CardDescription>Distribution of sales across platforms</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="aspect-square w-full">
                <Skeleton className="h-full w-full" />
              </div>
            ) : (
              <PieChart
                data={platformShareData}
                category="value"
                index="name"
                colors={["#ff6d00", "#ff9e40", "#ffbd80", "#ffdcbf"]}
                valueFormatter={(value: number) => `${value}%`}
                className="aspect-square"
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
