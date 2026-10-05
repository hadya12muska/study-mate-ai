"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [goal, setGoal] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [checkingUser, setCheckingUser] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user?.email) {
        setUserEmail(user.email);
      }

      setCheckingUser(false);
    }

    loadUser();
  }, []);

  function handleCreatePlan() {
    if (!userEmail) {
      window.location.href = "/login";
      return;
    }

    if (!goal.trim()) {
      alert("Please enter a learning goal.");
      return;
    }

    localStorage.removeItem("studyMateLearningPlan");
    localStorage.removeItem("studyMateProgress");
    localStorage.removeItem("studyMateCurrentLesson");
    localStorage.removeItem("studyMateAssessment");
    localStorage.removeItem("studyMatePreferences");

    localStorage.setItem(
      "studyMateGoal",
      goal.trim()
    );

    window.location.href = "/goal";
  }

  async function handleSignOut() {
    await supabase.auth.signOut();

    setUserEmail("");

    window.location.reload();
  }

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <nav className="border-b border-slate-800">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <div className="text-2xl font-bold">
            StudyMate<span className="text-blue-500">.AI</span>
          </div>

          <div className="flex items-center gap-6 text-sm text-slate-300">
            <a
              href="#how-it-works"
              className="hover:text-white"
            >
              How it works
            </a>

            {!checkingUser && userEmail ? (
              <div className="flex items-center gap-3">
                <span className="hidden text-slate-400 sm:block">
                  {userEmail}
                </span>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-lg border border-slate-700 px-4 py-2 transition hover:bg-slate-800"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <a
                href="/login"
                className="rounded-lg border border-slate-700 px-4 py-2 transition hover:bg-slate-800"
              >
                Sign in
              </a>
            )}
          </div>
        </div>
      </nav>

      <section className="px-6 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <div className="mb-6 inline-block rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-sm text-blue-400">
            Your personal AI learning agent
          </div>

          <h1 className="text-5xl font-bold tracking-tight md:text-6xl">
            Learn anything.
            <br />
            <span className="text-blue-500">
              Your way.
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-400">
            StudyMate.AI creates a personalized
            learning plan, teaches you, gives you
            practice, evaluates your progress, and
            adapts your learning journey with AI.
          </p>
        </div>

        <div className="mx-auto mt-12 max-w-3xl rounded-2xl border border-slate-800 bg-slate-900 p-8 shadow-2xl">
          <h2 className="text-2xl font-semibold">
            What do you want to learn?
          </h2>

          <p className="mt-2 text-slate-400">
            Tell StudyMate.AI about your learning
            goal.
          </p>

          <textarea
            value={goal}
            onChange={(e) =>
              setGoal(e.target.value)
            }
            placeholder="Example: I want to learn biology and understand the human body."
            className="mt-6 h-36 w-full resize-none rounded-xl border border-slate-700 bg-slate-800 p-4 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
          />

          <button
            type="button"
            onClick={handleCreatePlan}
            className="mt-4 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold transition hover:bg-blue-500"
          >
            {userEmail
              ? "Create My Learning Plan →"
              : "Sign In to Start Learning →"}
          </button>
        </div>
      </section>

      <section
        id="how-it-works"
        className="border-t border-slate-800 px-6 py-20"
      >
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold">
              Your AI learning journey
            </h2>

            <p className="mt-3 text-slate-400">
              StudyMate.AI continuously adapts to
              how you learn.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-5">
            <Feature
              number="01"
              title="Assess"
              description="Discover your current knowledge and skill level."
            />

            <Feature
              number="02"
              title="Plan"
              description="Get a personalized roadmap designed around your goal."
            />

            <Feature
              number="03"
              title="Learn"
              description="Study lessons explained at your level."
            />

            <Feature
              number="04"
              title="Practice"
              description="Practice with AI-generated exercises and quizzes."
            />

            <Feature
              number="05"
              title="Adapt"
              description="Your plan changes based on your performance."
            />
          </div>
        </div>
      </section>
    </main>
  );
}

function Feature({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <div className="text-sm font-semibold text-blue-500">
        {number}
      </div>

      <h3 className="mt-4 text-xl font-semibold">
        {title}
      </h3>

      <p className="mt-3 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  );
}