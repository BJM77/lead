'use client';

import * as React from 'react';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Download, Trash2, Loader2 } from 'lucide-react';
import type { Lead } from '@/types';
import { deleteLead } from '@/lib/db';
import { useToast } from '@/hooks/use-toast';

interface LeadDataTableProps<TData extends Lead, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
}

export function LeadDataTable<TData extends Lead, TValue>({
  columns,
  data,
}: LeadDataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([
    { id: 'createdAt', desc: true } // Default sort by newest
  ]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [rowSelection, setRowSelection] = React.useState({});
  const [isDeleting, setIsDeleting] = React.useState(false);
  const { toast } = useToast();

  const handleDeleteSelected = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    if (selectedRows.length === 0) return;

    const confirmMessage = selectedRows.length === 1 
      ? "Are you sure you want to delete this lead?" 
      : `Are you sure you want to delete the ${selectedRows.length} selected leads?`;

    if (!window.confirm(confirmMessage)) return;

    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const row of selectedRows) {
      try {
        const lead = row.original as Lead;
        if (lead.id) {
          await deleteLead(lead.id);
          successCount++;
        }
      } catch (err: any) {
        console.error("Failed to delete lead:", err);
        failCount++;
      }
    }

    setIsDeleting(false);
    setRowSelection({});

    if (failCount > 0) {
      toast({
        title: "Deletion Partially Completed",
        description: `Successfully deleted ${successCount} leads. Failed to delete ${failCount} leads (ownership check).`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Leads Deleted",
        description: `Successfully deleted ${successCount} leads.`,
      });
    }
  };

  const handleDeleteAll = async () => {
    if (data.length === 0) return;

    if (!window.confirm("CRITICAL WARNING: Are you sure you want to delete ALL leads in your database? This action is permanent and cannot be undone.")) {
      return;
    }

    setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const item of data) {
      try {
        if (item.id) {
          await deleteLead(item.id);
          successCount++;
        }
      } catch (err: any) {
        console.error("Failed to delete lead:", err);
        failCount++;
      }
    }

    setIsDeleting(false);
    setRowSelection({});

    if (failCount > 0) {
      toast({
        title: "Bulk Deletion Partially Completed",
        description: `Deleted ${successCount} leads. Failed to delete ${failCount} leads (ownership check).`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "All Leads Deleted",
        description: `Successfully wiped all ${successCount} leads.`,
      });
    }
  };

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      rowSelection,
    },
  });

  const handleExport = () => {
    const rowsToExport =
      table.getFilteredSelectedRowModel().rows.length > 0
        ? table.getFilteredSelectedRowModel().rows
        : table.getFilteredRowModel().rows;

    if (rowsToExport.length === 0) {
      return;
    }

    const dataToExport = rowsToExport.map((row) => row.original as TData);

    const headers = [
      'id',
      'name',
      'title',
      'companyName',
      'companyIndustry',
      'companyEmployeeCount',
      'companyRevenue',
      'email',
      'phone',
      'status',
      'quality',
      'source',
      'details',
      'createdAt',
    ];

    const csvContent = [
      headers.join(','),
      ...dataToExport.map((row) => {
        const flatRow = {
          ...row,
          companyName: row.company.name,
          companyIndustry: row.company.industry || '',
          companyEmployeeCount: row.company.employeeCount || '',
          companyRevenue: row.company.revenue || '',
          createdAt: new Date(row.createdAt).toISOString(),
        };
        return headers
          .map((fieldName) => {
            let cellData = (flatRow as any)[fieldName];
            let cellString = String(
              cellData === null || cellData === undefined ? '' : cellData
            );
            if (/[",\n]/.test(cellString)) {
              return `"${cellString.replace(/"/g, '""')}"`;
            }
            return cellString;
          })
          .join(',');
      }),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'leads.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Input
          placeholder="Filter leads by name..."
          value={(table.getColumn('name')?.getFilterValue() as string) ?? ''}
          onChange={(event) =>
            table.getColumn('name')?.setFilterValue(event.target.value)
          }
          className="max-w-sm"
        />
        <div className="flex items-center gap-2">
          {table.getFilteredSelectedRowModel().rows.length > 0 && (
            <Button
              variant="destructive"
              onClick={handleDeleteSelected}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete Selected ({table.getFilteredSelectedRowModel().rows.length})
            </Button>
          )}

          {data.length > 0 && (
            <Button
              variant="outline"
              onClick={handleDeleteAll}
              disabled={isDeleting}
              className="text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/30"
            >
              {isDeleting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Delete All
            </Button>
          )}

          <Button
            variant="outline"
            onClick={handleExport}
            disabled={table.getFilteredRowModel().rows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export to CSV
          </Button>
        </div>
      </div>
      <div className="rounded-md border bg-card">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
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
                  No leads found. Try discovering some!
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{' '}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
