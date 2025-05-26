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
  heatmapType?: "availability" | "coverage" | "penetration"
}

// Add a utility function to properly capitalize city names
function toTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) => {
    return txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase();
  });
}

export function ChoroplethMap({ data, height = 400, onCellClick, heatmapType = "availability" }: ChoroplethMapProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const [hoveredCell, setHoveredCell] = useState<ChoroplethData | null>(null)
  const [selectedCell, setSelectedCell] = useState<string | null>(null)

  // Helper function to get the metric name for display
  const getMetricName = () => {
    switch (heatmapType) {
      case "coverage":
        return "Coverage";
      case "penetration":
        return "Penetration";
      default:
        return "Stock Availability";
    }
  }

  useEffect(() => {
    if (!svgRef.current || !data.length) return

    // Clear previous content
    d3.select(svgRef.current).selectAll("*").remove()

    const svg = d3.select(svgRef.current)
    const width = svgRef.current.clientWidth
    const margin = { top: 20, right: 20, bottom: 90, left: 40 } // Increased bottom margin from 70 to 90
    const innerWidth = width - margin.left - margin.right
    
    // Calculate grid dimensions based on data
    const numCols = Math.min(Math.ceil(Math.sqrt(data.length * 1.5)), 12) // Wider grid for better readability
    const numRows = Math.ceil(data.length / numCols)
    // Base cell dimensions
    const baseCellWidth = innerWidth / numCols
    const baseCellHeight = (height - margin.top - margin.bottom) / Math.max(numRows, 1)
    // Enforce minimum cell size for readability (scrollable container handles overflow)
    const minCellWidth = 150
    const minCellHeight = 80
    const cellWidth = Math.max(baseCellWidth, minCellWidth)
    const cellHeight = Math.max(baseCellHeight, minCellHeight)

    // For single city case, adjust the cell size to be centered
    const isSingleCity = data.length === 1
    const singleCityCellWidth = Math.min(innerWidth * 0.5, 200)
    const singleCityCellHeight = Math.min((height - margin.top - margin.bottom) * 0.5, 200)
    
    // Use adjusted width/height for single city
    const finalCellWidth = isSingleCity ? singleCityCellWidth : cellWidth
    const finalCellHeight = isSingleCity ? singleCityCellHeight : cellHeight

    // Calculate the total grid height
    const gridHeight = isSingleCity 
      ? singleCityCellHeight 
      : Math.ceil(data.length / numCols) * cellHeight;
    
    // Set the inner height based on grid content
    const innerHeight = gridHeight;

    // Define color gradient and legend stops based on metric type
    let interpolator: (t: number) => string;
    let legendStart = "";
    let legendEnd = "";

    // Override colors: low values red, high values green
    interpolator = d3.interpolateRgb("#ff0000", "#00ff00");
    legendStart = "#ff0000";
    legendEnd = "#00ff00";

    // Compute dynamic domain based on data values
    const values = data.map(d => d.value);
    const [minValue, maxValue] = d3.extent(values) as [number, number];

    const colorScale = d3.scaleSequential()
      .domain([minValue, maxValue])
      .interpolator(interpolator);

    const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`)

    // Handle single city differently
    if (isSingleCity) {
      const centerX = (innerWidth - singleCityCellWidth) / 2;
      const centerY = (innerHeight - singleCityCellHeight) / 3; // Position higher up to avoid legend overlap
      
      // Create a single cell
      const cell = g.append("g")
        .attr("class", "cell")
        .attr("data-id", data[0].id)
        .attr("transform", `translate(${centerX}, ${centerY})`)
        .style("cursor", onCellClick ? "pointer" : "default")
        .on("click", (event: any, d: any) => {
          if (onCellClick) onCellClick(data[0].id)
          setSelectedCell(data[0].id)
          
          // Reset previous selection
          d3.selectAll("g.cell rect")
            .attr("stroke", "#111")
            .attr("stroke-width", 1)
            
          // Highlight new selection
          d3.select(event.currentTarget)
            .select("rect")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
        })
        .on("mouseover", (event: any) => {
          setHoveredCell(data[0])
          
          // Highlight the cell
          d3.select(event.currentTarget)
            .select("rect")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
        })
        .on("mouseout", (event: any) => {
          setHoveredCell(null)
          
          // Only remove highlight if this is not the selected cell
          if (selectedCell !== data[0].id) {
            d3.select(event.currentTarget)
              .select("rect")
              .attr("stroke", "#111")
              .attr("stroke-width", 1)
          }
        });
        
      // Add rectangle
      cell.append("rect")
        .attr("width", singleCityCellWidth - 4)
        .attr("height", singleCityCellHeight - 4)
        .attr("rx", 4) // Rounded corners
        .attr("ry", 4)
        .attr("fill", colorScale(data[0].value))
        .attr("stroke", selectedCell === data[0].id ? "#fff" : "#111")
        .attr("stroke-width", selectedCell === data[0].id ? 2 : 1);
        
      // Add label
      cell.append("text")
        .attr("x", singleCityCellWidth / 2)
        .attr("y", singleCityCellHeight / 2 - 10)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 16)
        .attr("font-weight", "bold")
        .attr("fill", data[0].value > 50 ? "#111" : "#fff")
        .text(data[0].city ? toTitleCase(data[0].city) : toTitleCase(data[0].id));
        
      // Add value label
      cell.append("text")
        .attr("x", singleCityCellWidth / 2)
        .attr("y", singleCityCellHeight / 2 + 15)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("font-size", 14)
        .attr("fill", data[0].value > 50 ? "#111" : "#fff")
        .text(`${data[0].value}%`);
    } 
    else {
      // Create grid cells for multiple cities
      const cells = g.selectAll("g.cell")
        .data(data)
        .enter()
        .append("g")
        .attr("class", "cell")
        .attr("data-id", (d: ChoroplethData) => d.id)
        .attr("transform", (_: any, i: number) => {
          const x = (i % numCols) * cellWidth
          const y = Math.floor(i / numCols) * cellHeight
          return `translate(${x}, ${y})`
        })
        .style("cursor", onCellClick ? "pointer" : "default")
        .on("click", (event: any, d: ChoroplethData) => {
          if (onCellClick) onCellClick(d.id)
          setSelectedCell(d.id)
          
          // Reset previous selection
          d3.selectAll("g.cell rect")
            .attr("stroke", "#111")
            .attr("stroke-width", 1)
            
          // Highlight new selection
          d3.select(event.currentTarget)
            .select("rect")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
        })
        .on("mouseover", (event: any, d: ChoroplethData) => {
          setHoveredCell(d)
          
          // Highlight the cell
          d3.select(event.currentTarget)
            .select("rect")
            .attr("stroke", "#fff")
            .attr("stroke-width", 2)
        })
        .on("mouseout", (event: any, d: ChoroplethData) => {
          setHoveredCell(null)
          
          // Only remove highlight if this is not the selected cell
          if (selectedCell !== d.id) {
            d3.select(event.currentTarget)
              .select("rect")
              .attr("stroke", "#111")
              .attr("stroke-width", 1)
          }
        })

      // Add rectangles
      cells.append("rect")
        .attr("width", cellWidth - 4)
        .attr("height", cellHeight - 4)
        .attr("rx", 4) // Rounded corners
        .attr("ry", 4)
        .attr("fill", (d: ChoroplethData) => colorScale(d.value))
        .attr("stroke", (d: ChoroplethData) => selectedCell === d.id ? "#fff" : "#111")
        .attr("stroke-width", (d: ChoroplethData) => selectedCell === d.id ? 2 : 1)

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
    }

    // Calculate the legend position based on grid content
    const legendWidth = Math.min(innerWidth * 0.6, 300)
    const legendHeight = 20
    const legendX = (innerWidth - legendWidth) / 2
    
    // Position the legend below all grid cells with increased spacing
    const legendY = innerHeight + 40 // Increased from 20 to 40 for more spacing
    
    // Increase the SVG height to accommodate the legend with more spacing
    svg.attr("height", margin.top + innerHeight + margin.bottom + 20) // Added 20px extra padding
    // Set SVG width to total content width for horizontal scrolling
    const totalWidth = margin.left + (cellWidth * numCols) + margin.right;
    svg.attr("width", totalWidth);

    const legendScale = d3.scaleLinear()
      .domain([minValue, maxValue])
      .range([0, legendWidth])

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

    // Legend gradient stops based on metric type
    linearGradient.append("stop").attr("offset", "0%").attr("stop-color", legendStart);
    linearGradient.append("stop").attr("offset", "100%").attr("stop-color", legendEnd);

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
      .attr("x", legendX + legendWidth / 2)
      .attr("y", legendY - 12) // Increased spacing from -8 to -12
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", "14px")
      .attr("font-weight", "bold")
      .text(`${getMetricName()} %`)
    
    // Add current selected or hovered cell information below the legend
    const cellInfoY = legendY + legendHeight + 45; // Increased from 35 to 45 for more spacing
    
    // Create a text element that will be updated when hovering
    const cellInfoText = g.append("text")
      .attr("class", "cell-info")
      .attr("x", innerWidth / 2)
      .attr("y", cellInfoY)
      .attr("text-anchor", "middle")
      .attr("fill", "currentColor")
      .attr("font-size", "14px")
      .style("font-weight", "medium")
    
    // Update the cell info when a cell is hovered
    function updateCellInfo(d: ChoroplethData | null) {
      if (!d) {
        // Use selected cell if available and no hover
        if (selectedCell) {
          const selected = data.find(item => item.id === selectedCell);
          if (selected) {
            const formattedName = toTitleCase(selected.city || selected.id);
            cellInfoText.text(`${selected.id}: ${selected.value}% availability`);
          } else {
            cellInfoText.text("");
          }
        } else {
          cellInfoText.text("");
        }
      } else {
        const formattedName = toTitleCase(d.city || d.id);
        if (heatmapType === "coverage") {
          cellInfoText.text(`${d.id}: ${d.value}% coverage`);
        } else if (heatmapType === "penetration") {
          cellInfoText.text(`${d.id}: ${d.value}% penetration`);
        } else {
          cellInfoText.text(`${d.id}: ${d.value}% availability`);
        }
      }
    }
    
    // Initial update based on selected cell
    updateCellInfo(hoveredCell);
    
    // Update cell info text when hovering
    g.selectAll("g.cell")
      .on("mouseover.info", function(event: any, d: any) {
        const data = d as ChoroplethData;
        updateCellInfo(data);
      })
      .on("mouseout.info", function() {
        updateCellInfo(null);
      });

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
    
    // Handle tooltip events on cells
    g.selectAll("g.cell")
      .on("mousemove", function(event, d: any) {
        const data = d as ChoroplethData;
        tooltip
          .style("visibility", "visible")
          .style("top", (event.pageY - 10) + "px")
          .style("left", (event.pageX + 10) + "px")
          .html(`
            <div style="font-weight: bold; margin-bottom: 4px;">${data.city || data.id}</div>
            <div>ID: ${data.id}</div>
            <div>${getMetricName()}: ${data.value}%</div>
            ${heatmapType === "availability" ? `<div>Stock-out: ${100 - data.value}%</div>` : ''}
          `);
      })
      .on("mouseout", function() {
        tooltip.style("visibility", "hidden");
      });
    
    // Clean up
    return () => {
      tooltip.remove()
    }
    
  }, [data, height, onCellClick, heatmapType, selectedCell, hoveredCell])

  return (
    <div ref={containerRef} className="w-full h-full overflow-auto">
      <svg ref={svgRef} width="100%" />
    </div>
  )
}
