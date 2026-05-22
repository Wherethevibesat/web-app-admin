import { PageHeader } from "@/components/admin/page-header";

interface PlaceholderPageProps {
  title: string;
  description: string;
  phase?: string;
}

export function PlaceholderPage({
  title,
  description,
  phase = "Phase 1",
}: PlaceholderPageProps) {
  return (
    <div>
      <PageHeader title={title} description={description} />
      <div className="rounded-xl border border-dashed border-wtva-dark-300 bg-wtva-card p-12 text-center">
        <p className="text-lg font-semibold">Coming in {phase}</p>
        <p className="mt-2 text-sm text-wtva-muted">
          See WEB_APP_BUILD_INSTRUCTIONS.md §10 for the full specification.
        </p>
      </div>
    </div>
  );
}
