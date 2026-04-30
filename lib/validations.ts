import { z } from 'zod'

export const RegisterProviderSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  profession: z.string().min(2),
})

export const CreateBookingSchema = z.object({
  providerId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  guestName: z.string().min(1),
  guestEmail: z.string().email(),
  guestPhone: z.string().optional(),
  notes: z.string().optional(),
  bookingType: z.enum(['INSTANT', 'REQUEST']).default('INSTANT'),
})

export const UpdateProviderSettingsSchema = z.object({
  bio: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  address: z.string().optional(),
  acceptedRadiusKm: z.number().min(5).max(100).optional(),
  isVisible: z.boolean().optional(),
  bookingMode: z.enum(['INSTANT', 'REQUEST', 'BOTH']).optional(),
})
