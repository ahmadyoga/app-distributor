import { HeaderSkeleton, TableSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading storage">
      <HeaderSkeleton />
      <div style={{ marginTop: 20, marginBottom: 28 }}>
        <TableSkeleton columns="minmax(0,1.4fr) minmax(0,1.2fr) 100px 140px 230px" rows={3} />
      </div>
      <TableSkeleton columns="auto 1fr auto auto" rows={4} />
    </div>
  );
}
