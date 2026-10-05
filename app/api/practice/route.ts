import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const {
      goal,
      level,
      topic,
      lessonContent,
    } = body;

    if (!goal || !topic) {
      return NextResponse.json(
        {
          error:
            "Goal and topic are required.",
        },
        { status: 400 }
      );
    }

    const apiKey =
      process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "OpenRouter API key is missing.",
        },
        { status: 500 }
      );
    }

    const prompt = `
You are StudyMate.AI, an adaptive practice teacher.

Create a practice exercise for the student.

EXACT LEARNING GOAL:
${goal}

STUDENT LEVEL:
${level || "Beginner"}

CURRENT LESSON TOPIC:
${topic}

LESSON CONTENT:
${lessonContent || "No lesson content provided."}

Create exactly 5 practice questions.

Rules:

- Questions must be directly related to the current lesson.
- Do not introduce unrelated subjects.
- Match the student's level.
- Questions should test understanding, not just memorization.
- Every question must have exactly 4 options.
- There must be exactly one correct answer.
- correctAnswer must exactly match one of the options.
- Do not reveal the answer in the question.
- Return ONLY valid JSON.

Return:

{
  "topic": "${topic}",
  "questions": [
    {
      "question": "Question",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": "Option A",
      "explanation": "Explain why this answer is correct."
    }
  ]
}
`;

    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Authorization:
            `Bearer ${apiKey}`,
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

    const responseText =
      await response.text();

    if (!response.ok) {
      return NextResponse.json(
        {
          error:
            "OpenRouter request failed.",
        },
        {
          status: response.status,
        }
      );
    }

    const data =
      JSON.parse(responseText);

    const content =
      data.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error:
            "No AI response received.",
        },
        { status: 500 }
      );
    }

    let cleaned =
      content
        .trim()
        .replace(
          /^```json\s*/i,
          ""
        )
        .replace(
          /^```\s*/i,
          ""
        )
        .replace(
          /\s*```$/i,
          ""
        )
        .trim();

    const firstBrace =
      cleaned.indexOf("{");

    const lastBrace =
      cleaned.lastIndexOf("}");

    if (
      firstBrace === -1 ||
      lastBrace === -1
    ) {
      throw new Error(
        "AI did not return valid JSON."
      );
    }

    cleaned = cleaned.slice(
      firstBrace,
      lastBrace + 1
    );

    const practice =
      JSON.parse(cleaned);

    if (
      !practice.questions ||
      !Array.isArray(
        practice.questions
      ) ||
      practice.questions.length !== 5
    ) {
      throw new Error(
        "AI did not return exactly 5 practice questions."
      );
    }

    for (
      const question of practice.questions
    ) {
      if (
        !question.question ||
        !Array.isArray(
          question.options
        ) ||
        question.options.length !== 4 ||
        !question.correctAnswer ||
        !question.options.includes(
          question.correctAnswer
        )
      ) {
        throw new Error(
          "Invalid practice question."
        );
      }
    }

    return NextResponse.json({
      success: true,
      practice,
    });
  } catch (error) {
    console.error(
      "Practice generation error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to generate practice.",
      },
      { status: 500 }
    );
  }
}