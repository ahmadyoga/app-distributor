import { Skeleton } from "@/components/ui/Misc";
import { TableWrap, TableRow } from "@/components/ui/Table";

export default function Loading() {
  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <Skeleton width="180px" height="22px" />
        <div style={{ marginTop: 8 }}>
          <Skeleton width="240px" height="13px" />
        </div>
      </div>
      <TableWrap>
        {Array.from({ length: 6 }).map((_, i) => (
          <TableRow columns="1fr" key={i}>
            <Skeleton width="100%" height="16px" />
          </TableRow>
        ))}
      </TableWrap>
    </div>
  );
}
