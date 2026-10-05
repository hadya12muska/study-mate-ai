"use client";

import { useEffect, useState } from "react";

type LessonHistory = {
  lessonIndex: number;
  lessonTitle: string;
  topic: string;
  score: number;
  completedAt: string;
};

type Progress = {
  lessonsCompleted: number;
  quizzesCompleted: number;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  currentLesson: number;
  lessonHistory: LessonHistory[];
};

const defaultProgress: Progress = {
  lessonsCompleted: 0,
  quizzesCompleted: 0,
  totalQuestions: 0,
  correctAnswers: 0,
  totalScore: 0,
  currentLesson: 0,
  lessonHistory: [],
};

export default function DashboardPage() {
  const [progress, setProgress] =
    useState<Progress>(defaultProgress);

  const [goal, setGoal] = useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();

    function refresh() {
      loadData();
    }

    window.addEventListener(
      "storage",
      refresh
    );

    window.addEventListener(
      "studyMateProgressUpdated",
      refresh
    );

    return () => {
      window.removeEventListener(
        "storage",
        refresh
      );

      window.removeEventListener(
        "studyMateProgressUpdated",
        refresh
      );
    };
  }, []);

  function loadData() {
    setLoading(true);

    const savedGoal =
      localStorage.getItem("studyMateGoal");

    if (savedGoal) {
      setGoal(savedGoal);
    }

    const savedProgress =
      localStorage.getItem(
        "studyMateProgress"
      );

    if (!savedProgress) {
      setProgress(defaultProgress);
      setLoading(false);
      return;
    }

    try {
      const parsed = JSON.parse(savedProgress);

      setProgress({
        lessonsCompleted:
          Number(parsed.lessonsCompleted) || 0,

        quizzesCompleted:
          Number(parsed.quizzesCompleted) || 0,

        totalQuestions:
          Number(parsed.totalQuestions) || 0,

        correctAnswers:
          Number(parsed.correctAnswers) || 0,

        totalScore:
          Number(parsed.totalScore) || 0,

        currentLesson:
          Number(parsed.currentLesson) || 0,

        lessonHistory:
          Array.isArray(parsed.lessonHistory)
            ? parsed.lessonHistory
            : [],
      });
    } catch (error) {
      console.error(
        "Could not load progress:",
        error
      );

      setProgress(defaultProgress);
    }

    setLoading(false);
  }

  function continueLearning() {
    window.location.href = "/lesson";
  }

  function resetProgress() {
    const confirmed =
      window.confirm(
        "Are you sure you want to delete your learning progress?"
      );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(
      "studyMateProgress"
    );

    setProgress(defaultProgress);
  }

  const averageScore =
    progress.quizzesCompleted > 0
      ? Math.round(
          progress.totalScore /
            progress.quizzesCompleted
        )
      : 0;

  const accuracy =
    progress.totalQuestions > 0
      ? Math.round(
          (progress.correctAnswers /
            progress.totalQuestions) *
            100
        )
      : 0;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-5xl text-center">
          <div className="text-2xl font-bold">
            StudyMate
            <span className="text-blue-500">
              .AI
            </span>
          </div>

          <div className="mt-20">
            Loading your progress...
          </div>
        </div>
      </main>
    );
  }

  const nextLessonNumber =
    progress.currentLesson + 1;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-6xl">

        <header className="flex flex-col justify-between gap-6 md:flex-row md:items-center">
          <div>
            <div className="text-2xl font-bold">
              StudyMate
              <span className="text-blue-500">
                .AI
              </span>
            </div>

            <h1 className="mt-8 text-4xl font-bold">
              Learning Dashboard
            </h1>

            <p className="mt-3 text-slate-400">
              {goal
                ? `Your goal: ${goal}`
                : "Track your personalized learning journey."}
            </p>
          </div>

          <button
            type="button"
            onClick={continueLearning}
            className="rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
          >
            {progress.lessonsCompleted === 0
              ? "Start Lesson 1 →"
              : `Continue to Lesson ${nextLessonNumber} →`}
          </button>
        </header>

        <section className="mt-10 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-8">
          <p className="text-sm font-semibold text-blue-400">
            YOUR NEXT LESSON
          </p>

          <h2 className="mt-2 text-3xl font-bold">
            {progress.lessonsCompleted === 0
              ? "Lesson 1"
              : `Continue to Lesson ${nextLessonNumber}`}
          </h2>

          <p className="mt-3 text-slate-300">
            {progress.lessonsCompleted === 0
              ? "Start your first lesson to begin your learning journey."
              : `You have completed ${progress.lessonsCompleted} lesson${
                  progress.lessonsCompleted === 1
                    ? ""
                    : "s"
                }. Continue with the next lesson.`}
          </p>

          <button
            type="button"
            onClick={continueLearning}
            className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
          >
            {progress.lessonsCompleted === 0
              ? "Start Lesson 1"
              : `Continue Lesson ${nextLessonNumber}`}
          </button>
        </section>

        <section className="mt-8 grid gap-5 md:grid-cols-4">
          <StatCard
            title="Lessons Completed"
            value={
              progress.lessonsCompleted
            }
          />

          <StatCard
            title="Quizzes Completed"
            value={
              progress.quizzesCompleted
            }
          />

          <StatCard
            title="Average Score"
            value={`${averageScore}%`}
          />

          <StatCard
            title="Accuracy"
            value={`${accuracy}%`}
          />
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <h2 className="text-2xl font-bold">
            Your Progress
          </h2>

          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <ProgressCard
              title="Questions Answered"
              value={
                progress.totalQuestions
              }
            />

            <ProgressCard
              title="Correct Answers"
              value={
                progress.correctAnswers
              }
            />

            <ProgressCard
              title="Total Score"
              value={
                progress.totalScore
              }
            />
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold">
                Lesson History
              </h2>

              <p className="mt-2 text-slate-400">
                Your completed lessons are
                recorded here.
              </p>
            </div>

            {progress.lessonHistory.length >
              0 && (
              <button
                type="button"
                onClick={resetProgress}
                className="rounded-lg border border-red-500/40 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10"
              >
                Reset Progress
              </button>
            )}
          </div>

          {progress.lessonHistory.length ===
          0 ? (
            <div className="mt-6 rounded-xl border border-slate-700 bg-slate-800 p-8 text-center">
              <p className="text-lg font-semibold">
                No completed lessons yet.
              </p>

              <button
                type="button"
                onClick={continueLearning}
                className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
              >
                Start Lesson 1
              </button>
            </div>
          ) : (
            <div className="mt-6 space-y-4">
              {[
                ...progress.lessonHistory,
              ]
                .reverse()
                .map(
                  (
                    item,
                    index
                  ) => (
                    <div
                      key={`${item.completedAt}-${index}`}
                      className="rounded-xl border border-slate-700 bg-slate-800 p-5"
                    >
                      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                        <div>
                          <div className="mb-2 inline-block rounded-full bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
                            Lesson{" "}
                            {item.lessonIndex +
                              1}
                          </div>

                          <h3 className="text-lg font-semibold">
                            {
                              item.lessonTitle
                            }
                          </h3>

                          <p className="mt-1 text-sm text-slate-400">
                            Topic:{" "}
                            {
                              item.topic
                            }
                          </p>

                          <p className="mt-2 text-xs text-slate-500">
                            Completed:{" "}
                            {new Date(
                              item.completedAt
                            ).toLocaleString()}
                          </p>
                        </div>

                        <div>
                          <p className="text-3xl font-bold text-blue-400">
                            {
                              item.score
                            }
                            %
                          </p>

                          <p className="text-xs text-slate-500">
                            Assessment
                            score
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function StatCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}

function ProgressCard({
  title,
  value,
}: {
  title: string;
  value: string | number;
}) {
  return (
    <div className="rounded-xl bg-slate-800 p-6">
      <p className="text-sm text-slate-400">
        {title}
      </p>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>
    </div>
  );
}