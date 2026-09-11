import {
  searchAnime,
  getTrending,
  getAiring,
  getPopular,
  getAnimeById,
  getEpisodes,
} from './anilist.js';
import {
  searchStreaming,
  getStreamingEpisodes,
  getStreamingSources,
} from './streaming.js';
import { cachedJson } from './cache.js';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const params = url.searchParams;

    // Handle preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: CORS });
    }

    try {
      // ── / ── Home / docs
      if (path === '/') {
        return json({
          name: 'Anime API',
          version: '1.0.0',
          endpoints: {
            trending: '/trending?page=1&perPage=20',
            airing: '/airing?page=1&perPage=20',
            popular: '/popular?page=1&perPage=20',
            search: '/search?q=naruto&page=1',
            anime: '/anime/:id',
            episodes: '/episodes/:id',
            streamSearch: '/stream/search?title=naruto',
            streamEpisodes: '/stream/episodes/:gogoId',
            streamSources: '/stream/sources/:episodeId',
          },
        });
      }

      // ── /trending ──
      if (path === '/trending') {
        const page = parseInt(params.get('page') || '1');
        const perPage = parseInt(params.get('perPage') || '20');
        return cachedJson(env, `trending:${page}:${perPage}`, 300, () =>
          getTrending(page, perPage)
        );
      }

      // ── /airing ── Latest currently airing
      if (path === '/airing') {
        const page = parseInt(params.get('page') || '1');
        const perPage = parseInt(params.get('perPage') || '20');
        return cachedJson(env, `airing:${page}:${perPage}`, 300, () =>
          getAiring(page, perPage)
        );
      }

      // ── /popular ──
      if (path === '/popular') {
        const page = parseInt(params.get('page') || '1');
        const perPage = parseInt(params.get('perPage') || '20');
        return cachedJson(env, `popular:${page}:${perPage}`, 600, () =>
          getPopular(page, perPage)
        );
      }

      // ── /search?q= ──
      if (path === '/search') {
        const q = params.get('q');
        if (!q) return json({ error: 'Missing ?q=' }, 400);
        const page = parseInt(params.get('page') || '1');
        const perPage = parseInt(params.get('perPage') || '20');
        return cachedJson(env, `search:${q}:${page}`, 300, () =>
          searchAnime(q, page, perPage)
        );
      }

      // ── /anime/:id ──
      const animeMatch = path.match(/^\/anime\/(\d+)$/);
      if (animeMatch) {
        const id = parseInt(animeMatch[1]);
        return cachedJson(env, `anime:${id}`, 3600, () => getAnimeById(id));
      }

      // ── /episodes/:id ──
      const epMatch = path.match(/^\/episodes\/(\d+)$/);
      if (epMatch) {
        const id = parseInt(epMatch[1]);
        return cachedJson(env, `episodes:${id}`, 1800, () => getEpisodes(id));
      }

      // ── /stream/search?title= ──
      if (path === '/stream/search') {
        const title = params.get('title');
        if (!title) return json({ error: 'Missing ?title=' }, 400);
        return cachedJson(env, `ssearch:${title}`, 600, () =>
          searchStreaming(title)
        );
      }

      // ── /stream/episodes/:gogoId ──
      const sEpMatch = path.match(/^\/stream\/episodes\/(.+)$/);
      if (sEpMatch) {
        const id = decodeURIComponent(sEpMatch[1]);
        return cachedJson(env, `sep:${id}`, 1800, () =>
          getStreamingEpisodes(id)
        );
      }

      // ── /stream/sources/:episodeId ──
      const sSrcMatch = path.match(/^\/stream\/sources\/(.+)$/);
      if (sSrcMatch) {
        const id = decodeURIComponent(sSrcMatch[1]);
        return cachedJson(env, `ssrc:${id}`, 600, () =>
          getStreamingSources(id)
        );
      }

      return json({ error: 'Not found', path }, 404);
    } catch (err) {
      return json({ error: err.message, stack: err.stack }, 500);
    }
  },
};
