const JIKAN_BASE = 'https://api.jikan.moe/v4';

const USER_AGENT = 'AnglerAnimeAPI/1.0 (https://skinidi1.anonmus232.workers.dev)';

async function jikanFetch(path, params = {}) {
  const qs = new URLSearchParams(params).toString();
  const url = `${JIKAN_BASE}${path}${qs ? '?' + qs : ''}`;

  const res = await fetch(url, {
    headers: {
      'Accept': 'application/json',
      'User-Agent': USER_AGENT,
    },
  });

  if (!res.ok) {
    const text = await res.text();
    return { error: `Jikan ${res.status}: ${text.slice(0, 200)}` };
  }

  return res.json();
}

// ── Trending / Top Airing ──
export async function getTrending(page = 1, perPage = 20) {
  const data = await jikanFetch('/top/anime', { page, limit: perPage, filter: 'airing' });
  return normalizeList(data);
}

// ── Currently Airing (season now) ──
export async function getAiring(page = 1, perPage = 20) {
  const data = await jikanFetch('/seasons/now', { page, limit: perPage });
  return normalizeList(data);
}

// ── Popular (all time) ──
export async function getPopular(page = 1, perPage = 20) {
  const data = await jikanFetch('/top/anime', { page, limit: perPage });
  return normalizeList(data);
}

// ── Search ──
export async function searchAnime(query, page = 1, perPage = 20) {
  const data = await jikanFetch('/anime', { q: query, page, limit: perPage });
  return normalizeList(data);
}

// ── Anime details ──
export async function getAnimeById(id) {
  const data = await jikanFetch(`/anime/${id}/full`);
  if (data.error) return data;
  return { data: normalizeAnime(data.data) };
}

// ── Episodes ──
export async function getEpisodes(animeId) {
  const data = await jikanFetch(`/anime/${animeId}/episodes`);
  if (data.error) return data;
  return data;
}

// ── Helpers ──
function normalizeList(data) {
  if (data.error) return data;
  const list = (data.data || []).map(normalizeAnime);
  return {
    data: {
      Page: {
        pageInfo: {
          total: data.pagination?.items?.total || list.length,
          currentPage: data.pagination?.current_page || 1,
          lastPage: data.pagination?.last_visible_page || 1,
          hasNextPage: data.pagination?.has_next_page || false,
        },
        media: list,
      },
    },
  };
}

function normalizeAnime(a) {
  return {
    id: a.mal_id,
    title: {
      romaji: a.title,
      english: a.title_english,
      native: a.title_japanese,
    },
    description: a.synopsis,
    coverImage: {
      extraLarge: a.images?.jpg?.large_image_url,
      large: a.images?.jpg?.image_url,
      medium: a.images?.jpg?.small_image_url,
      color: null,
    },
    bannerImage: a.trailer?.images?.maximum_image_url || null,
    genres: (a.genres || []).map((g) => g.name),
    averageScore: a.score ? Math.round(a.score * 10) : null,
    popularity: a.members,
    episodes: a.episodes,
    duration: a.duration,
    status: a.status,
    season: a.season,
    seasonYear: a.year,
    format: a.type,
    studios: a.studios ? { nodes: a.studios.map((s) => ({ name: s.name })) } : null,
    nextAiringEpisode: a.aired?.prop?.from
      ? null
      : null,
  };
}
