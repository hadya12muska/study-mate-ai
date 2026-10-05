"use client";

import { useEffect, useState } from "react";

type PracticeQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
};

type Practice = {
  topic: string;
  questions: PracticeQuestion[];
};

export default function PracticePage() {
  const [goal, setGoal] = useState("");
  const [level, setLevel] = useState("Beginner");
  const [topic, setTopic] = useState("");
  const [lessonContent, setLessonContent] =
    useState("");

  const [practice, setPractice] =
    useState<Practice | null>(null);

  const [answers, setAnswers] =
    useState<Record<number, string>>({});

  const [submitted, setSubmitted] =
    useState(false);

  const [score, setScore] =
    useState<number | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  useEffect(() => {
    loadPractice();
  }, []);

  async function loadPractice() {
    try {
      const savedGoal =
        localStorage.getItem(
          "studyMateGoal"
        ) || "";

      const savedPreferences =
        localStorage.getItem(
          "studyMatePreferences"
        );

      const savedLesson =
        localStorage.getItem(
          "studyMateCurrentLesson"
        );

      setGoal(savedGoal);

      let studentLevel =
        "Beginner";

      if (savedPreferences) {
        try {
          const preferences =
            JSON.parse(
              savedPreferences
            );

          studentLevel =
            preferences.level ||
            "Beginner";
        } catch {}
      }

      setLevel(studentLevel);

      let currentTopic = "";

      let currentLessonContent = "";

      if (savedLesson) {
        try {
          const lesson =
            JSON.parse(
              savedLesson
            );

          currentTopic =
            lesson.topic ||
            lesson.title ||
            "";

          currentLessonContent =
            `
Title:
${lesson.title || ""}

Introduction:
${lesson.introduction || ""}

Explanation:
${lesson.explanation || ""}

Examples:
${
  Array.isArray(
    lesson.examples
  )
    ? lesson.examples.join(
        "\n"
      )
    : ""
}

Key Points:
${
  Array.isArray(
    lesson.keyPoints
  )
    ? lesson.keyPoints.join(
        "\n"
      )
    : ""
}

Summary:
${lesson.summary || ""}
`;
        } catch {}
      }

      if (!currentTopic) {
        const savedPlan =
          localStorage.getItem(
            "studyMateLearningPlan"
          );

        if (savedPlan) {
          try {
            const plan =
              JSON.parse(
                savedPlan
              );

            if (
              Array.isArray(
                plan.modules
              ) &&
              plan.modules.length >
                0
            ) {
              const firstModule =
                plan.modules[0];

              if (
                Array.isArray(
                  firstModule.topics
                ) &&
                firstModule.topics.length >
                  0
              ) {
                const firstTopic =
                  firstModule
                    .topics[0];

                currentTopic =
                  typeof firstTopic ===
                  "string"
                    ? firstTopic
                    : firstTopic.title ||
                      "";
              }
            }
          } catch {}
        }
      }

      if (!currentTopic) {
        currentTopic =
          savedGoal ||
          "Introduction";
      }

      setTopic(currentTopic);
      setLessonContent(
        currentLessonContent
      );

      await generatePractice(
        savedGoal,
        studentLevel,
        currentTopic,
        currentLessonContent
      );
    } catch (error) {
      console.error(error);

      setError(
        "Could not load practice."
      );

      setLoading(false);
    }
  }

  async function generatePractice(
    currentGoal: string,
    currentLevel: string,
    currentTopic: string,
    currentLessonContent: string
  ) {
    setLoading(true);
    setError("");
    setPractice(null);
    setAnswers({});
    setSubmitted(false);
    setScore(null);

    try {
      const response =
        await fetch(
          "/api/practice",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              goal: currentGoal,
              level: currentLevel,
              topic: currentTopic,
              lessonContent:
                currentLessonContent,
            }),
          }
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to generate practice."
        );
      }

      setPractice(
        data.practice
      );
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate practice."
      );
    }

    setLoading(false);
  }

  function selectAnswer(
    questionIndex: number,
    answer: string
  ) {
    if (submitted) {
      return;
    }

    setAnswers(
      (previous) => ({
        ...previous,
        [questionIndex]:
          answer,
      })
    );
  }

  function submitPractice() {
    if (!practice) {
      return;
    }

    if (
      Object.keys(answers)
        .length !==
      practice.questions.length
    ) {
      alert(
        "Please answer every question before submitting."
      );

      return;
    }

    let correct = 0;

    practice.questions.forEach(
      (
        question,
        index
      ) => {
        if (
          answers[index] ===
          question.correctAnswer
        ) {
          correct++;
        }
      }
    );

    const finalScore =
      Math.round(
        (correct /
          practice.questions
            .length) *
          100
      );

    setScore(finalScore);
    setSubmitted(true);

    savePracticeProgress(
      finalScore,
      correct
    );
  }

  function savePracticeProgress(
    finalScore: number,
    correct: number
  ) {
    const saved =
      localStorage.getItem(
        "studyMateProgress"
      );

    let progress: any = {
      lessonsCompleted: 0,
      quizzesCompleted: 0,
      totalQuestions: 0,
      correctAnswers: 0,
      totalScore: 0,
      currentLesson: 0,
      practiceCompleted: 0,
      practiceQuestions: 0,
      practiceCorrect: 0,
      practiceScore: 0,
      lessonHistory: [],
    };

    if (saved) {
      try {
        const parsed =
          JSON.parse(saved);

        progress = {
          ...progress,
          ...parsed,
        };
      } catch {}
    }

    progress.practiceCompleted =
      Number(
        progress.practiceCompleted
      ) + 1;

    progress.practiceQuestions =
      Number(
        progress.practiceQuestions
      ) + 5;

    progress.practiceCorrect =
      Number(
        progress.practiceCorrect
      ) + correct;

    progress.practiceScore =
      Number(
        progress.practiceScore
      ) + finalScore;

    localStorage.setItem(
      "studyMateProgress",
      JSON.stringify(
        progress
      )
    );

    window.dispatchEvent(
      new Event(
        "studyMateProgressUpdated"
      )
    );
  }

  function goToLesson() {
    window.location.href =
      "/lesson";
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl text-center">
          <div className="text-2xl font-bold">
            StudyMate
            <span className="text-blue-500">
              .AI
            </span>
          </div>

          <div className="mt-20 text-lg">
            Creating your practice...
          </div>

          <p className="mt-3 text-slate-400">
            Your AI teacher is creating
            exercises based on your lesson.
          </p>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-20 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8">
            <h1 className="text-2xl font-bold text-red-400">
              Something went wrong
            </h1>

            <p className="mt-4 text-slate-300">
              {error}
            </p>

            <button
              type="button"
              onClick={() =>
                window.location.reload()
              }
              className="mt-6 rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (!practice) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
      <div className="mx-auto max-w-4xl">

        <header className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <div className="text-2xl font-bold">
              StudyMate
              <span className="text-blue-500">
                .AI
              </span>
            </div>

            <p className="mt-6 text-sm font-semibold text-blue-400">
              PRACTICE
            </p>

            <h1 className="mt-2 text-4xl font-bold">
              Practice:{" "}
              {practice.topic}
            </h1>

            <p className="mt-3 text-slate-400">
              Test your understanding
              with exercises generated
              from your lesson.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/dashboard")
            }
            className="rounded-xl border border-slate-700 px-5 py-3 text-sm hover:bg-slate-800"
          >
            Dashboard
          </button>
        </header>

        <section className="mt-8 rounded-2xl border border-blue-500/30 bg-blue-500/10 p-6">
          <p className="text-sm text-blue-300">
            Current level
          </p>

          <p className="mt-1 text-xl font-semibold">
            {level}
          </p>
        </section>

        <section className="mt-8 space-y-6">
          {practice.questions.map(
            (
              question,
              questionIndex
            ) => (
              <article
                key={
                  questionIndex
                }
                className="rounded-2xl border border-slate-800 bg-slate-900 p-7"
              >
                <h2 className="text-lg font-semibold leading-7">
                  {questionIndex +
                    1}
                  .{" "}
                  {
                    question.question
                  }
                </h2>

                <div className="mt-6 space-y-3">
                  {question.options.map(
                    (option) => {
                      const selected =
                        answers[
                          questionIndex
                        ] ===
                        option;

                      const correct =
                        submitted &&
                        option ===
                          question.correctAnswer;

                      const wrong =
                        submitted &&
                        selected &&
                        option !==
                          question.correctAnswer;

                      return (
                        <button
                          key={
                            option
                          }
                          type="button"
                          disabled={
                            submitted
                          }
                          onClick={() =>
                            selectAnswer(
                              questionIndex,
                              option
                            )
                          }
                          className={`w-full rounded-xl border p-4 text-left transition ${
                            correct
                              ? "border-green-500 bg-green-500/10"
                              : wrong
                              ? "border-red-500 bg-red-500/10"
                              : selected
                              ? "border-blue-500 bg-blue-500/10"
                              : "border-slate-700 hover:border-slate-500"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-4">
                            <span>
                              {
                                option
                              }
                            </span>

                            {correct && (
                              <span className="text-sm font-semibold text-green-400">
                                Correct
                              </span>
                            )}

                            {wrong && (
                              <span className="text-sm font-semibold text-red-400">
                                Incorrect
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>

                {submitted && (
                  <div className="mt-5 rounded-xl bg-slate-800 p-5">
                    <p className="text-sm font-semibold text-blue-400">
                      Explanation
                    </p>

                    <p className="mt-2 leading-7 text-slate-300">
                      {
                        question.explanation
                      }
                    </p>
                  </div>
                )}
              </article>
            )
          )}
        </section>

        {!submitted ? (
          <button
            type="button"
            onClick={
              submitPractice
            }
            className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500"
          >
            Submit Practice
          </button>
        ) : (
          <section className="mt-8 rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center">
            <p className="text-sm font-semibold text-blue-400">
              PRACTICE COMPLETE
            </p>

            <h2 className="mt-3 text-4xl font-bold">
              Your Score
            </h2>

            <p className="mt-4 text-6xl font-bold text-blue-400">
              {score}%
            </p>

            <p className="mt-4 text-slate-400">
              {score !== null &&
              score >= 80
                ? "Excellent! You understand this topic very well."
                : score !== null &&
                  score >= 60
                ? "Good work! A little more practice will strengthen your understanding."
                : "Keep practicing. Review the lesson and try again."}
            </p>

            <div className="mt-8 flex flex-col gap-3 md:flex-row">
              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="flex-1 rounded-xl border border-slate-700 px-6 py-4 font-semibold hover:bg-slate-800"
              >
                Practice Again
              </button>

              <button
                type="button"
                onClick={
                  goToLesson
                }
                className="flex-1 rounded-xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500"
              >
                Continue Learning →
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}