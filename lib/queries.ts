import "server-only";
import { prisma } from "./db";

export async function listApplications() {
  const [apps, sizeByApp] = await Promise.all([
    prisma.application.findMany({
      orderBy: { name: "asc" },
      include: {
        builds: {
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { number: true, version: true, environment: true },
        },
        _count: { select: { builds: true } },
      },
    }),
    prisma.build.groupBy({
      by: ["applicationId"],
      _sum: { apkSizeBytes: true },
    }),
  ]);
  const sizeMap = new Map(
    sizeByApp.map((s) => [s.applicationId, s._sum.apkSizeBytes ?? BigInt(0)])
  );

  return apps.map((app) => ({
    ...app,
    buildCount: app._count.builds,
    usedBytes: sizeMap.get(app.id) ?? BigInt(0),
    latest: app.builds[0] ?? null,
  }));
}

export const BUILD_PAGE_SIZE = 30;

/** App page: the newest `limit` builds, grouped by version, plus the total. */
export async function getApplicationBySlug(slug: string, limit = BUILD_PAGE_SIZE) {
  const app = await prisma.application.findUnique({
    where: { slug },
    include: { defaultStorage: { select: { name: true, provider: true } } },
  });
  if (!app) return null;

  const [builds, totalBuilds] = await Promise.all([
    prisma.build.findMany({
      where: { applicationId: app.id },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: {
        developer: { select: { name: true } },
        _count: { select: { tickets: true } },
      },
    }),
    prisma.build.count({ where: { applicationId: app.id } }),
  ]);

  const groupsByVersion = new Map<string, typeof builds>();
  for (const b of builds) {
    const list = groupsByVersion.get(b.version) ?? [];
    list.push(b);
    groupsByVersion.set(b.version, list);
  }

  return {
    app,
    latest: builds[0] ?? null,
    lastNumber: builds[0]?.number ?? null,
    totalBuilds,
    versionGroups: Array.from(groupsByVersion.entries()).map(
      ([version, groupBuilds]) => ({
        version,
        builds: groupBuilds,
      })
    ),
  };
}

/** Create-build page: only what the form needs — never the full build history. */
export async function getNewBuildContext(slug: string) {
  const app = await prisma.application.findUnique({
    where: { slug },
    include: { defaultStorage: { select: { name: true, provider: true } } },
  });
  if (!app) return null;

  const [latest, numbers] = await Promise.all([
    prisma.build.findFirst({
      where: { applicationId: app.id },
      orderBy: { createdAt: "desc" },
      select: { version: true, number: true },
    }),
    prisma.build.findMany({ where: { applicationId: app.id }, select: { number: true } }),
  ]);
  return { app, latest, existingNumbers: numbers.map((b) => b.number) };
}

export async function getBuild(slug: string, id: string) {
  const build = await prisma.build.findUnique({
    where: { id },
    include: {
      application: true,
      developer: { select: { name: true } },
      tickets: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!build || build.application.slug !== slug) return null;

  const siblings = await prisma.build.findMany({
    where: {
      applicationId: build.applicationId,
      version: build.version,
      id: { not: build.id },
    },
    orderBy: { createdAt: "desc" },
    include: { developer: { select: { name: true } } },
  });

  return { app: build.application, build, siblings };
}

export async function getRecentBuilds(limit = 7) {
  return prisma.build.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      developer: { select: { name: true } },
      application: { select: { slug: true, name: true } },
      _count: { select: { tickets: true } },
    },
  });
}

export async function getDashboardStats() {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [buildsThisWeek, publishedToday, applicationCount, sizeAgg, openIssues] =
    await Promise.all([
      prisma.build.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.build.count({
        where: { status: "PUBLISHED", createdAt: { gte: startOfToday } },
      }),
      prisma.application.count(),
      prisma.build.aggregate({ _sum: { apkSizeBytes: true } }),
      prisma.$queryRaw<[{ n: number }]>`
        SELECT COUNT(DISTINCT ("repo", "number"))::int AS n FROM "BuildTicket"
      `,
    ]);

  return {
    buildsThisWeek,
    publishedToday,
    applicationCount,
    storageUsedBytes: sizeAgg._sum.apkSizeBytes ?? BigInt(0),
    issuesLinked: openIssues[0].n,
  };
}

export async function listStorageConnections() {
  const connections = await prisma.storageConnection.findMany({
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      name: true,
      provider: true,
      accountLabel: true,
      isDefault: true,
      usedBytesApprox: true,
      createdAt: true,
      applications: { select: { id: true, name: true } },
    },
  });
  return connections;
}

export async function getApplicationStorageMap() {
  return prisma.application.findMany({
    orderBy: { name: "asc" },
    include: { defaultStorage: { select: { name: true } } },
  });
}
