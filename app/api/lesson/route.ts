import { NextResponse } from "next/server";

type QuizQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
};

function extractJSON(text: string) {
  let cleaned = text.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (firstBrace === -1 || lastBrace === -1) {
    throw new Error("AI did not return valid JSON.");
  }

  return JSON.parse(
    cleaned.slice(firstBrace, lastBrace + 1)
  );
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      goal,
      level,
      targetLevel,
      topic,
      topicDescription,
      previousPerformance,
    } = body;

    if (!goal || !topic) {
      return NextResponse.json(
        {
          error: "Goal and topic are required.",
        },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error: "OpenRouter API key is missing.",
        },
        { status: 500 }
      );
    }

    const prompt = `
You are StudyMate.AI, an adaptive AI teacher.

Create ONE complete lesson for the student.

========================
EXACT LEARNING GOAL
========================

${goal}

========================
CURRENT LESSON TOPIC
========================

${topic}

TOPIC DESCRIPTION:
${topicDescription || "No additional description provided."}

========================
STUDENT INFORMATION
========================

Current level:
${level || "Beginner"}

Target level:
${targetLevel || "Job Ready"}

Previous performance:
${previousPerformance || "No previous performance data."}

========================
IMPORTANT SUBJECT RULE
========================

The EXACT learning goal is the source of truth.

Teach ONLY the subject requested in the learning goal.

Do NOT change the subject.

Do NOT assume English.

Do NOT introduce unrelated subjects.

Do NOT use information from previous students.

Do NOT teach a different topic.

The lesson must specifically teach:

${topic}

The topic must directly support:

${goal}

========================
LESSON REQUIREMENTS
========================

Create a clear lesson appropriate for the student's current level.

Include:

1. A short introduction
2. A clear explanation
3. At least 3 useful examples
4. At least 3 important key points
5. A short summary
6. Exactly 5 multiple-choice questions

The quiz questions MUST be based only on the material taught in this lesson.

Each quiz question must:

- Have exactly 4 options.
- Have exactly one correct answer.
- Have correctAnswer exactly match one option.
- Test understanding of this lesson.
- Match the student's level.

========================
OUTPUT
========================

Return ONLY valid JSON.

Use exactly this structure:

{
  "title": "Lesson title",
  "description": "Short description of the lesson",
  "content": "Complete lesson content including the introduction, explanation, examples, key points, and summary.",
  "introduction": "Short introduction",
  "explanation": "Clear explanation",
  "examples": [
    "Example 1",
    "Example 2",
    "Example 3"
  ],
  "keyPoints": [
    "Key point 1",
    "Key point 2",
    "Key point 3"
  ],
  "summary": "Short summary",
  "quiz": [
    {
      "question": "Question",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": "Option A",
      "explanation": "Why this answer is correct."
    }
  ]
}

Rules:

- Exactly 5 quiz questions.
- Exactly 4 options per question.
- correctAnswer must exactly match one option.
- No duplicate questions.
- Questions must be about the current lesson topic.
- Do not introduce unrelated subjects.
- Do not change the student's subject.
- Do not mention English unless English is the actual learning goal.
- Do not mention biology unless biology is the actual learning goal.
- Do not mention programming unless programming is the actual learning goal.
- Do not return markdown.
- Do not return code fences.
- Return JSON only.
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error(
        "OpenRouter lesson error:",
        responseText
      );

      return NextResponse.json(
        {
          error: "OpenRouter request failed.",
          details: responseText,
        },
        {
          status: response.status,
        }
      );
    }

    const data = JSON.parse(responseText);

    const content =
      data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error: "No AI response received.",
        },
        { status: 500 }
      );
    }

    const lesson = extractJSON(content);

    if (
      !lesson ||
      typeof lesson !== "object"
    ) {
      throw new Error(
        "Invalid lesson returned by AI."
      );
    }

    if (
      !lesson.quiz ||
      !Array.isArray(lesson.quiz) ||
      lesson.quiz.length !== 5
    ) {
      throw new Error(
        "AI did not return exactly 5 quiz questions."
      );
    }

    const quiz: QuizQuestion[] =
      lesson.quiz.map(
        (question: QuizQuestion) => {
          if (
            !question ||
            typeof question.question !==
              "string" ||
            !Array.isArray(question.options) ||
            question.options.length !== 4 ||
            typeof question.correctAnswer !==
              "string" ||
            !question.options.includes(
              question.correctAnswer
            )
          ) {
            throw new Error(
              "Invalid quiz question."
            );
          }

          return {
            question: question.question,
            options: question.options,
            correctAnswer:
              question.correctAnswer,
            explanation:
              typeof question.explanation ===
              "string"
                ? question.explanation
                : "",
          };
        }
      );

    const title =
      typeof lesson.title === "string" &&
      lesson.title.trim()
        ? lesson.title
        : topic;

    const description =
      typeof lesson.description === "string"
        ? lesson.description
        : topicDescription || "";

    const contentText =
      typeof lesson.content === "string" &&
      lesson.content.trim()
        ? lesson.content
        : [
            lesson.introduction || "",
            lesson.explanation || "",
            ...(Array.isArray(lesson.examples)
              ? lesson.examples.map(
                  (example: string) =>
                    `Example: ${example}`
                )
              : []),
            ...(Array.isArray(lesson.keyPoints)
              ? lesson.keyPoints.map(
                  (point: string) =>
                    `Key point: ${point}`
                )
              : []),
            lesson.summary || "",
          ]
            .filter(Boolean)
            .join("\n\n");

    return NextResponse.json({
      success: true,
      lesson: {
        title,
        description,
        content: contentText,
        introduction:
          lesson.introduction || "",
        explanation:
          lesson.explanation || "",
        examples:
          Array.isArray(lesson.examples)
            ? lesson.examples
            : [],
        keyPoints:
          Array.isArray(lesson.keyPoints)
            ? lesson.keyPoints
            : [],
        summary:
          lesson.summary || "",
        quiz,
      },
    });
  } catch (error) {
    console.error(
      "Lesson generation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate lesson.",
      },
      { status: 500 }
    );
  }
}