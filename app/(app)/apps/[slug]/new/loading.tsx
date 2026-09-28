import { HeaderSkeleton, CardSkeleton } from "@/components/ui/Skeletons";
import formStyles from "@/components/CreateBuildForm.module.css";

export default function Loading() {
  return (
    <div style={{ maxWidth: 1080 }} aria-busy="true" aria-label="Loading form">
      <HeaderSkeleton breadcrumb />
      <div className={formStyles.layout}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <CardSkeleton lines={3} height={170} />
          <CardSkeleton lines={4} height={260} />
          <CardSkeleton lines={4} height={260} />
        </div>
        <CardSkeleton lines={7} height={380} />
      </div>
    </div>
  );
}
