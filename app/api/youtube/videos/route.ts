import { NextResponse } from "next/server";

export const runtime = "nodejs";

type VideoItem = {
  id: { videoId: string };
  snippet: {
    title: string;
    thumbnails: {
      high: { url: string };
      medium: { url: string };
    };
  };
};

function decodeXml(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function getTagValue(block: string, tagName: string) {
  const match = block.match(new RegExp(`<${tagName}>([\\s\\S]*?)<\\/${tagName}>`, "i"));
  return match?.[1] ? decodeXml(match[1]) : "";
}

function getThumbnailUrl(block: string) {
  const match = block.match(/<media:thumbnail[^>]*url=["']([^"']+)["']/i);
  return match?.[1] ?? "";
}

export async function GET() {
  try {
    const channelId = process.env.HULK_YOUTUBE_CHANNEL_ID ?? "UCZRZtepB5V06Ya5VAC66XpA";
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;

    const response = await fetch(feedUrl, {
      cache: "no-store",
      headers: {
        "User-Agent": "weekly-songs-app/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`YouTube feed request failed with status ${response.status}`);
    }

    const xml = await response.text();
    const entryMatches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];

    const items: VideoItem[] = entryMatches
      .map((entryMatch) => {
        const entry = entryMatch[1];
        const videoId = getTagValue(entry, "yt:videoId");
        const title = getTagValue(entry, "title");
        const thumbnailUrl = getThumbnailUrl(entry);

        if (!videoId || !title || !thumbnailUrl) {
          return null;
        }

        return {
          id: { videoId },
          snippet: {
            title,
            thumbnails: {
              high: { url: thumbnailUrl },
              medium: { url: thumbnailUrl },
            },
          },
        } satisfies VideoItem;
      })
      .filter((item): item is VideoItem => item !== null);

    return NextResponse.json({
      items,
      nextPageToken: null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
