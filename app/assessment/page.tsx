"use client";

import { useEffect, useRef, useState } from "react";

type Difficulty =
  | "Beginner"
  | "Elementary"
  | "Intermediate"
  | "Advanced"
  | "Expert";

type Question = {
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: Difficulty;
};

type AssessmentResult = {
  level: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
  recommendation: string;
};

export default function AssessmentPage() {
  const [goal, setGoal] = useState("");

  const [questions, setQuestions] =
    useState<Question[]>([]);

  const [currentQuestion, setCurrentQuestion] =
    useState(0);

  const [answers, setAnswers] =
    useState<string[]>([]);

  const [selectedAnswer, setSelectedAnswer] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [submitting, setSubmitting] =
    useState(false);

  const [creatingPlan, setCreatingPlan] =
    useState(false);

  const [result, setResult] =
    useState<AssessmentResult | null>(null);

  const [error, setError] =
    useState("");

  const hasLoadedAssessment =
    useRef(false);

  const generationId =
    useRef(0);

  useEffect(() => {
    if (hasLoadedAssessment.current) {
      return;
    }

    hasLoadedAssessment.current = true;

    const savedGoal =
      localStorage.getItem(
        "studyMateGoal"
      );

    if (!savedGoal) {
      setError(
        "No learning goal found. Please create a goal first."
      );

      setLoading(false);

      return;
    }

    setGoal(savedGoal);

    generateQuestions(savedGoal);
  }, []);

  async function generateQuestions(
    savedGoal: string
  ) {
    const requestId =
      ++generationId.current;

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/assessment",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "generate",
              goal: savedGoal,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not generate assessment."
        );
      }

      if (
        requestId !==
        generationId.current
      ) {
        return;
      }

      const generatedQuestions =
        data.questions?.questions;

      if (
        !Array.isArray(
          generatedQuestions
        ) ||
        generatedQuestions.length !== 5
      ) {
        throw new Error(
          "The AI did not generate exactly 5 questions."
        );
      }

      setQuestions(
        generatedQuestions
      );

      setCurrentQuestion(0);
      setAnswers([]);
      setSelectedAnswer("");
    } catch (error) {
      console.error(error);

      if (
        requestId !==
        generationId.current
      ) {
        return;
      }

      setError(
        error instanceof Error
          ? error.message
          : "Could not generate assessment."
      );
    } finally {
      if (
        requestId ===
        generationId.current
      ) {
        setLoading(false);
      }
    }
  }

  async function handleNext() {
    if (!selectedAnswer) {
      alert("Please select an answer.");
      return;
    }

    const newAnswers = [
      ...answers,
    ];

    newAnswers[currentQuestion] =
      selectedAnswer;

    setAnswers(newAnswers);

    if (
      currentQuestion <
      questions.length - 1
    ) {
      setCurrentQuestion(
        currentQuestion + 1
      );

      setSelectedAnswer("");

      return;
    }

    await evaluateAssessment(
      newAnswers
    );
  }

  async function evaluateAssessment(
    finalAnswers: string[]
  ) {
    setSubmitting(true);
    setError("");

    try {
      if (
        finalAnswers.length !==
        questions.length
      ) {
        throw new Error(
          "Some answers are missing. Please try the assessment again."
        );
      }

      const formattedAnswers =
        questions.map(
          (question, index) => ({
            question:
              question.question,

            selectedAnswer:
              finalAnswers[index],

            correctAnswer:
              question.correctAnswer,

            difficulty:
              question.difficulty,
          })
        );

      const response =
        await fetch(
          "/api/assessment",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              action: "evaluate",
              goal,
              answers:
                formattedAnswers,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Assessment failed."
        );
      }

      const assessment =
        data.assessment;

      setResult(
        assessment
      );

      localStorage.setItem(
        "studyMateAssessment",
        JSON.stringify(
          assessment
        )
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "The AI assessment failed."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function createLearningPlan() {
    if (!result) {
      return;
    }

    setCreatingPlan(true);
    setError("");

    try {
      const storedPreferences =
        localStorage.getItem(
          "studyMatePreferences"
        );

      let preferences = {};

      if (storedPreferences) {
        try {
          preferences =
            JSON.parse(
              storedPreferences
            );
        } catch {
          preferences = {};
        }
      }

      const response =
        await fetch(
          "/api/plan",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              goal,
              preferences,
              assessment: result,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Could not create learning plan."
        );
      }

      if (
        !data.plan ||
        !Array.isArray(
          data.plan.modules
        ) ||
        data.plan.modules.length === 0
      ) {
        throw new Error(
          "The AI did not create a valid learning plan."
        );
      }

      localStorage.setItem(
        "studyMateLearningPlan",
        JSON.stringify(
          data.plan
        )
      );

      localStorage.setItem(
        "studyMateProgress",
        JSON.stringify({
          lessonsCompleted: 0,
          quizzesCompleted: 0,
          totalQuestions: 0,
          correctAnswers: 0,
          totalScore: 0,
          currentLesson: 0,
          lessonHistory: [],
        })
      );

      localStorage.removeItem(
        "studyMateCurrentLesson"
      );

      window.location.href =
        "/dashboard";
    } catch (error) {
      console.error(
        "Learning plan error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Could not create learning plan."
      );
    } finally {
      setCreatingPlan(false);
    }
  }

  function restartAssessment() {
    setQuestions([]);
    setCurrentQuestion(0);
    setAnswers([]);
    setSelectedAnswer("");
    setResult(null);
    setError("");

    generationId.current += 1;

    if (goal) {
      generateQuestions(goal);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-2xl font-bold">
            StudyMate
            <span className="text-blue-500">
              .AI
            </span>
          </div>

          <div className="mt-24 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

            <h1 className="mt-6 text-3xl font-bold">
              Creating your assessment...
            </h1>

            <p className="mt-3 text-slate-400">
              StudyMate.AI is generating
              questions based on your
              learning goal.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (
    error &&
    questions.length === 0 &&
    !result
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-2xl font-bold">
            StudyMate
            <span className="text-blue-500">
              .AI
            </span>
          </div>

          <div className="mt-16 rounded-2xl border border-red-900 bg-slate-900 p-8">
            <h1 className="text-2xl font-bold">
              Something went wrong
            </h1>

            <p className="mt-4 text-slate-400">
              {error}
            </p>

            <button
              type="button"
              onClick={() => {
                if (goal) {
                  generateQuestions(
                    goal
                  );
                } else {
                  window.location.href =
                    "/goal";
                }
              }}
              className="mt-6 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (result) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-2xl font-bold">
            StudyMate
            <span className="text-blue-500">
              .AI
            </span>
          </div>

          <div className="mt-12">
            <p className="text-sm font-semibold text-blue-400">
              AI ASSESSMENT RESULT
            </p>

            <h1 className="mt-3 text-4xl font-bold">
              Your starting point
            </h1>

            <p className="mt-3 text-slate-400">
              StudyMate.AI analyzed your
              demonstrated knowledge and
              determined your starting level.
            </p>
          </div>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                Current level
              </p>

              <p className="mt-2 text-3xl font-bold text-blue-400">
                {result.level}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <p className="text-sm text-slate-400">
                Assessment score
              </p>

              <p className="mt-2 text-3xl font-bold">
                {result.score}/100
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
              How your level was determined
            </h2>

            <p className="mt-3 leading-7 text-slate-400">
              Your score is calculated from
              your actual answers. StudyMate.AI
              also considers the highest
              difficulty level you successfully
              answered.
            </p>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
              Strengths
            </h2>

            {result.strengths.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {result.strengths.map(
                  (
                    strength,
                    index
                  ) => (
                    <li
                      key={index}
                      className="rounded-lg bg-slate-800 p-3 text-slate-300"
                    >
                      ✓ {strength}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="mt-4 text-slate-400">
                No specific strengths
                identified yet.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900 p-6">
            <h2 className="text-xl font-semibold">
              Areas to improve
            </h2>

            {result.weaknesses.length > 0 ? (
              <ul className="mt-4 space-y-3">
                {result.weaknesses.map(
                  (
                    weakness,
                    index
                  ) => (
                    <li
                      key={index}
                      className="rounded-lg bg-slate-800 p-3 text-slate-300"
                    >
                      → {weakness}
                    </li>
                  )
                )}
              </ul>
            ) : (
              <p className="mt-4 text-slate-400">
                No major weaknesses
                identified yet.
              </p>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
            <h2 className="text-xl font-semibold">
              StudyMate.AI recommendation
            </h2>

            <p className="mt-3 leading-7 text-slate-300">
              {result.recommendation}
            </p>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-red-300">
              {error}
            </div>
          )}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={
                restartAssessment
              }
              disabled={creatingPlan}
              className="w-full rounded-xl border border-slate-700 px-6 py-4 font-semibold hover:bg-slate-800 disabled:opacity-50"
            >
              Take Assessment Again
            </button>

            <button
              type="button"
              onClick={
                createLearningPlan
              }
              disabled={creatingPlan}
              className="w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {creatingPlan
                ? "Creating Your Learning Plan..."
                : "Create My Learning Plan →"}
            </button>
          </div>
        </div>
      </main>
    );
  }

  const question =
    questions[currentQuestion];

  if (!question) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-3xl">
        <div className="text-2xl font-bold">
          StudyMate
          <span className="text-blue-500">
            .AI
          </span>
        </div>

        <div className="mt-12">
          <p className="text-sm font-semibold text-blue-400">
            INITIAL ASSESSMENT
          </p>

          <h1 className="mt-3 text-4xl font-bold">
            Let's understand your current
            level
          </h1>

          <p className="mt-3 text-slate-400">
            These questions were generated
            specifically for your learning goal.
          </p>
        </div>

        <div className="mt-10">
          <div className="mb-3 flex justify-between text-sm text-slate-400">
            <span>
              Question{" "}
              {currentQuestion + 1} of{" "}
              {questions.length}
            </span>

            <span>
              {Math.round(
                ((currentQuestion + 1) /
                  questions.length) *
                  100
              )}
              %
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-blue-600 transition-all"
              style={{
                width: `${
                  ((currentQuestion + 1) /
                    questions.length) *
                  100
                }%`,
              }}
            />
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8">
          <div className="mb-5 inline-block rounded-full border border-slate-700 bg-slate-800 px-3 py-1 text-sm text-slate-300">
            {question.difficulty} difficulty
          </div>

          <h2 className="text-2xl font-semibold">
            {question.question}
          </h2>

          <div className="mt-6 space-y-3">
            {question.options.map(
              (option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() =>
                    setSelectedAnswer(
                      option
                    )
                  }
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedAnswer ===
                    option
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-slate-700 bg-slate-800 hover:border-slate-500"
                  }`}
                >
                  {option}
                </button>
              )
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={submitting}
            className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {submitting
              ? "AI is analyzing your answers..."
              : currentQuestion ===
                  questions.length - 1
                ? "Finish Assessment"
                : "Next Question →"}
          </button>
        </div>
      </div>
    </main>
  );
}