import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { z } from "zod";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        try {
          const validated = loginSchema.parse(credentials);

          const result = await pool.query(
            "SELECT * FROM users WHERE email = $1",
            [validated.email],
          );

          const user = result.rows[0];
          if (!user) return null;

          const passwordField = user.password_hash ?? user.password;
          if (!passwordField) return null;

          const isValid = await bcrypt.compare(
            validated.password,
            passwordField,
          );
          if (!isValid) return null;

          return {
            id: String(user.id),
            email: user.email,
            name: user.name ?? user.email,
          };
        } catch (error) {
          console.error("Auth error:", error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};
