import { NextResponse } from "next/server";

function extractJSON(text: string) {
  let cleaned = text.trim();

  cleaned = cleaned
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const firstObject = cleaned.indexOf("{");
  const lastObject = cleaned.lastIndexOf("}");

  if (firstObject === -1 || lastObject === -1) {
    throw new Error("AI did not return valid JSON.");
  }

  cleaned = cleaned.slice(firstObject, lastObject + 1);

  return JSON.parse(cleaned);
}

function calculateWeeks(
  deadline: string,
  goal: string
) {
  if (deadline) {
    const today = new Date();
    const target = new Date(`${deadline}T23:59:59`);

    const difference =
      target.getTime() - today.getTime();

    const days = Math.max(
      1,
      Math.ceil(
        difference / (1000 * 60 * 60 * 24)
      )
    );

    return Math.max(
      1,
      Math.ceil(days / 7)
    );
  }

  const monthMatch = goal.match(
    /(\d+(?:\.\d+)?)\s*(month|months)/i
  );

  if (monthMatch) {
    const months = Number(
      monthMatch[1]
    );

    return Math.max(
      1,
      Math.round(months * 4.345)
    );
  }

  const weekMatch = goal.match(
    /(\d+(?:\.\d+)?)\s*(week|weeks)/i
  );

  if (weekMatch) {
    return Math.max(
      1,
      Math.round(Number(weekMatch[1]))
    );
  }

  return 12;
}

function calculateHoursPerDay(
  hours: string | number | undefined
) {
  const value = Number(hours);

  if (!Number.isFinite(value) || value <= 0) {
    return 1;
  }

  return value;
}

export async function POST(
  request: Request
) {
  try {
    const body = await request.json();

    const {
      goal,
      preferences,
      assessment,
    } = body;

    if (
      !goal ||
      typeof goal !== "string"
    ) {
      return NextResponse.json(
        {
          error:
            "Learning goal is required.",
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

    const level =
      assessment?.level ||
      preferences?.level ||
      "Beginner";

    const targetLevel =
      preferences?.targetLevel ||
      "Job Ready";

    const hoursPerDay =
      calculateHoursPerDay(
        preferences?.hours
      );

    const deadline =
      preferences?.deadline || "";

    const weeks =
      calculateWeeks(
        deadline,
        goal
      );

    const totalHours = Math.round(
      hoursPerDay * 7 * weeks
    );

    const prompt = `
You are StudyMate.AI, an adaptive learning-plan generator.

Your job is to create a personalized learning plan for the student's EXACT learning goal.

========================
EXACT LEARNING GOAL
========================

${goal}

========================
STUDENT INFORMATION
========================

Current level:
${level}

Target level:
${targetLevel}

Study hours per day:
${hoursPerDay}

Deadline:
${deadline || "No specific deadline"}

Planned duration:
${weeks} weeks

Total available study hours:
${totalHours}

========================
CRITICAL SUBJECT RULE
========================

The student's exact learning goal is the ONLY source of truth for the subject.

The learning plan MUST teach the subject requested by the student.

DO NOT assume English.

DO NOT automatically teach grammar.

DO NOT introduce unrelated subjects.

DO NOT use topics from previous students.

DO NOT use topics from previous plans.

DO NOT change the student's subject.

Examples:

If the goal is biology:
- biology topics
- human body
- cells
- organs
- genetics
- etc.

If the goal is JavaScript:
- variables
- functions
- arrays
- objects
- DOM
- asynchronous JavaScript
- etc.

If the goal is mathematics:
- mathematical topics appropriate to the goal

If the goal is history:
- history topics appropriate to the goal

If the goal is English:
- English topics appropriate to the goal

The examples above are only examples.

ALWAYS follow the actual goal:

${goal}

========================
PLAN REQUIREMENTS
========================

Create a complete learning roadmap.

The roadmap should progress from the student's current level toward the target level.

Create approximately one topic per lesson.

Every lesson must directly contribute to the student's exact goal.

The plan must be realistic for:

${hoursPerDay} hours per day
${weeks} weeks
approximately ${totalHours} total hours

Return ONLY valid JSON.

Use exactly this structure:

{
  "title": "Personalized Learning Plan",
  "subject": "The subject derived from the exact learning goal",
  "estimatedWeeks": ${weeks},
  "dailyHours": ${hoursPerDay},
  "weeklyHours": ${hoursPerDay * 7},
  "totalHours": ${totalHours},
  "modules": [
    {
      "title": "Module title",
      "description": "Module description",
      "topics": [
        {
          "title": "Lesson topic",
          "description": "What the student will learn"
        }
      ]
    }
  ]
}

Rules:

- Return valid JSON only.
- Do not include markdown.
- Do not include code fences.
- Do not include commentary.
- Do not include unrelated subjects.
- Every topic must be relevant to the exact learning goal.
- Create at least 3 modules.
- Create at least 6 total topics.
- Progress from easier concepts to harder concepts.
- Do not mention English unless English is actually part of the student's goal.
- Do not mention biology unless biology is actually part of the student's goal.
- Do not mention programming unless programming is actually part of the student's goal.
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
      console.error(
        "OpenRouter plan error:",
        responseText
      );

      return NextResponse.json(
        {
          error:
            "OpenRouter request failed.",
          details: responseText,
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

    const plan =
      extractJSON(content);

    if (
      !plan.modules ||
      !Array.isArray(
        plan.modules
      )
    ) {
      throw new Error(
        "AI did not return valid modules."
      );
    }

    if (
      plan.modules.length < 3
    ) {
      throw new Error(
        "AI did not return enough modules."
      );
    }

    const modules =
      plan.modules.map(
        (module: any) => ({
          title:
            typeof module.title ===
            "string"
              ? module.title
              : "Learning Module",

          description:
            typeof module.description ===
            "string"
              ? module.description
              : "",

          topics:
            Array.isArray(
              module.topics
            )
              ? module.topics
                  .filter(
                    (topic: any) =>
                      topic &&
                      typeof topic.title ===
                        "string"
                  )
                  .map(
                    (topic: any) => ({
                      title:
                        topic.title,
                      description:
                        typeof topic.description ===
                        "string"
                          ? topic.description
                          : "",
                    })
                  )
              : [],
        })
      );

    return NextResponse.json({
      success: true,

      plan: {
        title:
          typeof plan.title ===
          "string"
            ? plan.title
            : "Personalized Learning Plan",

        subject:
          typeof plan.subject ===
          "string"
            ? plan.subject
            : goal,

        estimatedWeeks:
          weeks,

        dailyHours:
          hoursPerDay,

        weeklyHours:
          hoursPerDay * 7,

        totalHours,

        modules,
      },
    });
  } catch (error) {
    console.error(
      "Learning plan error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to generate learning plan.",
      },
      { status: 500 }
    );
  }
}