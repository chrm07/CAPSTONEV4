"use client"

import type React from "react"
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react"

export type SortDirection = "asc" | "desc" | null
export type ColumnDefinition<T> = {
  header: string
  accessorKey: keyof T
  cell?: (item: T) => React.ReactNode
  sortable?: boolean
  className?: string
}

interface EnhancedTableProps<T> {
  data: T[]
  columns: ColumnDefinition<T>[]
  caption?: string
  onRowClick?: (item: T) => void
  sortColumn?: keyof T
  sortDirection?: SortDirection
  onSort?: (column: keyof T) => void
  zebra?: boolean
  hover?: boolean
  stickyHeader?: boolean
  className?: string
}

export function EnhancedTable<T>({
  data,
  columns,
  caption,
  onRowClick,
  sortColumn,
  sortDirection,
  onSort,
  zebra = true,
  hover = true,
  stickyHeader = false,
  className,
}: EnhancedTableProps<T>) {
  const getSortIcon = (column: keyof T) => {
    if (column !== sortColumn) return <ChevronsUpDown className="ml-2 h-4 w-4 text-gray-400" />
    if (sortDirection === "asc") return <ChevronUp className="ml-2 h-4 w-4 text-green-600" />
    return <ChevronDown className="ml-2 h-4 w-4 text-green-600" />
  }

  return (
    <div className="rounded-md border shadow-sm bg-white dark:bg-gray-950">
      <div className={cn("relative overflow-auto", className)}>
        <Table className={cn(zebra && "table-zebra", hover && "table-hover", stickyHeader && "table-sticky-header")}>
          {caption && <TableCaption>{caption}</TableCaption>}
          <TableHeader>
            <TableRow className="bg-gray-50 dark:bg-gray-800/50">
              {columns.map((column) => (
                <TableHead
                  key={String(column.accessorKey)}
                  className={cn(
                    "font-semibold text-gray-700 dark:text-gray-300",
                    column.sortable && "cursor-pointer select-none",
                    column.className,
                  )}
                  onClick={() => column.sortable && onSort?.(column.accessorKey)}
                >
                  <div className="flex items-center">
                    {column.header}
                    {column.sortable && getSortIcon(column.accessorKey)}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                  No results.
                </TableCell>
              </TableRow>
            ) : (
              data.map((item, index) => (
                <TableRow key={index} onClick={() => onRowClick?.(item)} className={cn(onRowClick && "cursor-pointer")}>
                  {columns.map((column) => (
                    <TableCell key={String(column.accessorKey)} className={column.className}>
                      {column.cell ? column.cell(item) : (item[column.accessorKey] as React.ReactNode)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
