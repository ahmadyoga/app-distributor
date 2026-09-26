import styles from "./terminal.module.css";

export function TableWrap({ children }: { children: React.ReactNode }) {
  return <div className={styles.tableWrap}>{children}</div>;
}

export function TableHeadRow({
  columns,
  children,
}: {
  columns: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.tableHeadRow} style={{ gridTemplateColumns: columns }}>
      {children}
    </div>
  );
}

export function TableRow({
  columns,
  onClick,
  children,
}: {
  columns: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={[styles.tableRow, onClick ? styles.tableRowClickable : ""].join(
        " "
      )}
      style={{ gridTemplateColumns: columns }}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      {children}
    </div>
  );
}
