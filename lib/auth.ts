import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import { prisma } from './prisma'
import { upsertGoogleProvider } from './googleAuth'
import { verifyProviderCredentials } from './credentialsAuth'

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET)

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null
        return verifyProviderCredentials(credentials.email, credentials.password)
      },
    }),
    ...(googleEnabled
      ? [
          GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            authorization: {
              params: {
                access_type: 'offline',
                prompt: 'consent',
                scope:
                  'openid email profile https://www.googleapis.com/auth/calendar.readonly',
              },
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== 'google') return true
      const email = profile?.email
      const verified = (profile as { email_verified?: boolean } | null)?.email_verified
      if (!email || verified !== true) return false
      await upsertGoogleProvider({
        email,
        name: profile?.name ?? email.split('@')[0],
        googleId: account.providerAccountId,
        accessToken: account.access_token ?? null,
        refreshToken: account.refresh_token ?? null,
        expiresAtSec: account.expires_at ?? null,
      })
      return true
    },
    async jwt({ token, user, account, profile }) {
      if (user) {
        token.id = user.id
        token.slug = user.slug
      }
      if (account?.provider === 'google' && profile?.email) {
        const p = await prisma.provider.findUnique({
          where: { email: profile.email },
          select: { id: true, slug: true },
        })
        if (p) {
          token.id = p.id
          token.slug = p.slug
        }
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id ?? ''
        session.user.slug = token.slug ?? ''
      }
      return session
    },
  },
  pages: { signIn: '/auth/login' },
}
