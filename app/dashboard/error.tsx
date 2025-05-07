"use client"

import { useEffect } from "react"
import { ErrorMessage } from "@/components/error-message"

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="container mx-auto p-4">
      <ErrorMessage
        title="Dashboard Error"
        message="An error occurred while loading the dashboard data. Please try again."
        retry={reset}
      />
    </div>
  )
}
