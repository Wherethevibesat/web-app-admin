"use client";

import {
  ADMIN_PERMISSIONS,
  permissionLabel,
  type AdminPermission,
} from "@/lib/admin/permissions";
import { TableCheckbox } from "@/components/ui/table-checkbox";

export function AdminPermissionsFields({
  value,
  onChange,
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const allSelected = value.includes("all");

  function toggleAll(checked: boolean) {
    onChange(checked ? ["all"] : []);
  }

  function togglePermission(permission: AdminPermission, checked: boolean) {
    const current = new Set(value.filter((item) => item !== "all"));
    if (checked) current.add(permission);
    else current.delete(permission);
    onChange([...current]);
  }

  return (
    <div className="space-y-3">
      <label className="flex items-center gap-2 text-sm font-medium">
        <TableCheckbox checked={allSelected} onChange={(e) => toggleAll(e.target.checked)} />
        Full access
      </label>

      {!allSelected && (
        <div className="grid gap-2 sm:grid-cols-2">
          {ADMIN_PERMISSIONS.map((permission) => (
            <label key={permission} className="flex items-center gap-2 text-sm text-wtva-muted">
              <TableCheckbox
                checked={value.includes(permission)}
                onChange={(e) => togglePermission(permission, e.target.checked)}
              />
              {permissionLabel(permission)}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
