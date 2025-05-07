"use client"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"
import { useData } from "@/components/data-provider"
import { useState } from "react"

export function RefreshButton() {
  const { refreshData } = useData()
  const [isRefreshing, setIsRefreshing] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await refreshData()
    setTimeout(() => setIsRefreshing(false), 1000) // Ensure spinner shows for at least 1 second
  }

  return (
    <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}>
      {isRefreshing ? (
        <>
          <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
          Refreshing...
        </>
      ) : (
        <>
          <Icons.refresh className="mr-2 h-4 w-4" />
          Refresh Data
        </>
      )}
    </Button>
  )
}
