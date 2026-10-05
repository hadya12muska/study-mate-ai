"use client";

import { useEffect, useMemo, useState } from "react";

type Topic = {
  title: string;
  description?: string;
};

type Module = {
  title: string;
  description?: string;
  topics: Topic[];
};

type LearningPlan = {
  title?: string;
  subject?: string;
  estimatedWeeks?: number;
  dailyHours?: number;
  weeklyHours?: number;
  totalHours?: number;
  modules: Module[];
};

type Progress = {
  lessonsCompleted: number;
  quizzesCompleted: number;
  totalQuestions: number;
  correctAnswers: number;
  totalScore: number;
  currentLesson: number;
  lessonHistory: {
    lessonIndex: number;
    lessonTitle: string;
    topic: string;
    score: number;
    completedAt: string;
  }[];
};

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
};

type Video = {
  videoId: string;
  title: string;
  thumbnail: string;
  channel: string;
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

export default function LessonPage() {
  const [goal, setGoal] = useState("");
  const [preferences, setPreferences] = useState<any>(null);
  const [plan, setPlan] =
    useState<LearningPlan | null>(null);

  const [progress, setProgress] =
    useState<Progress>(defaultProgress);

  const [lessonContent, setLessonContent] =
    useState("");

  const [lessonTitle, setLessonTitle] =
    useState("");

  const [lessonDescription, setLessonDescription] =
    useState("");

  const [quiz, setQuiz] =
    useState<QuizQuestion[]>([]);

  const [answers, setAnswers] =
    useState<Record<number, string>>({});

  const [submitted, setSubmitted] =
    useState(false);

  const [score, setScore] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [initializing, setInitializing] =
    useState(true);

  const [error, setError] =
    useState("");

  const [videos, setVideos] =
    useState<Video[]>([]);

  const [videoLoading, setVideoLoading] =
    useState(false);

  const [videoSearchUrl, setVideoSearchUrl] =
    useState("");

  const topics = useMemo(() => {
    if (!plan) {
      return [];
    }

    return plan.modules.flatMap(
      (module) =>
        Array.isArray(module.topics)
          ? module.topics
          : []
    );
  }, [plan]);

  const lessonIndex =
    progress.currentLesson;

  const currentTopic =
    topics[lessonIndex];

  useEffect(() => {
    try {
      const storedGoal =
        localStorage.getItem(
          "studyMateGoal"
        );

      const storedPreferences =
        localStorage.getItem(
          "studyMatePreferences"
        );

      const storedPlan =
        localStorage.getItem(
          "studyMateLearningPlan"
        );

      const storedProgress =
        localStorage.getItem(
          "studyMateProgress"
        );

      if (!storedGoal) {
        setError(
          "No learning goal was found."
        );
        setInitializing(false);
        setLoading(false);
        return;
      }

      if (!storedPlan) {
        setError(
          "No learning plan was found. Please create a learning plan first."
        );
        setInitializing(false);
        setLoading(false);
        return;
      }

      setGoal(storedGoal);

      if (storedPreferences) {
        try {
          setPreferences(
            JSON.parse(
              storedPreferences
            )
          );
        } catch {
          setPreferences(null);
        }
      }

      try {
        const parsedPlan =
          JSON.parse(
            storedPlan
          );

        if (
          !parsedPlan ||
          !Array.isArray(
            parsedPlan.modules
          )
        ) {
          throw new Error(
            "Learning plan is invalid."
          );
        }

        setPlan(parsedPlan);
      } catch {
        setError(
          "Your learning plan is invalid. Please create a new learning plan."
        );
        setInitializing(false);
        setLoading(false);
        return;
      }

      if (storedProgress) {
        try {
          const parsedProgress =
            JSON.parse(
              storedProgress
            );

          setProgress({
            ...defaultProgress,
            ...parsedProgress,
          });
        } catch {
          setProgress(
            defaultProgress
          );
        }
      }
    } catch (error) {
      console.error(
        "Lesson initialization error:",
        error
      );

      setError(
        "Could not load your learning plan."
      );
    } finally {
      setInitializing(false);
    }
  }, []);

  useEffect(() => {
    if (
      initializing ||
      !goal ||
      !plan ||
      topics.length === 0
    ) {
      return;
    }

    if (!currentTopic) {
      setError(
        "No lesson topic was found for your current lesson."
      );
      setLoading(false);
      return;
    }

    generateLesson(
      goal,
      currentTopic,
      preferences,
      lessonIndex
    );
  }, [
    initializing,
    goal,
    plan,
    lessonIndex,
  ]);

  async function generateLesson(
    learningGoal: string,
    topic: Topic,
    prefs: any,
    index: number
  ) {
    setLoading(true);
    setError("");
    setSubmitted(false);
    setScore(0);
    setAnswers({});
    setQuiz([]);
    setLessonContent("");
    setLessonTitle(topic.title);
    setLessonDescription(
      topic.description || ""
    );
    setVideos([]);
    setVideoSearchUrl("");

    try {
      const response =
        await fetch(
          "/api/lesson",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              goal: learningGoal,
              level:
                prefs?.level ||
                "Beginner",
              targetLevel:
                prefs?.targetLevel ||
                "Job Ready",
              topic: topic.title,
              topicDescription:
                topic.description ||
                "",
              previousPerformance:
                JSON.stringify(
                  progress.lessonHistory
                ),
            }),
          }
        );

      const responseText =
        await response.text();

      let data: any = {};

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch {
        throw new Error(
          `Lesson API returned invalid data: ${responseText.slice(
            0,
            300
          )}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            data.details ||
            `Lesson generation failed (${response.status}).`
        );
      }

      if (!data.lesson) {
        throw new Error(
          "The AI did not return a lesson."
        );
      }

      const lesson =
        data.lesson;

      const generatedContent =
        lesson.content ||
        lesson.explanation ||
        "";

      if (!generatedContent) {
        throw new Error(
          "The AI returned an empty lesson."
        );
      }

      setLessonTitle(
        lesson.title ||
          topic.title
      );

      setLessonDescription(
        lesson.description ||
          topic.description ||
          ""
      );

      setLessonContent(
        generatedContent
      );

      const generatedQuiz =
        Array.isArray(
          lesson.quiz
        )
          ? lesson.quiz
          : [];

      setQuiz(
        generatedQuiz.slice(
          0,
          5
        )
      );

      localStorage.setItem(
        "studyMateCurrentLesson",
        JSON.stringify({
          lessonIndex: index,
          title:
            lesson.title ||
            topic.title,
          topic:
            topic.title,
          description:
            lesson.description ||
            topic.description ||
            "",
          content:
            generatedContent,
          goal: learningGoal,
        })
      );

      const preference =
        prefs?.preference ||
        "Reading";

      if (
        preference === "Videos" ||
        preference === "Mixed"
      ) {
        loadVideos(
          learningGoal,
          topic.title
        );
      }
    } catch (error) {
      console.error(
        "Lesson generation error:",
        error
      );

      setError(
        error instanceof Error
          ? error.message
          : "Failed to generate lesson."
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadVideos(
    learningGoal: string,
    topic: string
  ) {
    setVideoLoading(true);

    try {
      const response =
        await fetch(
          `/api/videos?goal=${encodeURIComponent(
            learningGoal
          )}&topic=${encodeURIComponent(
            topic
          )}`
        );

      const contentType =
        response.headers.get(
          "content-type"
        );

      if (
        !contentType?.includes(
          "application/json"
        )
      ) {
        return;
      }

      const data =
        await response.json();

      if (
        Array.isArray(
          data.videos
        )
      ) {
        setVideos(
          data.videos
        );
      }

      if (
        typeof data.searchUrl ===
        "string"
      ) {
        setVideoSearchUrl(
          data.searchUrl
        );
      }
    } catch (error) {
      console.error(
        "Video loading error:",
        error
      );
    } finally {
      setVideoLoading(false);
    }
  }

  function handleAnswer(
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

  function submitQuiz() {
    if (
      quiz.length === 0 ||
      submitted
    ) {
      return;
    }

    let correct = 0;

    quiz.forEach(
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

    const calculatedScore =
      Math.round(
        (correct /
          quiz.length) *
          100
      );

    setScore(
      calculatedScore
    );

    setSubmitted(true);

    saveProgress(
      calculatedScore,
      correct
    );
  }

  function saveProgress(
    quizScore: number,
    correctAnswers: number
  ) {
    const existing =
      localStorage.getItem(
        "studyMateProgress"
      );

    let currentProgress: Progress =
      defaultProgress;

    if (existing) {
      try {
        currentProgress = {
          ...defaultProgress,
          ...JSON.parse(
            existing
          ),
        };
      } catch {
        currentProgress =
          defaultProgress;
      }
    }

    const alreadyCompleted =
      currentProgress.lessonHistory.some(
        (item) =>
          item.lessonIndex ===
          lessonIndex
      );

    const updatedHistory =
      alreadyCompleted
        ? currentProgress.lessonHistory
        : [
            ...currentProgress.lessonHistory,
            {
              lessonIndex,
              lessonTitle:
                lessonTitle ||
                currentTopic?.title ||
                `Lesson ${
                  lessonIndex + 1
                }`,
              topic:
                currentTopic?.title ||
                "",
              score:
                quizScore,
              completedAt:
                new Date().toISOString(),
            },
          ];

    const updatedProgress: Progress =
      {
        ...currentProgress,

        lessonsCompleted:
          updatedHistory.length,

        quizzesCompleted:
          alreadyCompleted
            ? currentProgress.quizzesCompleted
            : currentProgress.quizzesCompleted +
              1,

        totalQuestions:
          alreadyCompleted
            ? currentProgress.totalQuestions
            : currentProgress.totalQuestions +
              quiz.length,

        correctAnswers:
          alreadyCompleted
            ? currentProgress.correctAnswers
            : currentProgress.correctAnswers +
              correctAnswers,

        totalScore:
          alreadyCompleted
            ? currentProgress.totalScore
            : currentProgress.totalScore +
              quizScore,

        currentLesson:
          currentProgress.currentLesson,

        lessonHistory:
          updatedHistory,
      };

    localStorage.setItem(
      "studyMateProgress",
      JSON.stringify(
        updatedProgress
      )
    );

    setProgress(
      updatedProgress
    );
  }

  function continueToNextLesson() {
    const nextIndex =
      lessonIndex + 1;

    if (
      nextIndex >=
      topics.length
    ) {
      window.location.href =
        "/dashboard";
      return;
    }

    const updatedProgress = {
      ...progress,
      currentLesson:
        nextIndex,
    };

    localStorage.setItem(
      "studyMateProgress",
      JSON.stringify(
        updatedProgress
      )
    );

    setProgress(
      updatedProgress
    );
  }

  function goToPractice() {
    localStorage.setItem(
      "studyMateCurrentLesson",
      JSON.stringify({
        lessonIndex,
        title:
          lessonTitle ||
          currentTopic?.title ||
          "",
        topic:
          currentTopic?.title ||
          "",
        description:
          lessonDescription ||
          currentTopic?.description ||
          "",
        content:
          lessonContent ||
          "",
        goal,
      })
    );

    window.location.href =
      "/practice";
  }

  if (
    initializing ||
    (loading &&
      !error &&
      !lessonContent)
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-4xl">
          <div className="text-2xl font-bold">
            StudyMate
            <span className="text-blue-500">
              .AI
            </span>
          </div>

          <div className="mt-20 text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-700 border-t-blue-500" />

            <h1 className="mt-6 text-2xl font-bold">
              Creating your lesson...
            </h1>

            <p className="mt-3 text-slate-400">
              StudyMate.AI is preparing your
              personalized lesson.
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <div className="text-2xl font-bold">
            StudyMate
            <span className="text-blue-500">
              .AI
            </span>
          </div>

          <div className="mt-16 rounded-2xl border border-red-500/30 bg-slate-900 p-8">
            <h1 className="text-2xl font-bold text-red-400">
              Lesson generation failed
            </h1>

            <p className="mt-4 whitespace-pre-wrap text-slate-300">
              {error}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={() =>
                  window.location.reload()
                }
                className="flex-1 rounded-xl bg-blue-600 px-6 py-4 font-semibold hover:bg-blue-500"
              >
                Try Again
              </button>

              <button
                type="button"
                onClick={() =>
                  (window.location.href =
                    "/dashboard")
                }
                className="flex-1 rounded-xl border border-slate-700 px-6 py-4 font-semibold hover:bg-slate-800"
              >
                Dashboard
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (
    !plan ||
    !currentTopic
  ) {
    return (
      <main className="min-h-screen bg-slate-950 px-6 py-12 text-white">
        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold">
            No lesson found
          </h1>

          <p className="mt-4 text-slate-400">
            Please create a learning plan first.
          </p>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/")
            }
            className="mt-8 rounded-xl bg-blue-600 px-6 py-3 font-semibold hover:bg-blue-500"
          >
            Start Again
          </button>
        </div>
      </main>
    );
  }

  const totalLessons =
    topics.length;

  const progressPercent =
    totalLessons > 0
      ? Math.min(
          100,
          Math.round(
            ((lessonIndex + 1) /
              totalLessons) *
              100
          )
        )
      : 0;

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-col gap-4 border-b border-slate-800 pb-6 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-2xl font-bold">
              StudyMate
              <span className="text-blue-500">
                .AI
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              Lesson{" "}
              {lessonIndex + 1} of{" "}
              {totalLessons}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              (window.location.href =
                "/dashboard")
            }
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm hover:bg-slate-800"
          >
            Dashboard
          </button>
        </header>

        <div className="mt-6">
          <div className="mb-2 flex justify-between text-sm text-slate-400">
            <span>
              Learning progress
            </span>

            <span>
              {progressPercent}%
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full rounded-full bg-blue-600 transition-all"
              style={{
                width: `${progressPercent}%`,
              }}
            />
          </div>
        </div>

        <section className="mt-10">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <div className="text-sm font-semibold text-blue-400">
              Current topic
            </div>

            <h1 className="mt-3 text-4xl font-bold">
              {lessonTitle ||
                currentTopic.title}
            </h1>

            <p className="mt-4 text-slate-400">
              {lessonDescription ||
                currentTopic.description}
            </p>
          </div>
        </section>

        {(preferences?.preference ===
          "Videos" ||
          preferences?.preference ===
            "Mixed") && (
          <section className="mt-8">
            <h2 className="text-2xl font-bold">
              Recommended Videos
            </h2>

            <p className="mt-2 text-slate-400">
              Videos related to your current
              lesson topic.
            </p>

            {videoLoading && (
              <div className="mt-4 rounded-xl border border-slate-800 bg-slate-900 p-6 text-slate-400">
                Searching for relevant videos...
              </div>
            )}

            {!videoLoading &&
              videos.length === 0 &&
              videoSearchUrl && (
                <a
                  href={videoSearchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-block text-blue-400 hover:text-blue-300"
                >
                  Search YouTube for this topic →
                </a>
              )}

            {videos.length > 0 && (
              <div className="mt-6 grid gap-6 md:grid-cols-2">
                {videos.map(
                  (video) => (
                    <a
                      key={
                        video.videoId
                      }
                      href={`https://www.youtube.com/watch?v=${video.videoId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 transition hover:border-slate-600"
                    >
                      <img
                        src={
                          video.thumbnail
                        }
                        alt={
                          video.title
                        }
                        className="aspect-video w-full object-cover"
                      />

                      <div className="p-5">
                        <h3 className="font-semibold">
                          {
                            video.title
                          }
                        </h3>

                        <p className="mt-2 text-sm text-slate-500">
                          {
                            video.channel
                          }
                        </p>
                      </div>
                    </a>
                  )
                )}
              </div>
            )}
          </section>
        )}

        <section className="mt-8">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
            <h2 className="text-2xl font-bold">
              Lesson
            </h2>

            <div className="mt-6 whitespace-pre-wrap text-base leading-8 text-slate-300">
              {lessonContent}
            </div>
          </div>
        </section>

        {quiz.length > 0 && (
          <section className="mt-8">
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-8">
              <h2 className="text-2xl font-bold">
                Check Your Understanding
              </h2>

              <p className="mt-2 text-slate-400">
                Answer all questions to complete
                this lesson.
              </p>

              <div className="mt-8 space-y-8">
                {quiz.map(
                  (
                    question,
                    index
                  ) => {
                    const selected =
                      answers[
                        index
                      ];

                    const isCorrect =
                      submitted &&
                      selected ===
                        question.correctAnswer;

                    return (
                      <div
                        key={
                          index
                        }
                        className="border-b border-slate-800 pb-8 last:border-b-0"
                      >
                        <h3 className="font-semibold leading-7">
                          {index +
                            1}
                          .{" "}
                          {
                            question.question
                          }
                        </h3>

                        <div className="mt-4 space-y-3">
                          {question.options.map(
                            (
                              option
                            ) => {
                              const selectedOption =
                                selected ===
                                option;

                              const correctOption =
                                submitted &&
                                option ===
                                  question.correctAnswer;

                              let classes =
                                "border-slate-700 bg-slate-800 hover:border-blue-500";

                              if (
                                selectedOption &&
                                !submitted
                              ) {
                                classes =
                                  "border-blue-500 bg-blue-500/10";
                              }

                              if (
                                submitted &&
                                correctOption
                              ) {
                                classes =
                                  "border-green-500 bg-green-500/10";
                              }

                              if (
                                submitted &&
                                selectedOption &&
                                !correctOption
                              ) {
                                classes =
                                  "border-red-500 bg-red-500/10";
                              }

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
                                    handleAnswer(
                                      index,
                                      option
                                    )
                                  }
                                  className={`w-full rounded-xl border p-4 text-left transition ${classes}`}
                                >
                                  {
                                    option
                                  }
                                </button>
                              );
                            }
                          )}
                        </div>

                        {submitted &&
                          question.explanation && (
                            <div
                              className={`mt-4 rounded-xl p-4 text-sm ${
                                isCorrect
                                  ? "bg-green-500/10 text-green-300"
                                  : "bg-red-500/10 text-red-300"
                              }`}
                            >
                              {
                                question.explanation
                              }
                            </div>
                          )}
                      </div>
                    );
                  }
                )}
              </div>

              {!submitted && (
                <button
                  type="button"
                  onClick={
                    submitQuiz
                  }
                  disabled={
                    Object.keys(
                      answers
                    ).length !==
                    quiz.length
                  }
                  className="mt-8 w-full rounded-xl bg-blue-600 px-6 py-4 font-semibold transition hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Submit Quiz
                </button>
              )}

              {submitted && (
                <div className="mt-8 rounded-2xl border border-slate-700 bg-slate-800 p-6 text-center">
                  <p className="text-sm text-slate-400">
                    Your score
                  </p>

                  <p className="mt-2 text-5xl font-bold">
                    {score}%
                  </p>

                  <p className="mt-3 text-slate-400">
                    {score >= 80
                      ? "Great work! You understand this lesson well."
                      : score >= 60
                      ? "Good effort. Review the areas you missed."
                      : "Keep practicing. Review this lesson before moving forward."}
                  </p>
                </div>
              )}
            </div>
          </section>
        )}

        <section className="mt-8 flex flex-col gap-4 md:flex-row">
          <button
            type="button"
            onClick={
              goToPractice
            }
            className="flex-1 rounded-xl border border-blue-500 bg-blue-500/10 px-6 py-4 font-semibold text-blue-300 transition hover:bg-blue-500/20"
          >
            Practice This Lesson →
          </button>

          {submitted && (
            <button
              type="button"
              onClick={
                continueToNextLesson
              }
              className="flex-1 rounded-xl bg-blue-600 px-6 py-4 font-semibold transition hover:bg-blue-500"
            >
              {lessonIndex + 1 >=
              totalLessons
                ? "Finish Learning Plan →"
                : "Continue to Next Lesson →"}
            </button>
          )}
        </section>
      </div>
    </main>
  );
}