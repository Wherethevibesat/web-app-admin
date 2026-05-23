import { Select } from "@/components/ui/input";
import type { NeighborhoodRow } from "@/lib/types/neighborhood";

type NeighborhoodSelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  neighborhoods: NeighborhoodRow[];
  required?: boolean;
};

export function NeighborhoodSelect({
  id = "neighborhood",
  value,
  onChange,
  neighborhoods,
  required,
}: NeighborhoodSelectProps) {
  const legacy = value && !neighborhoods.some((n) => n.name === value);

  return (
    <Select
      id={id}
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">— Select neighborhood —</option>
      {legacy && (
        <option value={value}>{value} (legacy — pick a listed neighborhood)</option>
      )}
      {neighborhoods.map((n) => (
        <option key={n.id} value={n.name}>
          {n.name}
        </option>
      ))}
    </Select>
  );
}
