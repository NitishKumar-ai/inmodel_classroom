import { Role } from "@prisma/client";
import "next-auth";

declare module "next-auth" {
  interface User {
    role: Role;
    id: string;
  }

  interface Session {
    user: {
      id: string;
      role: Role;
      email: string;
      name?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    id: string;
  }
}
