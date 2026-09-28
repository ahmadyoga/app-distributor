import { Skeleton } from "@/components/ui/Misc";
import { TableWrap, TableHeadRow, TableRow } from "@/components/ui/Table";

/** Title + subtitle block used at the top of most pages. */
export function HeaderSkeleton({ breadcrumb }: { breadcrumb?: boolean }) {
  return (
    <div style={{ marginBottom: 24, display: "flex", flexDirection: "column", gap: 10 }}>
      {breadcrumb && <Skeleton width="160px" height="11px" />}
      <Skeleton width="220px" height="26px" />
      <Skeleton width="300px" height="13px" />
    </div>
  );
}

export function TableSkeleton({ columns, rows = 6 }: { columns: string; rows?: number }) {
  const count = columns.split(" ").filter(Boolean).length;
  return (
    <TableWrap>
      <TableHeadRow columns={columns}>
        {Array.from({ length: count }).map((_, i) => (
          <Skeleton key={i} width="50%" height="10px" />
        ))}
      </TableHeadRow>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow columns={columns} key={r}>
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} width={i === 1 ? "80%" : "60%"} height="14px" />
          ))}
        </TableRow>
      ))}
    </TableWrap>
  );
}

/** A bordered box of skeleton lines — stat tiles, cards, panels. */
export function CardSkeleton({ lines = 3, height }: { lines?: number; height?: number }) {
  return (
    <div
      style={{
        border: "var(--bw) solid var(--line)",
        background: "var(--card)",
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
        minHeight: height,
      }}
    >
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} width={i === 0 ? "40%" : `${85 - i * 12}%`} height={i === 0 ? "11px" : "15px"} />
      ))}
    </div>
  );
}
