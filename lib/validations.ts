import { z } from 'zod'

export const RegisterProviderSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  profession: z.string().min(1).default('Other'),
})

export const CreateBookingSchema = z.object({
  providerId: z.string(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email().max(254),
  guestPhone: z.string().max(40).optional(),
  notes: z.string().max(2000).optional(),
  bookingType: z.enum(['INSTANT', 'REQUEST']).default('INSTANT'),
})

export const CreateQuoteRequestSchema = z.object({
  providerIds: z.array(z.string()).min(1).max(5),
  guestName: z.string().min(1).max(200),
  guestEmail: z.string().email().max(254),
  guestPhone: z.string().max(40).optional(),
  message: z.string().min(10).max(2000),
})

export const UpdateProviderSettingsSchema = z.object({
  bio: z.string().optional(),
  profession: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  address: z.string().optional(),
  acceptedRadiusKm: z.number().min(5).max(100).optional(),
  isVisible: z.boolean().optional(),
  bookingMode: z.enum(['INSTANT', 'REQUEST', 'BOTH']).optional(),
})
