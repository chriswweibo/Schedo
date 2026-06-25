import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/prisma'

// Generated at runtime (not build time): it queries the DB, which isn't
// reliably reachable during the build. Cached/revalidated hourly.
export const dynamic = 'force-dynamic'
export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXTAUTH_URL ?? 'https://schedo.me'

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`,        lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${base}/search`,  lastModified: new Date(), changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/privacy`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/terms`,   lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
  ]

  let providerRoutes: MetadataRoute.Sitemap = []
  try {
    const providers = await prisma.provider.findMany({
      where: { isVisible: true },
      select: { slug: true, createdAt: true },
    })
    providerRoutes = providers.map((p) => ({
      url: `${base}/p/${p.slug}`,
      lastModified: p.createdAt,
      changeFrequency: 'weekly',
      priority: 0.8,
    }))
  } catch (err) {
    // DB unreachable — still emit a valid sitemap with the static routes.
    console.error('[sitemap] provider query failed', err)
  }

  return [...staticRoutes, ...providerRoutes]
}
