import { Skeleton } from "@/components/ui/Misc";
import { TableSkeleton, CardSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading application">
      <Skeleton width="180px" height="11px" />
      <div style={{ display: "flex", alignItems: "center", gap: 14, margin: "14px 0 24px" }}>
        <Skeleton width="52px" height="52px" />
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Skeleton width="200px" height="24px" />
          <Skeleton width="160px" height="12px" />
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: 12,
          marginBottom: 28,
        }}
      >
        <CardSkeleton lines={4} height={150} />
        <CardSkeleton lines={3} height={150} />
      </div>
      <TableSkeleton columns="64px minmax(0,1.7fr) 116px 108px 96px 90px" rows={5} />
    </div>
  );
}
