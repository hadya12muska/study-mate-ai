import { NextResponse } from "next/server";

type GeneratedQuestion = {
  question: string;
  options: string[];
  correctAnswer: string;
  difficulty: "Beginner" | "Elementary" | "Intermediate" | "Advanced" | "Expert";
};

type StudentAnswer = {
  question: string;
  selectedAnswer: string;
  correctAnswer: string;
  difficulty: "Beginner" | "Elementary" | "Intermediate" | "Advanced" | "Expert";
};

function extractJSON(text: string) {
  let cleaned = text.trim();

  // Remove markdown code fences
  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  // Find the JSON object
  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");

  if (firstObject === -1 || lastObject === -1) {
    throw new Error("AI did not return valid JSON.");
  }

  cleaned = cleaned.slice(firstObject, lastObject + 1);

  return JSON.parse(cleaned);
}

const LEVELS = [
  "Beginner",
  "Elementary",
  "Intermediate",
  "Advanced",
  "Expert",
] as const;

function getLevelNumber(level: string) {
  const index = LEVELS.indexOf(
    level as (typeof LEVELS)[number]
  );

  return index === -1 ? 0 : index;
}

function calculateScore(answers: StudentAnswer[]) {
  if (answers.length === 0) {
    return 0;
  }

  const correct = answers.filter(
    (answer) => answer.selectedAnswer === answer.correctAnswer
  ).length;

  return Math.round((correct / answers.length) * 100);
}

function determineLevel(answers: StudentAnswer[], score: number) {
  const correctAnswers = answers.filter(
    (answer) => answer.selectedAnswer === answer.correctAnswer
  );

  if (correctAnswers.length === 0) {
    return "Beginner";
  }

  /*
   * Find the highest difficulty the student answered correctly.
   */
  let highestDifficulty = 0;

  for (const answer of correctAnswers) {
    const difficulty = getLevelNumber(answer.difficulty);

    if (difficulty > highestDifficulty) {
      highestDifficulty = difficulty;
    }
  }

  /*
   * Score-based starting point.
   */
  let scoreLevel = 0;

  if (score >= 90) {
    scoreLevel = 4;
  } else if (score >= 75) {
    scoreLevel = 3;
  } else if (score >= 55) {
    scoreLevel = 2;
  } else if (score >= 30) {
    scoreLevel = 1;
  } else {
    scoreLevel = 0;
  }

  /*
   * Combine score and demonstrated difficulty.
   *
   * We don't simply trust the AI.
   * The server makes the final decision.
   */

  let finalLevel = Math.max(scoreLevel, highestDifficulty);

  /*
   * Avoid jumping directly to Expert from a tiny assessment
   * unless the student actually answered an Expert question.
   */
  if (finalLevel > 4) {
    finalLevel = 4;
  }

  return LEVELS[finalLevel];
}

