"use client"

import type React from "react"

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js"
import { Line, Bar, Pie, Doughnut } from "react-chartjs-2"
import { forwardRef } from "react"

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

type ChartType = "line" | "bar" | "pie" | "doughnut"

interface ChartProps {
  type: ChartType
  data: any
  options?: any
}

export const Chart = forwardRef<ChartJS, ChartProps>(({ type, data, options }, ref) => {
  switch (type) {
    case "line":
      return <Line ref={ref} data={data} options={options} />
    case "bar":
      return <Bar ref={ref} data={data} options={options} />
    case "pie":
      return <Pie ref={ref} data={data} options={options} />
    case "doughnut":
      return <Doughnut ref={ref} data={data} options={options} />
    default:
      return null
  }
})
Chart.displayName = "Chart"

export const ChartContainer = ({ children }: { children: React.ReactNode }) => {
  return <div>{children}</div>
}

export const ChartTooltip = () => {
  return null
}

export const ChartTooltipContent = () => {
  return null
}

export const ChartLegend = () => {
  return null
}

export const ChartLegendContent = () => {
  return null
}

export const ChartStyle = () => {
  return null
}
