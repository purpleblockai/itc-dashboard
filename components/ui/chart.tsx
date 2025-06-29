"use client"

import {
  Bar,
  BarChart as BarChartRecharts,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart as LineChartRecharts,
  Pie,
  PieChart as PieChartRecharts,
  ResponsiveContainer,
  Scatter,
  ScatterChart as ScatterChartRecharts,
  Tooltip,
  XAxis,
  YAxis,
  Label,
  LabelList,
} from "recharts"
import { ReactElement } from "react"
import { useTheme } from "next-themes"

interface ChartProps {
  data: any[]
  categories?: string[]
  index?: string
  colors?: string[]
  valueFormatter?: any
  showLegend?: boolean
  showGridLines?: boolean
  className?: string
  xAxisLabel?: string
  yAxisLabel?: string
  xAxisProps?: any
  labelFormatter?: (label: any) => string
  sizeKey?: string
  sizeScale?: [number, number]
  category?: string
  categoryColors?: Record<string, string>
}

export function LineChart({
  data,
  categories = [],
  index = "date",
  colors = ["#9333EA"],
  valueFormatter,
  showLegend = false,
  showGridLines = true,
  className,
  xAxisLabel,
  yAxisLabel,
}: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <LineChartRecharts
        data={data}
        margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
      >
        <CartesianGrid 
          strokeDasharray="3 3" 
          stroke={showGridLines ? undefined : "transparent"} 
          vertical={false}
        />
        <XAxis 
          dataKey={index}
          tick={{ fill: "#666", fontSize: 12, fontWeight: 500 }}
          tickLine={{ stroke: "#888", strokeWidth: 1.5 }}
          axisLine={{ stroke: "#888", strokeWidth: 1.5 }}
          padding={{ left: 10, right: 10 }}
          tickMargin={8}
        >
          {xAxisLabel && <Label value={xAxisLabel} offset={-15} position="insideBottom" style={{ fontSize: '12px', fontWeight: 'bold', fill: '#666' }} />}
        </XAxis>
        <YAxis 
          tickFormatter={valueFormatter}
          tick={{ fill: "#666", fontSize: 12, fontWeight: 500 }}
          tickLine={{ stroke: "#888", strokeWidth: 1.5 }}
          axisLine={{ stroke: "#888", strokeWidth: 1.5 }}
          width={70}
          tickMargin={8}
        >
          {yAxisLabel && <Label value={yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: '12px', fontWeight: 'bold', fill: '#666' }} />}
        </YAxis>
        <Tooltip
          formatter={(value: any) => (typeof valueFormatter === "function" ? [valueFormatter(value), "Value"] : [value, "Value"])}
          contentStyle={{ 
            borderRadius: "6px", 
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
            border: "1px solid #e2e8f0",
            backgroundColor: "#fff",
            color: "#333"
          }}
          labelStyle={{ fontWeight: "bold", marginBottom: "4px", color: "#333" }}
          itemStyle={{ color: "#555" }}
          labelFormatter={(label) => `Date: ${label}`}
          wrapperStyle={{ zIndex: 1000 }}
        />
        {showLegend && <Legend verticalAlign="top" height={36} iconType="circle" />}
        {categories.map((category, i) => (
          <Line
            key={category}
            type="monotone"
            dataKey={category}
            stroke={colors[i % colors.length]}
            strokeWidth={3}
            dot={{ r: 5, strokeWidth: 2, fill: "#fff" }}
            activeDot={{ r: 7, strokeWidth: 0 }}
            animationDuration={1000}
            connectNulls={true}
          />
        ))}
      </LineChartRecharts>
    </ResponsiveContainer>
  )
}

export function BarChart({ 
  data,
  categories = [],
  index = "name",
  colors = ["#9333EA"],
  valueFormatter,
  showLegend = false,
  showGridLines = true,
  className,
  xAxisLabel,
  yAxisLabel,
  xAxisProps,
  labelFormatter,
}: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <BarChartRecharts data={data} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={showGridLines ? undefined : "transparent"} />
        <XAxis 
          dataKey={index} 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: "#888" }}
          axisLine={{ stroke: "#888" }}
          {...xAxisProps}
        >
          {xAxisLabel && <Label value={xAxisLabel} offset={-10} position="insideBottom" style={{ fontSize: '12px', fill: '#666' }} />}
        </XAxis>
        <YAxis 
          tickFormatter={valueFormatter}
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: "#888" }}
          axisLine={{ stroke: "#888" }}
          width={60}
        >
          {yAxisLabel && <Label value={yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: '12px', fill: '#666' }} />}
        </YAxis>
        <Tooltip
          formatter={(value: any, name: string) => [typeof valueFormatter === "function" ? valueFormatter(value) : value, name]}
          labelFormatter={labelFormatter}
          contentStyle={{ borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
          labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
        />
        {showLegend && <Legend verticalAlign="top" height={36} iconType="circle" />}
        {categories.map((category, i) => (
          <Bar 
            key={category} 
            dataKey={category} 
            fill={colors[i % colors.length]}
            radius={[4, 4, 0, 0]}
            animationDuration={1000}
            barSize={40}
          />
        ))}
      </BarChartRecharts>
    </ResponsiveContainer>
  )
}

