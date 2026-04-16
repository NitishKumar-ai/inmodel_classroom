"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Navbar() {
  const { data: session } = useSession();

  return (
    <nav className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shadow-sm">
      <Link href="/" className="font-bold text-xl text-indigo-600">
        AI Classroom
      </Link>
      
      <div className="flex items-center gap-6">
        {session?.user ? (
          <>
            <div className="text-sm">
              <span className="text-slate-500 mr-2">{session.user.role}</span>
              <span className="font-semibold text-slate-700">{session.user.name || session.user.email}</span>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition"
            >
              Sign Out
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 transition"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
