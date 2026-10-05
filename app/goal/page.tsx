"use client";

import { useState } from "react";

export default function GoalPage() {
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [targetLevel, setTargetLevel] = useState("Job Ready");
  const [hours, setHours] = useState("1");
  const [deadline, setDeadline] = useState("");
  const [preference, setPreference] = useState("Reading");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!goal.trim()) {
      alert("Please enter what you want to learn.");
      return;
    }

   localStorage.setItem("studyMateGoal", goal);

localStorage.setItem(
  "studyMatePreferences",
  JSON.stringify({
    level,
    targetLevel,
    hours,
    deadline,
    preference,
  })
);

window.location.href = "/assessment";
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="mb-10">
          <div className="text-2xl font-bold">
            StudyMate<span className="text-blue-500">.AI</span>
          </div>

          <h1 className="mt-10 text-4xl font-bold">
            Let's create your learning goal
          </h1>

          <p className="mt-3 text-slate-400">
            Tell us about your goal so StudyMate.AI can build a personalized
            learning journey for you.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900 p-8"
        >
          {/* Goal */}
          <div>
            <label className="mb-2 block font-medium">
              What do you want to learn?
            </label>

            <textarea
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Example: I want to learn JavaScript and become job-ready."
              className="h-32 w-full resize-none rounded-xl border border-slate-700 bg-slate-800 p-4 outline-none focus:border-blue-500"
            />
          </div>

          {/* Current Level */}
          <div>
            <label className="mb-2 block font-medium">
              What is your current level?
            </label>

            <select
              value={level}
              onChange={(e) => setLevel(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 outline-none"
            >
              <option>Beginner</option>
              <option>Elementary</option>
              <option>Intermediate</option>
              <option>Advanced</option>
              <option>Expert</option>
            </select>
          </div>

          {/* Target */}
          <div>
            <label className="mb-2 block font-medium">
              What level do you want to reach?
            </label>

            <select
              value={targetLevel}
              onChange={(e) => setTargetLevel(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 outline-none"
            >
              <option>Basic Understanding</option>
              <option>Intermediate</option>
              <option>Advanced</option>
              <option>Job Ready</option>
              <option>Expert</option>
            </select>
          </div>

          {/* Hours */}
          <div>
            <label className="mb-2 block font-medium">
              How many hours can you study each day?
            </label>

            <select
              value={hours}
              onChange={(e) => setHours(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 outline-none"
            >
              <option value="0.5">30 minutes</option>
              <option value="1">1 hour</option>
              <option value="2">2 hours</option>
              <option value="3">3 hours</option>
              <option value="4">4+ hours</option>
            </select>
          </div>

          {/* Deadline */}
          <div>
            <label className="mb-2 block font-medium">
              When do you want to reach your goal?
            </label>

            <input
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 outline-none"
            />
          </div>

          {/* Preference */}
          <div>
            <label className="mb-2 block font-medium">
              How do you prefer to learn?
            </label>

            <select
              value={preference}
              onChange={(e) => setPreference(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-800 p-4 outline-none"
            >
              <option>Reading</option>
              <option>Examples</option>
              <option>Practice</option>
              <option>Videos</option>
              <option>Mixed</option>
            </select>
          </div>

          <button
            type="submit"
            className="w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold transition hover:bg-blue-500"
          >
            Continue to Assessment →
          </button>
        </form>
      </div>
    </main>
  );
}