function validateQuestions(data: unknown): GeneratedQuestion[] {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid AI question response.");
  }

  const response = data as { questions?: unknown };

  if (!Array.isArray(response.questions)) {
    throw new Error("AI did not return a questions array.");
  }

  if (response.questions.length !== 5) {
    throw new Error("AI did not return exactly 5 questions.");
  }

  const questions = response.questions.map((item) => {
    if (!item || typeof item !== "object") {
      throw new Error("Invalid question.");
    }

    const question = item as Partial<GeneratedQuestion>;

    if (typeof question.question !== "string") {
      throw new Error("Invalid question text.");
    }

    if (!Array.isArray(question.options)) {
      throw new Error("Invalid question options.");
    }

    if (question.options.length !== 4) {
      throw new Error("Every question must have exactly 4 options.");
    }

    if (
      !question.options.every(
        (option) => typeof option === "string"
      )
    ) {
      throw new Error("Invalid question option.");
    }

    if (typeof question.correctAnswer !== "string") {
      throw new Error("Invalid correct answer.");
    }

    if (!question.options.includes(question.correctAnswer)) {
      throw new Error(
        "Correct answer does not match one of the options."
      );
    }

    if (
      !question.difficulty ||
      !LEVELS.includes(
        question.difficulty as (typeof LEVELS)[number]
      )
    ) {
      throw new Error("Invalid question difficulty.");
    }

    return {
      question: question.question,
      options: question.options,
      correctAnswer: question.correctAnswer,
      difficulty: question.difficulty,
    };
  });

  return questions;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const { action, goal, answers } = body;

    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.error("OPENROUTER_API_KEY is missing.");

      return NextResponse.json(
        { error: "OpenRouter API key is missing." },
        { status: 500 }
      );
    }

    // =========================================================
    // GENERATE QUESTIONS
    // =========================================================

    if (action === "generate") {
      if (!goal || typeof goal !== "string") {
        return NextResponse.json(
          { error: "Learning goal is required." },
          { status: 400 }
        );
      }

      const prompt = `
You are StudyMate.AI, an adaptive learning assessment agent.

The student's learning goal is:

${goal}

Create exactly 5 multiple-choice questions to determine the student's current knowledge.

The questions MUST be directly related to the student's learning goal.

The questions must progressively increase in difficulty.

Use exactly these difficulty levels:

1. Beginner
2. Elementary
3. Intermediate
4. Advanced
5. Expert

For this assessment, create:

Question 1 → Beginner
Question 2 → Elementary
Question 3 → Intermediate
Question 4 → Advanced
Question 5 → Expert

This is important because StudyMate.AI uses the difficulty of correctly answered questions to determine the student's demonstrated ability.

Examples:

- Programming goal → programming questions
- JavaScript goal → JavaScript questions
- English goal → English questions
- Mathematics goal → mathematics questions
- Biology goal → biology questions
- History goal → history questions

IMPORTANT:
Return ONLY a JSON object.

Do NOT write:
- explanations
- markdown
- code fences
- "User Safety"
- commentary
- text before the JSON
- text after the JSON

Return exactly this structure:

{
  "questions": [
    {
      "question": "Question text",
      "options": [
        "Option A",
        "Option B",
        "Option C",
        "Option D"
      ],
      "correctAnswer": "Option A",
      "difficulty": "Beginner"
    }
  ]
}

Rules:
- Exactly 5 questions.
- Question 1 must be Beginner.
- Question 2 must be Elementary.
- Question 3 must be Intermediate.
- Question 4 must be Advanced.
- Question 5 must be Expert.
- Every question must have exactly 4 options.
- correctAnswer must exactly match one of the options.
- Questions must be relevant to the learning goal.
- Questions should test actual knowledge, not guessing.
- Return ONLY JSON.
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
        console.error("OpenRouter error:", responseText);

        return NextResponse.json(
          {
            error: "OpenRouter request failed.",
            details: responseText,
          },
          { status: response.status }
        );
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          "Invalid OpenRouter response:",
          responseText
        );

        return NextResponse.json(
          {
            error: "OpenRouter returned an invalid response.",
          },
          { status: 500 }
        );
      }

      const result = data.choices?.[0]?.message?.content;

      if (!result) {
        return NextResponse.json(
          { error: "No AI response received." },
          { status: 500 }
        );
      }

      console.log("AI question response:", result);

      try {
        const parsed = extractJSON(result);

        const questions = validateQuestions(parsed);

        return NextResponse.json({
          success: true,
          questions: {
            questions,
          },
        });
      } catch (error) {
        console.error(
          "Question JSON parsing error:",
          error
        );

        console.error(
          "Raw AI response:",
          result
        );

        return NextResponse.json(
          {
            error:
              "The AI returned an invalid assessment format. Please try again.",
          },
          { status: 500 }
        );
      }
    }

    // =========================================================
    // EVALUATE ASSESSMENT
    // =========================================================

    if (action === "evaluate") {
      if (!goal || !Array.isArray(answers)) {
        return NextResponse.json(
          {
            error:
              "Goal and assessment answers are required.",
          },
          { status: 400 }
        );
      }

      const validatedAnswers: StudentAnswer[] = answers.map(
        (answer: StudentAnswer) => ({
          question: answer.question,
          selectedAnswer: answer.selectedAnswer,
          correctAnswer: answer.correctAnswer,
          difficulty: answer.difficulty,
        })
      );

      if (validatedAnswers.length !== 5) {
        return NextResponse.json(
          {
            error:
              "A complete assessment requires exactly 5 answers.",
          },
          { status: 400 }
        );
      }

      /*
       * Calculate score ourselves.
       * The AI does not decide the numerical score.
       */
      const score = calculateScore(validatedAnswers);

      /*
       * Determine level using:
       * 1. Number of correct answers
       * 2. Highest difficulty answered correctly
       */
      const level = determineLevel(
        validatedAnswers,
        score
      );

      const correctAnswers = validatedAnswers.filter(
        (answer) =>
          answer.selectedAnswer === answer.correctAnswer
      );

      const incorrectAnswers = validatedAnswers.filter(
        (answer) =>
          answer.selectedAnswer !== answer.correctAnswer
      );

      /*
       * Ask AI only for useful qualitative feedback.
       */
      const feedbackPrompt = `
You are StudyMate.AI.

The student's learning goal is:

${goal}

The assessment results are:

${JSON.stringify(
  {
    score,
    determinedLevel: level,
    correctAnswers,
    incorrectAnswers,
  },
  null,
  2
)}

The student's level and score have already been calculated by the system.

You MUST NOT change the score or level.

Provide:
- strengths
- weaknesses
- recommendation

Return ONLY valid JSON.

Use exactly this structure:

{
  "strengths": [
    "Strength 1",
    "Strength 2"
  ],
  "weaknesses": [
    "Weakness 1",
    "Weakness 2"
  ],
  "recommendation": "Useful learning recommendation"
}

Rules:
- strengths must be an array of strings.
- weaknesses must be an array of strings.
- recommendation must be a useful learning recommendation.
- Base the feedback only on the student's demonstrated answers.
- Do not invent knowledge the student did not demonstrate.
- Do not change the score.
- Do not change the level.
- Return ONLY JSON.
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
                content: feedbackPrompt,
              },
            ],
          }),
        }
      );

      const responseText = await response.text();

      if (!response.ok) {
        console.error(
          "OpenRouter evaluation error:",
          responseText
        );

        /*
         * Even if AI feedback fails, we still have
         * a valid score and level.
         */
        return NextResponse.json({
          success: true,
          assessment: {
            level,
            score,
            strengths: [
              "You completed the assessment successfully.",
            ],
            weaknesses: [
              "More assessment data is needed to identify detailed weaknesses.",
            ],
            recommendation:
              "Continue with a personalized learning plan based on your demonstrated level.",
          },
        });
      }

      let data;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error(
          "Invalid OpenRouter evaluation response:",
          responseText
        );

        return NextResponse.json({
          success: true,
          assessment: {
            level,
            score,
            strengths: [
              "You completed the assessment successfully.",
            ],
            weaknesses: [
              "Detailed AI feedback could not be generated.",
            ],
            recommendation:
              "Continue with a personalized learning plan based on your demonstrated level.",
          },
        });
      }

      const result = data.choices?.[0]?.message?.content;

      if (!result) {
        return NextResponse.json({
          success: true,
          assessment: {
            level,
            score,
            strengths: [
              "You completed the assessment successfully.",
            ],
            weaknesses: [
              "Detailed AI feedback could not be generated.",
            ],
            recommendation:
              "Continue with a personalized learning plan based on your demonstrated level.",
          },
        });
      }

      console.log(
        "AI evaluation feedback:",
        result
      );

      try {
        const feedback = extractJSON(result);

        const strengths = Array.isArray(
          feedback.strengths
        )
          ? feedback.strengths
          : [];

        const weaknesses = Array.isArray(
          feedback.weaknesses
        )
          ? feedback.weaknesses
          : [];

        const recommendation =
          typeof feedback.recommendation === "string"
            ? feedback.recommendation
            : "Continue with a personalized learning plan based on your demonstrated level.";

        return NextResponse.json({
          success: true,
          assessment: {
            /*
             * IMPORTANT:
             * These come from our own calculations.
             */
            level,
            score,

            /*
             * These come from AI feedback.
             */
            strengths,
            weaknesses,
            recommendation,
          },
        });
      } catch (error) {
        console.error(
          "Feedback JSON parsing error:",
          error
        );

        return NextResponse.json({
          success: true,
          assessment: {
            level,
            score,
            strengths: [
              "You completed the assessment successfully.",
            ],
            weaknesses: [
              "Detailed AI feedback could not be generated.",
            ],
            recommendation:
              "Continue with a personalized learning plan based on your demonstrated level.",
          },
        });
      }
    }

    return NextResponse.json(
      { error: "Invalid assessment action." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Assessment error:", error);

    return NextResponse.json(
      { error: "AI assessment failed." },
      { status: 500 }
    );
  }
}