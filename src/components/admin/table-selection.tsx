"use client";

import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { TableCheckbox } from "@/components/ui/table-checkbox";
import { DataTableHeaderCell, DataTableCell } from "@/components/admin/data-table";

export function useTableSelection(allIds: string[]) {
  const idKey = allIds.join("\0");
  const ids = useMemo(() => allIds, [idKey]);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  function toggleOne(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(ids) : new Set());
  }

  function clearSelection() {
    setSelected(new Set());
  }

  const allSelected = ids.length > 0 && ids.every((id) => selected.has(id));
  const selectedIds = [...selected];

  return {
    ids,
    selected,
    selectedIds,
    selectedCount: selected.size,
    allSelected,
    toggleOne,
    toggleAll,
    clearSelection,
  };
}

export function BulkActionBar({
  itemLabel = "items",
  totalCount,
  selectedCount,
  allSelected,
  busy,
  onSelectAll,
  onClear,
  children,
}: {
  itemLabel?: string;
  totalCount: number;
  selectedCount: number;
  allSelected: boolean;
  busy?: boolean;
  onSelectAll: (checked: boolean) => void;
  onClear: () => void;
  children?: ReactNode;
}) {
  if (totalCount === 0) return null;

  return (
    <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg border border-wtva-dark-300 bg-wtva-dark-400/50 px-4 py-3">
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <TableCheckbox
          checked={allSelected}
          disabled={busy}
          onChange={(e) => onSelectAll(e.target.checked)}
          aria-label={`Select all ${itemLabel}`}
        />
        Select all ({totalCount})
      </label>
      {selectedCount > 0 && (
        <>
          <span className="text-sm text-wtva-muted">
            {selectedCount} selected
          </span>
          {children}
          <Button
            variant="ghost"
            className="px-3 py-1 text-xs"
            disabled={busy}
            onClick={onClear}
          >
            Clear
          </Button>
        </>
      )}
    </div>
  );
}

export function SelectAllHeaderCell({
  checked,
  disabled,
  onChange,
  label = "Select all",
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <DataTableHeaderCell className="w-12">
      <TableCheckbox
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        aria-label={label}
      />
    </DataTableHeaderCell>
  );
}

export function SelectRowCell({
  id,
  label,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (id: string, checked: boolean) => void;
}) {
  return (
    <DataTableCell className="w-12">
      <TableCheckbox
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(id, e.target.checked)}
        aria-label={`Select ${label}`}
      />
    </DataTableCell>
  );
}
