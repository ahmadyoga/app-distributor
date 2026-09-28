import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { prisma } from "@/lib/db";
import { formatBytes } from "@/lib/format";

export const alt = "Shared build — version, build number and download";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Terminal theme, mirrored from globals.css (the renderer can't read CSS vars).
const C = {
  bg: "#111014",
  surface: "#18171c",
  line: "#2c2b32",
  ink: "#ededed",
  muted: "#9c9ca3",
  lime: "#c8ff3d",
  amber: "#ffc24b",
};

const fontDir = join(process.cwd(), "assets/fonts");
const [regular, semibold, bold] = await Promise.all(
  ["Regular", "SemiBold", "Bold"].map((w) => readFile(join(fontDir, `IBMPlexMono-${w}.ttf`)))
);
const fonts = [
  { name: "Plex", data: regular, weight: 400 as const },
  { name: "Plex", data: semibold, weight: 600 as const },
  { name: "Plex", data: bold, weight: 700 as const },
];

function truncate(s: string, max: number) {
  return s.length > max ? `${s.slice(0, max - 1).trimEnd()}…` : s;
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        padding: "18px 26px",
        border: `2px solid ${C.line}`,
        background: C.surface,
        flex: 1,
      }}
    >
      <span style={{ fontSize: 17, color: C.muted, letterSpacing: 2 }}>{label}</span>
      <span style={{ fontSize: 44, fontWeight: 700, color, letterSpacing: -1 }}>{value}</span>
    </div>
  );
}

export default async function Image({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const build = await prisma.build.findUnique({
    where: { shareToken: token },
    include: { application: true, developer: { select: { name: true } } },
  });

  if (!build) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "0 80px",
            background: C.bg,
            borderTop: `8px solid ${C.muted}`,
            fontFamily: "Plex",
            color: C.ink,
          }}
        >
          <span style={{ fontSize: 22, color: C.muted, letterSpacing: 3 }}>BUILDAPP</span>
          <span style={{ fontSize: 60, fontWeight: 700, marginTop: 18 }}>Link unavailable</span>
          <span style={{ fontSize: 26, color: C.muted, marginTop: 14 }}>
            This shared build was disabled or removed.
          </span>
        </div>
      ),
      { ...size, fonts }
    );
  }

  const app = build.application;
  const isStaging = build.environment === "STAGING";
  const envColor = isStaging ? C.amber : C.lime;
  const feature = truncate(build.feature, 60);
  const featureSize = feature.length > 34 ? 50 : 64;
  const date = build.createdAt.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const details = [build.apkSizeBytes ? formatBytes(build.apkSizeBytes) : null, date, build.developer.name]
    .filter(Boolean)
    .join("  ·  ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "44px 64px 48px",
          background: C.bg,
          // Colour-coded so the environment reads even in a tiny chat thumbnail.
          borderTop: `10px solid ${envColor}`,
          fontFamily: "Plex",
          color: C.ink,
        }}
      >
        {/* App identity */}
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 68,
              height: 68,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: C.surface,
              border: `2px solid ${C.line}`,
              fontSize: 26,
              fontWeight: 700,
            }}
          >
            {app.initials}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <span style={{ fontSize: 30, fontWeight: 600 }}>{truncate(app.name, 36)}</span>
            <span style={{ fontSize: 20, color: C.muted }}>{app.platform}</span>
          </div>
          <span style={{ marginLeft: "auto", fontSize: 20, color: C.muted, letterSpacing: 3 }}>
            BUILDAPP
          </span>
        </div>

        {/* Feature */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 40 }}>
          <span style={{ fontSize: 18, color: C.muted, letterSpacing: 3 }}>FEATURE</span>
          <span
            style={{
              fontSize: featureSize,
              fontWeight: 700,
              lineHeight: 1.12,
              letterSpacing: -1.5,
              marginTop: 8,
            }}
          >
            {feature}
          </span>
        </div>

        {/* Key facts */}
        <div style={{ display: "flex", gap: 16, marginTop: "auto" }}>
          <Stat label="BUILD" value={build.number} color={C.lime} />
          <Stat label="VERSION" value={`v${truncate(build.version, 12)}`} color={C.ink} />
          <Stat label="ENVIRONMENT" value={isStaging ? "STAGING" : "PROD"} color={envColor} />
        </div>

        {/* Call to action */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 24 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 22px",
              background: C.lime,
              color: C.bg,
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 1,
            }}
          >
            ↓ DOWNLOAD APK
          </div>
          {build.hasInspector && (
            <span style={{ marginLeft: 18, fontSize: 20, fontWeight: 600, color: C.amber }}>
              [INSPECTOR]
            </span>
          )}
          <span style={{ marginLeft: "auto", fontSize: 20, color: C.muted }}>{details}</span>
        </div>
      </div>
    ),
    { ...size, fonts }
  );
}
