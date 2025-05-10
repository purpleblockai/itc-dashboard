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
  sizeKey?: string
  sizeScale?: [number, number]
  category?: string
}

export function LineChart({
  data,
  categories = [],
  index = "date",
  colors = ["#ff6d00"],
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
  colors = ["#ff6d00"],
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
      <BarChartRecharts data={data} margin={{ top: 10, right: 30, left: 0, bottom: 30 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={showGridLines ? undefined : "transparent"} />
        <XAxis 
          dataKey={index} 
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: "#888" }}
          axisLine={{ stroke: "#888" }}
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
          formatter={(value: any) => (typeof valueFormatter === "function" ? [valueFormatter(value), "Value"] : [value, "Value"])}
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
            barSize={data.length > 10 ? 10 : data.length > 5 ? 30 : 45}
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
  colors = ["#ff6d00", "#ff9e40", "#ffbd80", "#ffdcbf"],
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
  yAxisLabel = "Availability (%)",
  sizeKey = "skuCount",
  sizeScale = [1, 100],
  showLegend = false,
  colors = ["#ff6d00"],
  valueFormatter,
  className,
}: ChartProps) {
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

  const formatY = valueFormatter?.y || ((value: number) => `${value}%`);
  const formatX = valueFormatter?.x || ((value: number) => `${value.toFixed(1)}%`);

  return (
    <ResponsiveContainer width="100%" height="100%" className={className}>
      <ScatterChartRecharts
        margin={{
          top: 50,
          right: 30,
          bottom: 40,
          left: 40,
        }}
      >
        <CartesianGrid />
        <XAxis 
          dataKey="x" 
          type="number" 
          name="discount" 
          tickFormatter={formatX}
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: "#888" }}
          axisLine={{ stroke: "#888" }}
          // domain={['dataMin - 2.2', 'dataMax + 1']}
        >
          <Label value={xAxisLabel} offset={-20} position="insideBottom" style={{ fontSize: '12px', fill: '#666' }} />
        </XAxis>
        <YAxis
          dataKey="y"
          type="number" 
          name="availability"
          tickFormatter={formatY}
          tick={{ fontSize: 12 }}
          tickLine={{ stroke: "#888" }}
          axisLine={{ stroke: "#888" }}
          // domain={['dataMin - 31', 'dataMax + 5']}
        >
          <Label value={yAxisLabel} angle={-90} position="insideLeft" style={{ textAnchor: 'middle', fontSize: '12px', fill: '#666' }} />
        </YAxis>
        <Tooltip
          cursor={{ strokeDasharray: '3 3' }}
          contentStyle={{ borderRadius: "6px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)" }}
          formatter={(value: any, name: string) => {
            if (name === 'discount') return [formatX(value), 'Discount'];
            if (name === 'availability') return [formatY(value), 'Availability'];
            if (name === sizeKey) return [value, 'SKU Count'];
            return [value, name];
          }}
        />
        {showLegend && <Legend />}
        <Scatter
          name="Brands"
          data={enhancedData}
          fill={colors[0]}
          shape={(props: any) => <Size {...props} dataKey={sizeKey} scale={sizeScale} color={colors[0]} />}
        >
          <LabelList
            dataKey="labelText"
            position="top"
            offset={25}
            style={{
              fontSize: 12,
              fill: '#333',
              fontWeight: 700,
              // textShadow: '0 0 5px white, 0 0 5px white, 0 0 5px white, 0 0 5px white',
              backgroundColor: 'rgba(255, 255, 255, 0.7)',
              padding: '2px'
            }}
          />
        </Scatter>
      </ScatterChartRecharts>
    </ResponsiveContainer>
  );
}

// Improved Size component with better scaling and appearance
const Size = ({ 
  payload, 
  cx, 
  cy, 
  dataKey, 
  scale = [1, 100], 
  color = '#ff6d00' 
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
  let minR = 8, maxR = 30;
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
        fillOpacity={0.85} 
        stroke="#333"
        strokeWidth={1} 
      />
    </g>
  );
}
