import { CacheManager } from "hcacher";
import { HyperClient } from "hyperttp";

import {
  normalizeAppleMusicAlbumUrl,
  normalizeAppleMusicPlaylistUrl,
  normalizeAppleMusicTrackUrl,
  parseAppleMusicAlbumHtml,
  parseAppleMusicPlaylistHtml,
  parseAppleMusicSearchHtml,
  parseAppleMusicTrackHtml,
} from "../core/index.js";
import type {
  AppleMusicAlbum,
  AppleMusicPlaylist,
  AppleMusicSearchOptions,
  AppleMusicSearchResults,
  AppleMusicTrack,
  ImportAppleMusicPlaylistOptions,
} from "../types/index.js";

/**
 * Client for importing public Apple Music playlists without a developer token.
 * It uses Apple's server-rendered HTML, not the official Apple Music API.
 */
export class APMApi {
  private readonly http: HyperClient;
  private readonly playlistCache = new CacheManager<AppleMusicPlaylist>({
    maxSize: 100,
    ttl: 60_000,
  });
  private readonly inflight = new Map<string, Promise<AppleMusicPlaylist>>();
  private readonly albumCache = new CacheManager<AppleMusicAlbum>({
    maxSize: 100,
    ttl: 60_000,
  });
  private readonly albumInflight = new Map<string, Promise<AppleMusicAlbum>>();
  private readonly trackCache = new CacheManager<AppleMusicTrack>({
    maxSize: 200,
    ttl: 60_000,
  });
  private readonly trackInflight = new Map<string, Promise<AppleMusicTrack>>();
  private readonly searchCache = new CacheManager<AppleMusicSearchResults>({
    maxSize: 200,
    ttl: 60_000,
  });
  private readonly searchInflight = new Map<string, Promise<AppleMusicSearchResults>>();

  constructor(httpClient?: HyperClient) {
    this.http = httpClient ?? new HyperClient();
  }

  /**
   * Fetches and parses a public playlist. Requests without an AbortSignal share
   * in-flight work and use a short-lived cache.
   */
  async getPlaylist(
    playlistUrl: string,
    options: Omit<ImportAppleMusicPlaylistOptions, "client"> = {},
  ): Promise<AppleMusicPlaylist> {
    const sourceUrl = normalizeAppleMusicPlaylistUrl(playlistUrl);

    if (options.signal !== undefined) {
      return this.requestPlaylist(sourceUrl, options.signal);
    }

    return this.dedupe(sourceUrl, async () => {
      const cached = this.playlistCache.get(sourceUrl);
      if (cached !== undefined) {
        return cached;
      }

      const playlist = await this.requestPlaylist(sourceUrl);
      this.playlistCache.set(sourceUrl, playlist);
      return playlist;
    });
  }

  /** Fetches and parses a public Apple Music album. */
  async getAlbum(
    albumUrl: string,
    options: Omit<ImportAppleMusicPlaylistOptions, "client"> = {},
  ): Promise<AppleMusicAlbum> {
    const sourceUrl = normalizeAppleMusicAlbumUrl(albumUrl);

    if (options.signal !== undefined) {
      return this.requestAlbum(sourceUrl, options.signal);
    }

    return this.dedupeAlbum(sourceUrl, async () => {
      const cached = this.albumCache.get(sourceUrl);
      if (cached !== undefined) {
        return cached;
      }

      const album = await this.requestAlbum(sourceUrl);
      this.albumCache.set(sourceUrl, album);
      return album;
    });
  }

  /** Fetches and parses a public Apple Music track. */
  async getTrack(
    trackUrl: string,
    options: Omit<ImportAppleMusicPlaylistOptions, "client"> = {},
  ): Promise<AppleMusicTrack> {
    const sourceUrl = normalizeAppleMusicTrackUrl(trackUrl);

    if (options.signal !== undefined) {
      return this.requestTrack(sourceUrl, options.signal);
    }

    return this.dedupeTrack(sourceUrl, async () => {
      const cached = this.trackCache.get(sourceUrl);
      if (cached !== undefined) {
        return cached;
      }

      const track = await this.requestTrack(sourceUrl);
      this.trackCache.set(sourceUrl, track);
      return track;
    });
  }

