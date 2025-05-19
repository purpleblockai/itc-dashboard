import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { MongoDBAdapter } from '@auth/mongodb-adapter';
import clientPromise from '@/lib/mongodb';
import { compare } from 'bcryptjs';

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          return null;
        }

        try {
          const client = await clientPromise;
          const db = client.db();
          const user = await db.collection('users').findOne({ 
            userId: credentials.username 
          });

          if (!user) {
            return null;
          }

          const passwordMatch = await compare(credentials.password, user.password);

          if (!passwordMatch) {
            return null;
          }

          return {
            id: user._id.toString(),
            name: user.name || user.fullName || user.username || user.userId,
            email: user.userId,
            clientName: user.clientName,
            role: user.role || 'user',
            category: user.category
          };
        } catch (error) {
          console.error('Authentication error:', error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.clientName = user.clientName;
        token.name = user.name;
        token.email = user.email;
        token.category = user.category;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.clientName = token.clientName;
        session.user.name = token.name;
        session.user.email = token.email;
        session.user.category = token.category;
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST }; 