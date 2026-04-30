/**
 * @jest-environment node
 */
import { haversineKm } from '@/lib/geo'

describe('haversineKm', () => {
  it('returns 0 for same point', () => {
    expect(haversineKm(51.5, -0.1, 51.5, -0.1)).toBe(0)
  })

  it('returns ~344 km for London to Paris', () => {
    const km = haversineKm(51.5074, -0.1278, 48.8566, 2.3522)
    expect(km).toBeGreaterThan(340)
    expect(km).toBeLessThan(350)
  })

  it('is symmetric', () => {
    const a = haversineKm(51.5, -0.1, 48.8, 2.3)
    const b = haversineKm(48.8, 2.3, 51.5, -0.1)
    expect(Math.abs(a - b)).toBeLessThan(0.01)
  })
})
