import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";

export const alt = "Build share";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontData = await readFile(
  join(
    process.cwd(),
    "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf"
  )
);

export default async function Image({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const build = await prisma.build.findUnique({
    where: { shareToken: token },
    include: { application: true, developer: true },
  });

  const appName = build?.application.name ?? "BuildApp";
  const initials = build?.application.initials ?? "??";
  const feature = build?.feature ?? "Build";
  const version = build ? `v${build.version}` : "";
  const buildNo = build ? `Build ${build.number}` : "";
  const developer = build?.developer.name ?? "";
  const platform = build?.application.platform ?? "Android";
  // Testers care which backend the build hits more than its upload status.
  const statusLabel = build?.environment ?? "PRODUCTION";
  const statusColor = statusLabel === "PRODUCTION" ? "#c8ff3d" : "#ffc24b";

  return new ImageResponse(
    (
      <div
        style={{
          width: 1200,
          height: 630,
          background: "#111014",
          display: "flex",
          flexDirection: "column",
          padding: "56px 64px",
          fontFamily: "Geist",
          color: "#ededed",
          position: "relative",
        }}
      >
        {/* top rule */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: "#c8ff3d",
            display: "flex",
          }}
        />

        {/* header row */}
        <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 48 }}>
          {/* tile */}
          <div
            style={{
              width: 64,
              height: 64,
              background: "#18171c",
              border: "1px solid #232228",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 22,
              fontWeight: 600,
              color: "#ededed",
              letterSpacing: "0.05em",
            }}
          >
            {initials}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <span style={{ fontSize: 22, fontWeight: 600, color: "#ededed" }}>
              {appName}
            </span>
            <span style={{ fontSize: 14, color: "#9c9ca3" }}>{platform}</span>
          </div>

          {/* spacer */}
          <div style={{ flex: 1, display: "flex" }} />

          {/* status badge */}
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: statusColor,
              letterSpacing: "0.08em",
              border: `1px solid ${statusColor}`,
              padding: "4px 10px",
              display: "flex",
            }}
          >
            [{statusLabel}]
          </div>
        </div>

        {/* feature */}
        <div
          style={{
            fontSize: 52,
            fontWeight: 600,
            color: "#ededed",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            marginBottom: 28,
            display: "flex",
          }}
        >
          {feature}
        </div>

        {/* build meta row */}
        <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: "auto" }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 600,
              color: "#c8ff3d",
              letterSpacing: "0.04em",
            }}
          >
            {buildNo}
          </span>
          <span style={{ color: "#3a3a40", fontSize: 15, display: "flex" }}>·</span>
          <span style={{ fontSize: 15, color: "#9c9ca3" }}>{version}</span>
          {developer && (
            <>
              <span style={{ color: "#3a3a40", fontSize: 15, display: "flex" }}>·</span>
              <span style={{ fontSize: 15, color: "#9c9ca3" }}>{developer}</span>
            </>
          )}
        </div>

        {/* footer */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "1px solid #232228",
            paddingTop: 20,
            marginTop: 32,
          }}
        >
          <span style={{ fontSize: 13, color: "#9c9ca3", letterSpacing: "0.04em" }}>
            BUILDAPP
          </span>
          <span style={{ fontSize: 13, color: "#3a3a40" }}>Tap to download APK</span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [{ name: "Geist", data: fontData, weight: 400 }],
    }
  );
}
