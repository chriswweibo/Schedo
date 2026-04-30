import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { prisma } from './prisma'

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
        const provider = await prisma.provider.findUnique({
          where: { email: credentials.email },
        })
        if (!provider) return null
        const valid = await bcrypt.compare(credentials.password, provider.passwordHash)
        if (!valid) return null
        return {
          id: provider.id,
          email: provider.email,
          name: provider.name,
          slug: provider.slug,
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.slug = (user as unknown as { slug: string }).slug
      }
      return token
    },
    session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string
        session.user.slug = token.slug as string
      }
      return session
    },
  },
  pages: { signIn: '/auth/login' },
}
