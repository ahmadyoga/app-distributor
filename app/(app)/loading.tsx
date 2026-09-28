import { HeaderSkeleton, TableSkeleton, CardSkeleton } from "@/components/ui/Skeletons";

// Dashboard (/) — also the fallback for any route without its own loading.tsx.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading overview">
      <HeaderSkeleton />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          gap: 12,
          marginBottom: 26,
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <CardSkeleton key={i} lines={3} />
        ))}
      </div>
      <TableSkeleton columns="70px minmax(0,1.6fr) minmax(0,1fr) 90px 110px 96px" rows={7} />
    </div>
  );
}
