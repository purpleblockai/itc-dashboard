"use client"

import { useEffect } from "react"
import { ErrorMessage } from "@/components/error-message"
import { Button } from "@/components/ui/button"

export default function Error({
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
    <div className="flex h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
        <ErrorMessage
          title="Something went wrong!"
          message="An error occurred while loading the dashboard. Please try again."
          retry={reset}
        />
        <div className="mt-4 flex justify-center">
          <Button variant="default" onClick={() => (window.location.href = "/")}>
            Go to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
