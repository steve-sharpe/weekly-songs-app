import { NextResponse } from "next/server";

export const runtime = "nodejs";

const DEFAULT_MAX_RESULTS = 30;
const DEFAULT_CHANNEL_ID = "UCZRZtepB5V06Ya5VAC66XpA";
const YOUTUBE_REVALIDATE_SECONDS = 1;

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

function toPositiveInt(value: string | null, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

async function fetchByYoutubeDataApi(
  channelId: string,
  maxResults: number,
  pageToken: string,
  apiKey: string,
) {
  const searchParams = new URLSearchParams({
    key: apiKey,
    channelId,
    part: "snippet,id",
    order: "date",
    maxResults: String(maxResults),
    type: "video",
  });

  if (pageToken) {
    searchParams.set("pageToken", pageToken);
  }

  const response = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${searchParams.toString()}`,
    {
      next: { revalidate: YOUTUBE_REVALIDATE_SECONDS },
      headers: {
        "User-Agent": "weekly-songs-app/1.0",
      },
    },
  );

  const data = (await response.json()) as {
    items?: VideoItem[];
    nextPageToken?: string;
    error?: { message?: string };
  };

  if (!response.ok) {
    throw new Error(data?.error?.message || `YouTube API failed with status ${response.status}`);
  }

  return {
    items: Array.isArray(data.items) ? data.items : [],
    nextPageToken: data.nextPageToken ?? null,
  };
}

async function fetchByYoutubeRss(
  channelId: string,
  maxResults: number,
  pageToken: string,
) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`;
  const response = await fetch(feedUrl, {
    next: { revalidate: YOUTUBE_REVALIDATE_SECONDS },
    headers: {
      "User-Agent": "weekly-songs-app/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(`YouTube feed request failed with status ${response.status}`);
  }

  const xml = await response.text();
  const entryMatches = [...xml.matchAll(/<entry>([\s\S]*?)<\/entry>/gi)];

  const allItems: VideoItem[] = entryMatches
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

  const offset = toPositiveInt(pageToken || null, 0);
  const items = allItems.slice(offset, offset + maxResults);
  const nextOffset = offset + items.length;
  const nextPageToken = nextOffset < allItems.length ? String(nextOffset) : null;

  return {
    items,
    nextPageToken,
  };
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const channelId = process.env.HULK_YOUTUBE_CHANNEL_ID ?? DEFAULT_CHANNEL_ID;
    const maxResults = toPositiveInt(url.searchParams.get("maxResults"), DEFAULT_MAX_RESULTS);
    const pageToken = url.searchParams.get("pageToken") ?? "";
    const apiKey = process.env.YOUTUBE_API_KEY ?? process.env.GOOGLE_YOUTUBE_API_KEY ?? "";

    let result: { items: VideoItem[]; nextPageToken: string | null };

    if (apiKey) {
      try {
        result = await fetchByYoutubeDataApi(channelId, maxResults, pageToken, apiKey);
      } catch {
        result = await fetchByYoutubeRss(channelId, maxResults, pageToken);
      }
    } else {
      result = await fetchByYoutubeRss(channelId, maxResults, pageToken);
    }

    return NextResponse.json(
      {
        items: result.items,
        nextPageToken: result.nextPageToken,
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${YOUTUBE_REVALIDATE_SECONDS}, stale-while-revalidate=86400`,
        },
      },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        items: [],
        nextPageToken: null,
        warning: message,
      },
      { status: 200 },
    );
  }
}
