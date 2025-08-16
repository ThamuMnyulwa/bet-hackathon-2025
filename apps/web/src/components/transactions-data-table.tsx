"use client"

import * as React from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type SortingState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table"
import {
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconChevronsLeft,
  IconChevronsRight,
  IconLayoutColumns,
  IconPlus,
  IconSearch,
  IconFilter,
} from "@tabler/icons-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { CheckCircle, Clock, Shield, AlertTriangle, XCircle, Eye } from 'lucide-react'
import { useTransactions, useUpdateTransactionStatus, useRefreshTransactions } from "@/hooks/use-transactions"
import { toast } from "sonner"
import { TransactionReviewModal } from "@/components/transaction-review-modal"

interface Transaction {
  id: string
  amount: number
  currency: string
  recipientName: string
  recipientAccount: string
  status: string
  riskScore?: number
  authMethod?: string
  stepUpRequired: boolean
  escrowReleaseTime?: string
  createdAt: string
  updatedAt: string
  timeAgo: string
}

interface TransactionsDataTableProps {
  onDataUpdate?: () => void
}

export function TransactionsDataTable({ onDataUpdate }: TransactionsDataTableProps) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [pagination, setPagination] = React.useState({
    pageIndex: 0,
    pageSize: 10,
  })
  const [reviewingTransaction, setReviewingTransaction] = React.useState<Transaction | null>(null)
  const [isReviewModalOpen, setIsReviewModalOpen] = React.useState(false)

  // React Query hooks
  const { data, isLoading, error, refetch } = useTransactions({
    limit: pagination.pageSize,
    offset: pagination.pageIndex * pagination.pageSize,
  });

  const updateStatusMutation = useUpdateTransactionStatus();
  const refreshTransactions = useRefreshTransactions();

  const handleStatusUpdate = async (transactionId: string, newStatus: string) => {
    try {
      await updateStatusMutation.mutateAsync({
        transactionId,
        status: newStatus
      })
      
      // Notify parent component to refresh data
      if (onDataUpdate) {
        onDataUpdate()
      }
      
      toast.success(`Transaction status updated to ${newStatus}`)
    } catch (error) {
      toast.error('Failed to update transaction status')
    }
  }

  const openTransactionReview = (transaction: Transaction) => {
    setReviewingTransaction(transaction)
    setIsReviewModalOpen(true)
  }

  const closeTransactionReview = () => {
    setIsReviewModalOpen(false)
    setReviewingTransaction(null)
  }

  const columns: ColumnDef<Transaction>[] = [
    {
      accessorKey: "id",
      header: "Transaction ID",
      cell: ({ row }) => {
        const transactionId = row.getValue("id") as string
        return (
          <div className="font-mono text-sm bg-muted px-2 py-1 rounded">
            {transactionId}
          </div>
        )
      },
    },
    {
      accessorKey: "amount",
      header: "Amount",
      cell: ({ row }) => {
        const amount = row.getValue("amount") as number
        const currency = row.original.currency
        return (
          <div className="font-medium">
            {new Intl.NumberFormat('en-ZA', {
              style: 'currency',
              currency: currency,
            }).format(amount)}
          </div>
        )
      },
    },
    {
      accessorKey: "recipientName",
      header: "Recipient",
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="font-medium">{row.getValue("recipientName")}</div>
          <div className="text-sm text-muted-foreground">
            {row.original.recipientAccount}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => {
        const status = row.getValue("status") as string
        const transaction = row.original
        
        const getStatusIcon = (status: string) => {
          switch (status) {
            case 'COMPLETED':
            case 'APPROVED':
              return <CheckCircle className="h-4 w-4 text-accent-foreground" />
            case 'PENDING':
              return <Clock className="h-4 w-4 text-accent" />
            case 'ESCROW':
              return <Shield className="h-4 w-4 text-primary" />
            case 'DECLINED':
            case 'BLOCKED':
              return <XCircle className="h-4 w-4 text-destructive" />
            default:
              return <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          }
        }

        const getStatusColor = (status: string) => {
          switch (status) {
            case 'COMPLETED':
            case 'APPROVED':
              return 'default'
            case 'PENDING':
              return 'secondary'
            case 'ESCROW':
              return 'outline'
            case 'DECLINED':
            case 'BLOCKED':
              return 'destructive'
            default:
              return 'secondary'
          }
        }

        return (
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 px-2">
                  <Badge variant={getStatusColor(status)}>
                    {status}
                  </Badge>
                  <IconChevronDown className="ml-1 h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleStatusUpdate(transaction.id, 'PENDING')}>
                  <Clock className="mr-2 h-4 w-4" />
                  Pending
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusUpdate(transaction.id, 'APPROVED')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approved
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusUpdate(transaction.id, 'COMPLETED')}>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Completed
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusUpdate(transaction.id, 'ESCROW')}>
                  <Shield className="mr-2 h-4 w-4" />
                  Escrow
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleStatusUpdate(transaction.id, 'DECLINED')}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Declined
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )
      },
    },
    {
      accessorKey: "riskScore",
      header: "Risk Score",
      cell: ({ row }) => {
        const riskScore = row.getValue("riskScore") as number | undefined
        if (!riskScore) return <span className="text-muted-foreground">-</span>
        
        const getRiskBadgeColor = (riskScore: number) => {
          if (riskScore >= 80) return 'destructive'
          if (riskScore >= 60) return 'outline'
          if (riskScore >= 30) return 'secondary'
          return 'default'
        }

        return (
          <Badge variant={getRiskBadgeColor(riskScore)}>
            {Math.round(riskScore)}
          </Badge>
        )
      },
    },
    {
      accessorKey: "authMethod",
      header: "Auth Method",
      cell: ({ row }) => {
        const authMethod = row.getValue("authMethod") as string
        return (
          <div className="text-sm">
            {authMethod || 'Standard'}
          </div>
        )
      },
    },
    {
      accessorKey: "stepUpRequired",
      header: "Step Up",
      cell: ({ row }) => {
        const stepUpRequired = row.getValue("stepUpRequired") as boolean
        return (
          <Badge variant={stepUpRequired ? "destructive" : "secondary"}>
            {stepUpRequired ? "Required" : "Not Required"}
          </Badge>
        )
      },
    },
    {
      accessorKey: "createdAt",
      header: "Created",
      cell: ({ row }) => {
        const createdAt = row.getValue("createdAt") as string
        return (
          <div className="text-sm text-muted-foreground">
            {createdAt}
          </div>
        )
      },
    },
    {
      id: "actions",
      header: "Actions",
      cell: ({ row }) => {
        const transaction = row.original
        const riskScore = transaction.riskScore || 0
        
        return (
          <div className="flex items-center gap-2">
            {riskScore >= 60 && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => openTransactionReview(transaction)}
                className="border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <Eye className="h-3 w-3 mr-1" />
                Review
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const table = useReactTable({
    data: data?.transactions || [],
    columns,
    state: {
      sorting,
      columnVisibility,
      columnFilters,
      pagination,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onPaginationChange: setPagination,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    pageCount: data ? Math.ceil(data.total / pagination.pageSize) : 0,
  })

  if (isLoading) {
    return null // Loading is handled at the page level
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <Button onClick={() => refetch()} variant="outline">
          Try Again
        </Button>
      </div>
    )
  }

  if (!data || data.transactions.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-4 h-12 w-12 text-muted-foreground">
          <IconLayoutColumns className="h-full w-full" />
        </div>
        <p className="text-muted-foreground">No transactions found</p>
        <p className="text-sm text-muted-foreground">Make your first secure payment to get started</p>
      </div>
    )
  }

  return (
    <div className="w-full space-y-4">
      {/* Filters and Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="relative">
            <IconSearch className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={(table.getColumn("recipientName")?.getFilterValue() as string) ?? ""}
              onChange={(event) =>
                table.getColumn("recipientName")?.setFilterValue(event.target.value)
              }
              className="pl-8 w-64"
            />
          </div>
          <Select
            value={(table.getColumn("status")?.getFilterValue() as string) ?? ""}
            onValueChange={(value) =>
              table.getColumn("status")?.setFilterValue(value === "all" ? "" : value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="ESCROW">Escrow</SelectItem>
              <SelectItem value="DECLINED">Declined</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <IconLayoutColumns className="mr-2 h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {table
                .getAllColumns()
                .filter(
                  (column) =>
                    typeof column.accessorFn !== "undefined" &&
                    column.getCanHide()
                )
                .map((column) => {
                  return (
                    <DropdownMenuCheckboxItem
                      key={column.id}
                      className="capitalize"
                      checked={column.getIsVisible()}
                      onCheckedChange={(value) =>
                        column.toggleVisibility(!!value)
                      }
                    >
                      {column.id}
                    </DropdownMenuCheckboxItem>
                  )
                })}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => refreshTransactions()} variant="outline" size="sm">
            <IconFilter className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id} colSpan={header.colSpan}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-2">
        <div className="flex-1 text-sm text-muted-foreground">
          {data.total} transaction(s) total.
        </div>
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={`${table.getState().pagination.pageSize}`}
              onValueChange={(value) => {
                table.setPageSize(Number(value))
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={table.getState().pagination.pageSize} />
              </SelectTrigger>
              <SelectContent side="top">
                {[10, 20, 30, 40, 50].map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            Page {table.getState().pagination.pageIndex + 1} of{" "}
            {table.getPageCount()}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to first page</span>
              <IconChevronsLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              <span className="sr-only">Go to previous page</span>
              <IconChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="h-8 w-8 p-0"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to next page</span>
              <IconChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
            >
              <span className="sr-only">Go to last page</span>
              <IconChevronsRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Transaction Review Modal */}
      <TransactionReviewModal
        isOpen={isReviewModalOpen}
        onClose={closeTransactionReview}
        transaction={reviewingTransaction ? {
          id: reviewingTransaction.id,
          amount: reviewingTransaction.amount,
          currency: reviewingTransaction.currency,
          recipient: reviewingTransaction.recipientName,
          riskScore: reviewingTransaction.riskScore || 0,
          status: reviewingTransaction.status,
          timestamp: reviewingTransaction.createdAt
        } : null}
      />
    </div>
  )
}
