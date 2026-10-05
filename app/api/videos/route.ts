import { NextResponse } from "next/server";

type VideoResult = {
  videoId: string;
  title: string;
  thumbnail: string;
  channel: string;
};

function cleanText(text: string) {
  return text
    .replace(/\\u0026/g, "&")
    .replace(/\\"/g, '"')
    .replace(/\\u003d/g, "=")
    .replace(/\\u0027/g, "'")
    .trim();
}

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const goal =
      searchParams.get("goal") || "";

    const topic =
      searchParams.get("topic") || "";

    if (!goal && !topic) {
      return NextResponse.json({
        success: true,
        videos: [],
      });
    }

    const query =
      `${goal} ${topic}`.trim();

    const youtubeUrl =
      `https://www.youtube.com/results?search_query=${encodeURIComponent(
        query
      )}`;

    const response = await fetch(
      youtubeUrl,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36",
          Accept:
            "text/html,application/xhtml+xml",
          "Accept-Language":
            "en-US,en;q=0.9",
        },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      return NextResponse.json({
        success: true,
        videos: [],
      });
    }

    const html =
      await response.text();

    const videos: VideoResult[] = [];

    const videoRegex =
      /"videoRenderer":\{"videoId":"([^"]+)"([\s\S]{0,8000}?)\},"shortsLockupViewModel"/g;

    let match;

    while (
      (match =
        videoRegex.exec(html)) !== null &&
      videos.length < 8
    ) {
      const videoId =
        match[1];

      const block =
        match[2];

      let title = "";

      const titleMatch =
        block.match(
          /"title":\{"runs":\[\{"text":"([^"]+)"/
        );

      if (titleMatch) {
        title = cleanText(
          titleMatch[1]
        );
      }

      if (!title) {
        const simpleTitleMatch =
          block.match(
            /"title":\{"simpleText":"([^"]+)"/
          );

        if (simpleTitleMatch) {
          title = cleanText(
            simpleTitleMatch[1]
          );
        }
      }

      if (!title) {
        title = "YouTube video";
      }

      if (
        !videos.some(
          (video) =>
            video.videoId ===
            videoId
        )
      ) {
        videos.push({
          videoId,
          title,
          thumbnail:
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          channel:
            "YouTube",
        });
      }
    }

    return NextResponse.json({
      success: true,
      query,
      searchUrl: youtubeUrl,
      videos,
    });
  } catch (error) {
    console.error(
      "Video search error:",
      error
    );

    return NextResponse.json({
      success: true,
      videos: [],
    });
  }
}