export function PieChart({ 
  data,
  category = "value",
  index = "name",
  colors = ["#6B21A8", "#9333EA", "#A78BFA", "#E9D5FF"],
  valueFormatter,
  showLegend = true,
  className,
}: ChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <PieChartRecharts>
        <Pie 
          data={data} 
          dataKey={category} 
          nameKey={index} 
          cx="50%" 
          cy="50%" 
          outerRadius="80%" 
          innerRadius="45%"
          paddingAngle={3}
          animationDuration={1000}
          label={({name, percent}) => `${name}: ${(percent * 100).toFixed(0)}%`}
          labelLine={false}
        >
          {data.map((entry, i) => (
            <Cell key={`cell-${i}`} fill={colors[i % colors.length]} strokeWidth={1} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: any) => (typeof valueFormatter === "function" ? [valueFormatter(value), "Value"] : [value, "Value"])}
          contentStyle={{ borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
          labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
        />
        {showLegend && <Legend layout="horizontal" verticalAlign="bottom" align="center" iconType="circle" />}
      </PieChartRecharts>
    </ResponsiveContainer>
  )
}

export function ScatterChart({
  data,
  xAxisLabel = "Average Discount (%)",
  yAxisLabel = "Average Availability (%)",
  sizeKey = "skuCount",
  sizeScale = [1, 100],
  showLegend = false,
  colors = ["#6B21A8", "#9333EA", "#A78BFA", "#C4B5FD", "#E9D5FF"],
  valueFormatter,
  categoryColors,
  className,
}: ChartProps) {
  const { resolvedTheme, theme } = useTheme();
  const currentTheme = resolvedTheme || theme;
  const isDarkMode = currentTheme === 'dark';

  const xValues = data.map(item => item.x);
  const yValues = data.map(item => item.y);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yMin = Math.min(...yValues);
  const yMax = Math.max(...yValues);
  const xRange = xMax - xMin;
  const yRange = yMax - yMin;
  const xPadding = xRange > 0 ? xRange * 0.1 : 10;
  const yPadding = yRange > 0 ? yRange * 0.1 : 10;
  const xDomain: [number, number] = [Math.max(0, xMin - xPadding), Math.min(100, xMax + xPadding)];
  const yDomain: [number, number] = [Math.max(0, yMin - yPadding), Math.min(100, yMax + yPadding)];

  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <p className="text-muted-foreground">No data available</p>
      </div>
    )
  }

  // Enhanced data with proper formatting for labels
  const enhancedData = data.map(item => ({
    ...item,
    labelText: item.name, // Store name separately for label use
  }));

  // Get unique categories and sort by bubble size (ascending) so larger dots render on top
  let categories = Array.from(new Set(data.map(item => item.category || item.name)));
  categories.sort((a, b) => {
    const sizeA = data.find(item => (item.category || item.name) === a)?.[sizeKey] ?? 0;
    const sizeB = data.find(item => (item.category || item.name) === b)?.[sizeKey] ?? 0;
    return sizeA - sizeB;
  });

  // Support both simple formatters and object formatters with x/y properties
  const formatY = typeof valueFormatter === 'object' && valueFormatter?.y 
    ? valueFormatter.y 
    : typeof valueFormatter === 'function' 
      ? valueFormatter 
      : ((value: number) => `${value}%`);
  
  const formatX = typeof valueFormatter === 'object' && valueFormatter?.x 
    ? valueFormatter.x 
    : typeof valueFormatter === 'function' 
      ? valueFormatter 
      : ((value: number) => `${value.toFixed(1)}%`);

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <ScatterChartRecharts
        margin={{
          top: 20,
          right: 60,
          bottom: 50,
          left: 10,
        }}
      >
        <CartesianGrid strokeDasharray="5 5" stroke={isDarkMode ? '#4B5563' : '#D1D5DB'} />
        <XAxis 
          dataKey="x" 
          type="number" 
          name="penetration" 
          tickFormatter={formatX}
          tick={{ fontSize: 12, fill: isDarkMode ? '#fff' : '#4B5563' }}
          tickLine={{ stroke: isDarkMode ? '#4B5563' : '#D1D5DB' }}
          axisLine={{ stroke: isDarkMode ? '#4B5563' : '#D1D5DB' }}
          domain={xDomain}
          tickCount={5}
        >
          <Label 
            value={xAxisLabel} 
            offset={-20} 
            position="insideBottom" 
            style={{ 
              fontSize: '13px', 
              fontWeight: 'bold', 
              fill: isDarkMode ? '#fff' : '#000'
            }} 
          />
        </XAxis>
        <YAxis
          dataKey="y"
          type="number" 
          name="availability"
          tickFormatter={formatY}
          tick={{ fontSize: 12, fill: isDarkMode ? '#fff' : '#4B5563' }}
          tickLine={{ stroke: isDarkMode ? '#4B5563' : '#D1D5DB' }}
          axisLine={{ stroke: isDarkMode ? '#4B5563' : '#D1D5DB' }}
          domain={yDomain}
          tickCount={5}
          width={80}
        >
          <Label 
            value={yAxisLabel} 
            angle={-90} 
            position="insideLeft" 
            style={{ 
              textAnchor: 'middle', 
              fontSize: '13px', 
              fontWeight: 'bold', 
              fill: isDarkMode ? '#fff' : '#000'
            }} 
          />
        </YAxis>
        <Tooltip
          content={({ active, payload }) => {
            if (!active || !payload || !payload.length) return null;
            const datum = payload[0].payload;
            return (
              <div style={{
                backgroundColor: "#333",
                border: "1px solid #666",
                borderRadius: "4px",
                padding: "10px",
                color: "#fff",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)"
              }}>
                <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
                  {datum.name}
                </div>
                <div>Penetration: {formatX(datum.x)}</div>
                <div>Availability: {formatY(datum.y)}</div>
                <div>Coverage: {datum[sizeKey].toFixed(1)}%</div>
              </div>
            );
          }}
          cursor={{ strokeDasharray: '3 3' }}
        />
        {showLegend && 
          <Legend 
            layout="horizontal" 
            verticalAlign="top" 
            iconType="circle"
            iconSize={10}
            wrapperStyle={{ top: 10, right: 10, color: isDarkMode ? '#fff' : '#000' }} 
          />
        }
        
        {/* Group data by category and create a separate Scatter for each category */}
        {categories.map((category, index) => {
          const categoryData = enhancedData.filter(
            item => (item.category || item.name) === category
          );
          const color = categoryColors?.[category] ?? colors[index % colors.length];
          
          return (
            <Scatter
              key={category}
              name={category}
              data={categoryData}
              fill={color}
              shape={(props: any) => (
                <Size 
                  {...props} 
                  dataKey={sizeKey} 
                  scale={sizeScale} 
                  color={color} 
                />
              )}
            >
              <LabelList
                dataKey="labelText"
                position="bottom"
                offset={15}
                style={{
                  fontSize: 13,
                  fill: isDarkMode ? '#fff' : '#000',
                  fontWeight: 600,
                  textShadow: isDarkMode ? '0 0 4px #000, 0 0 4px #000' : 'none'
                }}
              />
            </Scatter>
          );
        })}
      </ScatterChartRecharts>
    </ResponsiveContainer>
  );
}

// Improved Size component with better visibility
const Size = ({ 
  payload, 
  cx, 
  cy, 
  dataKey, 
  scale = [1, 100], 
  color = '#9333EA' 
}: { 
  payload: any; 
  cx: any; 
  cy: any; 
  dataKey: string; 
  scale?: [number, number]; 
  color: string 
}) => {
  if (!payload || !cx || !cy) return null;
  
  let value = payload[dataKey] || 1;
  let minR = 15, maxR = 40;
  let minVal = scale[0], maxVal = scale[1];
  
  // Use sqrt scale for more natural area representation
  let norm = (value - minVal) / (maxVal - minVal);
  norm = Math.max(0, Math.min(1, norm)); // Clamp between 0 and 1
  let radius = minR + (maxR - minR) * Math.sqrt(norm);
  
  return (
    <g>
      <circle 
        cx={cx} 
        cy={cy} 
        r={radius} 
        fill={color} 
        fillOpacity={0.8} 
        stroke="#fff"
        strokeWidth={2} 
      />
    </g>
  );
}
