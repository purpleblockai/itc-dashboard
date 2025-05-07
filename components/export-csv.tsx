"use client"

import { Button } from "@/components/ui/button"
import { Icons } from "@/components/icons"

interface ExportCSVProps<T> {
  data: T[]
  filename?: string
}

export function ExportCSV<T>({ data, filename = "export" }: ExportCSVProps<T>) {
  const handleExport = () => {
    if (!data.length) return

    // Get headers from first object
    const headers = Object.keys(data[0])

    // Convert data to CSV format
    const csvRows = [
      // Add headers
      headers.join(","),
      // Add data rows
      ...data.map((row) =>
        headers
          .map((header) => {
            const cell = row[header as keyof T]
            // Handle special cases like objects, arrays, etc.
            const value = typeof cell === "object" && cell !== null ? JSON.stringify(cell).replace(/"/g, '""') : cell

            // Escape commas and quotes
            return `"${value}"`
          })
          .join(","),
      ),
    ]

    // Create CSV content
    const csvContent = csvRows.join("\n")

    // Create a blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.setAttribute("href", url)
    link.setAttribute("download", `${filename}-${new Date().toISOString().split("T")[0]}.csv`)
    link.style.visibility = "hidden"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <Icons.fileDown className="mr-2 h-4 w-4" />
      Export CSV
    </Button>
  )
}
