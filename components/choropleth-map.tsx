"use client"

import { useEffect, useRef, useState } from "react"
import * as d3 from "d3"

interface ChoroplethData {
  id: string
  value: number
  city?: string
}

interface ChoroplethMapProps {
  data: ChoroplethData[]
  height?: number
  onCellClick?: (id: string) => void
}

// Add a utility function to properly capitalize city names
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
}

export function ChoroplethMap({ data, height = 400, onCellClick }: ChoroplethMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [hoveredCell, setHoveredCell] = useState<ChoroplethData | null>(null)

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const margin = { top: 20, right: 20, bottom: 30, left: 40 }
    const innerWidth = width - margin.left - margin.right
    const innerHeight = height - margin.top - margin.bottom

    // Since we don't have actual GeoJSON data, create a grid visualization
    const numCols = Math.min(Math.ceil(Math.sqrt(data.length * 1.5)), 12) // Wider grid for better readability
    const numRows = Math.ceil(data.length / numCols)
    const cellWidth = innerWidth / numCols
    const cellHeight = innerHeight / numRows

    // Color scale - green for good availability, red for poor
    const colorScale = d3.scaleSequential()
      .domain([0, 100])
      .interpolator(d3.interpolateRgb("#e53935", "#4caf50"))

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Create grid cells with improved design
    const cells = g.selectAll("g.cell")
      .data(data)
      .enter()
      .append("g")
      .attr("class", "cell")
      .attr("transform", (_: any, i: number) => {
        const x = (i % numCols) * cellWidth
        const y = Math.floor(i / numCols) * cellHeight
        return `translate(${x}, ${y})`
      })
      .style("cursor", onCellClick ? "pointer" : "default")
      .on("click", (event: any, d: ChoroplethData) => {
        if (onCellClick) onCellClick(d.id)
      })
      .on("mouseover", (event: any, d: ChoroplethData) => {
        setHoveredCell(d)
        
        // Highlight the cell
        d3.select(event.currentTarget)
          .select("rect")
          .attr("stroke", "#fff")
          .attr("stroke-width", 2)
      })
      .on("mouseout", (event: any) => {
        setHoveredCell(null)
        
        // Restore normal appearance
        d3.select(event.currentTarget)
          .select("rect")
          .attr("stroke", "#111")
          .attr("stroke-width", 1)
      })

    // Add rectangles
    cells.append("rect")
      .attr("width", cellWidth - 4)
      .attr("height", cellHeight - 4)
      .attr("rx", 4) // Rounded corners
      .attr("ry", 4)
      .attr("fill", (d: ChoroplethData) => colorScale(d.value))
      .attr("stroke", "#111")
      .attr("stroke-width", 1)

    // Add labels - show properly capitalized city name or ID
    cells.append("text")
      .attr("x", cellWidth / 2)
      .attr("y", cellHeight / 2 - 5)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", Math.min(cellWidth / 8, 12))
      .attr("font-weight", "bold")
      .attr("fill", (d: ChoroplethData) => d.value > 50 ? "#111" : "#fff")
      .text((d: ChoroplethData) => d.city ? toTitleCase(d.city) : toTitleCase(d.id))

    // Add value labels
    cells.append("text")
      .attr("x", cellWidth / 2)
      .attr("y", cellHeight / 2 + 10)
      .attr("text-anchor", "middle")
      .attr("dominant-baseline", "middle")
      .attr("font-size", Math.min(cellWidth / 9, 10))
      .attr("fill", (d: ChoroplethData) => d.value > 50 ? "#111" : "#fff")
      .text((d: ChoroplethData) => `${d.value}%`)

    // Add legend with improved design
    const legendWidth = Math.min(innerWidth * 0.6, 300)
    const legendHeight = 20
    const legendX = (innerWidth - legendWidth) / 2
    const legendY = innerHeight + 5

    const legendScale = d3.scaleLinear().domain([0, 100]).range([0, legendWidth])

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(5)
      .tickFormat((d: any) => `${d}%`)

    const defs = svg.append("defs")
    const linearGradient = defs
      .append("linearGradient")
      .attr("id", "legend-gradient")
      .attr("x1", "0%")
      .attr("y1", "0%")
      .attr("x2", "100%")
      .attr("y2", "0%")

    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", colorScale(0))
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", colorScale(100))

    g.append("rect")
      .attr("x", legendX)
      .attr("y", legendY)
      .attr("width", legendWidth)
      .attr("height", legendHeight)
      .attr("rx", 4)
      .attr("ry", 4)
      .style("fill", "url(#legend-gradient)")

    g.append("g")
      .attr("transform", `translate(${legendX}, ${legendY + legendHeight})`)
      .call(legendAxis)
      .attr("class", "legend-axis")
      .selectAll("text")
      .attr("font-size", "10px")

    g.append("text")
      .attr("x", legendX)
      .attr("y", legendY - 5)
      .attr("fill", "currentColor")
      .attr("font-size", "12px")
      .text("Stock Availability %")
      
    // Add a tooltip div for detailed information
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "choropleth-tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "rgba(0,0,0,0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000")
    
    cells.on("mousemove", (event: any, d: ChoroplethData) => {
      tooltip
        .style("visibility", "visible")
        .style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px")
        .html(`
          <div style="font-weight: bold; margin-bottom: 4px;">${d.city || d.id}</div>
          <div>ID: ${d.id}</div>
          <div>Availability: ${d.value}%</div>
          <div>Stock-out: ${100 - d.value}%</div>
        `)
    })
    .on("mouseout", () => {
      tooltip.style("visibility", "hidden")
    })
    
    // Clean up
    return () => {
      tooltip.remove()
    }
    
  }, [data, height, onCellClick])

  return (
    <div className="w-full h-full">
      <svg ref={svgRef} width="100%" height={height} />
      {hoveredCell && (
        <div className="text-sm mt-2 text-center">
          <span className="font-semibold">{hoveredCell.city || hoveredCell.id}</span>: {hoveredCell.value}% availability
        </div>
      )}
    </div>
  )
}
