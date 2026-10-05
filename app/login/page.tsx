"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setLoading(true);
    setError("");

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    window.location.href = "/dashboard";
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-md">
        <div className="text-center">
          <div className="text-2xl font-bold">
            StudyMate
            <span className="text-blue-500">.AI</span>
          </div>

          <h1 className="mt-12 text-4xl font-bold">
            Welcome back
          </h1>

          <p className="mt-3 text-slate-400">
            Sign in to continue learning.
          </p>
        </div>

        <form
          onSubmit={handleLogin}
          className="mt-8 space-y-5 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          <div>
            <label className="mb-2 block font-medium">
              Email
            </label>

            <input
              type="email"
              required
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 outline-none focus:border-blue-500"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label className="mb-2 block font-medium">
              Password
            </label>

            <input
              type="password"
              required
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 outline-none focus:border-blue-500"
              placeholder="Your password"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500 disabled:opacity-50"
          >
            {loading
              ? "Signing in..."
              : "Sign In"}
          </button>

          <p className="text-center text-sm text-slate-400">
            Don't have an account?{" "}
            <a
              href="/signup"
              className="text-blue-400 hover:text-blue-300"
            >
              Create one
            </a>
          </p>
        </form>
      </div>
    </main>
  );
}