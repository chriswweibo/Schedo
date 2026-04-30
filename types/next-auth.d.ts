import { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface User {
    slug: string
  }

  interface Session {
    user: {
      id: string
      slug: string
    } & DefaultSession['user']
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    slug?: string
  }
}
