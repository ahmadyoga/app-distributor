import { HeaderSkeleton, TableSkeleton } from "@/components/ui/Skeletons";

export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading applications">
      <HeaderSkeleton />
      <TableSkeleton columns="minmax(0,1.6fr) 90px 110px 130px" rows={5} />
    </div>
  );
}
