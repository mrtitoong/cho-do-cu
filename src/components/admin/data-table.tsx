"use client";

import { flexRender, tableFeatures, useTable, type ColumnDef, type RowData } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

/**
 * TanStack Table v9: chỉ dùng tính năng lõi (hiển thị). Lọc và phân trang làm phía server
 * theo URL, bảng chỉ hiển thị trang hiện tại.
 */
export const adminTableFeatures = tableFeatures({});
export type AdminColumnDef<T extends RowData> = ColumnDef<typeof adminTableFeatures, T>;

type Props<T extends RowData> = {
  columns: AdminColumnDef<T>[];
  data: T[];
  emptyText: string;
  getRowId?: (row: T) => string;
};

/** Bảng dữ liệu của khu vực Admin (TanStack Table + shadcn Table). */
export function DataTable<T extends RowData>({ columns, data, emptyText, getRowId }: Props<T>) {
  const table = useTable({ features: adminTableFeatures, columns, data, getRowId });

  return (
    <div className="overflow-hidden rounded-xl border bg-background">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id} className="whitespace-nowrap">
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} className="h-24 text-center text-muted-foreground">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getAllCells().map((cell) => (
                  <TableCell key={cell.id} className="align-middle">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