  /** Searches the selected Apple Music storefront for tracks and artists. */
  async search(query: string, options: AppleMusicSearchOptions = {}): Promise<AppleMusicSearchResults> {
    const normalizedQuery = query.trim();
    if (normalizedQuery === "") {
      throw new TypeError("Apple Music search query must not be empty.");
    }

    const storefront = normalizeStorefront(options.storefront);
    const limit = normalizeSearchLimit(options.limit);
    const sourceUrl = `https://music.apple.com/${storefront}/search?term=${encodeURIComponent(normalizedQuery)}`;
    const cacheKey = `${storefront}:${normalizedQuery}:${limit}`;

    if (options.signal !== undefined) {
      return this.requestSearch(sourceUrl, normalizedQuery, storefront, limit, options.signal);
    }

    return this.dedupeSearch(cacheKey, async () => {
      const cached = this.searchCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      const result = await this.requestSearch(sourceUrl, normalizedQuery, storefront, limit);
      this.searchCache.set(cacheKey, result);
      return result;
    });
  }

  private async requestPlaylist(sourceUrl: string, signal?: AbortSignal): Promise<AppleMusicPlaylist> {
    const html = await this.http.get<string>(sourceUrl, "text", signal);
    return parseAppleMusicPlaylistHtml(html, sourceUrl);
  }

  private async requestAlbum(sourceUrl: string, signal?: AbortSignal): Promise<AppleMusicAlbum> {
    const html = await this.http.get<string>(sourceUrl, "text", signal);
    return parseAppleMusicAlbumHtml(html, sourceUrl);
  }

  private async requestTrack(sourceUrl: string, signal?: AbortSignal): Promise<AppleMusicTrack> {
    const html = await this.http.get<string>(sourceUrl, "text", signal);
    return parseAppleMusicTrackHtml(html, sourceUrl);
  }

  private async requestSearch(
    sourceUrl: string,
    query: string,
    storefront: string,
    limit: number,
    signal?: AbortSignal,
  ): Promise<AppleMusicSearchResults> {
    const html = await this.http.get<string>(sourceUrl, "text", signal);
    return parseAppleMusicSearchHtml(html, query, storefront, limit);
  }

  private async dedupe(
    key: string,
    request: () => Promise<AppleMusicPlaylist>,
  ): Promise<AppleMusicPlaylist> {
    const existing = this.inflight.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const promise = (async () => {
      try {
        return await request();
      } finally {
        this.inflight.delete(key);
      }
    })();

    this.inflight.set(key, promise);
    return promise;
  }

  private async dedupeAlbum(
    key: string,
    request: () => Promise<AppleMusicAlbum>,
  ): Promise<AppleMusicAlbum> {
    const existing = this.albumInflight.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const promise = (async () => {
      try {
        return await request();
      } finally {
        this.albumInflight.delete(key);
      }
    })();

    this.albumInflight.set(key, promise);
    return promise;
  }

  private async dedupeTrack(
    key: string,
    request: () => Promise<AppleMusicTrack>,
  ): Promise<AppleMusicTrack> {
    const existing = this.trackInflight.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const promise = (async () => {
      try {
        return await request();
      } finally {
        this.trackInflight.delete(key);
      }
    })();

    this.trackInflight.set(key, promise);
    return promise;
  }

  private async dedupeSearch(
    key: string,
    request: () => Promise<AppleMusicSearchResults>,
  ): Promise<AppleMusicSearchResults> {
    const existing = this.searchInflight.get(key);
    if (existing !== undefined) {
      return existing;
    }

    const promise = (async () => {
      try {
        return await request();
      } finally {
        this.searchInflight.delete(key);
      }
    })();

    this.searchInflight.set(key, promise);
    return promise;
  }
}

function normalizeStorefront(value: string | undefined): string {
  const storefront = (value ?? "ru").trim().toLowerCase();
  if (!/^[a-z]{2}(?:-[a-z]{2})?$/.test(storefront)) {
    throw new TypeError("Apple Music storefront must be a two-letter country code, for example ru or us.");
  }
  return storefront;
}

function normalizeSearchLimit(value: number | undefined): number {
  const limit = value ?? 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 20) {
    throw new RangeError("Apple Music search limit must be an integer from 1 to 20.");
  }
  return limit;
}

/** Backward-compatible functional shortcut for a one-off playlist import. */
export async function importAppleMusicPlaylist(
  playlistUrl: string,
  options: ImportAppleMusicPlaylistOptions = {},
): Promise<AppleMusicPlaylist> {
  return new APMApi(options.client).getPlaylist(playlistUrl, { signal: options.signal });
}

export default APMApi;
