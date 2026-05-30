import axios from "axios";

const DEFAULT_RETRY_DELAY_MS = 1200;
const MAX_RETRIES = 2;
const CACHE_TTL_MS = 5 * 1000;
const STALE_FALLBACK_TTL_MS = 60 * 60 * 1000;
const CACHE_PREFIX = "seculearn:api-cache:";

const inFlightRequests = new Map();

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const getStoredToken = () => {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") || "";
};

export const buildApiHeaders = (token, headers = {}) => {
  const resolvedToken = token || getStoredToken();

  return {
    Accept: "application/json",
    "ngrok-skip-browser-warning": "true",
    ...(resolvedToken ? { Authorization: `Bearer ${resolvedToken}` } : {}),
    ...headers,
  };
};

const parseRetryAfter = (value) => {
  if (!value) return null;

  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);

  const dateMs = Date.parse(value);
  if (Number.isNaN(dateMs)) return null;

  return Math.max(0, dateMs - Date.now());
};

const getRetryDelay = (error, retryCount) => {
  const retryAfter = parseRetryAfter(error?.response?.headers?.["retry-after"]);
  if (retryAfter !== null) return retryAfter;

  return DEFAULT_RETRY_DELAY_MS * 2 ** retryCount;
};

const getCacheKey = ({ method, url, params, token }) => {
  const tokenPart = token ? token.slice(-16) : "anon";
  return `${CACHE_PREFIX}${tokenPart}:${method}:${url}:${JSON.stringify(params || {})}`;
};

const readCachedResponse = (cacheKey, maxAgeMs) => {
  if (typeof window === "undefined" || !cacheKey) return null;

  try {
    const raw = sessionStorage.getItem(cacheKey);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    if (!cached?.timestamp || Date.now() - cached.timestamp > maxAgeMs) {
      return null;
    }

    return cached.data;
  } catch {
    return null;
  }
};

const writeCachedResponse = (cacheKey, data) => {
  if (typeof window === "undefined" || !cacheKey) return;

  try {
    sessionStorage.setItem(
      cacheKey,
      JSON.stringify({
        timestamp: Date.now(),
        data,
      })
    );
  } catch {
    // Best-effort cache only.
  }
};

export const apiClient = axios.create();

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status;
    const config = error?.config;

    if ((status === 429 || status === 503) && config) {
      config.__retryCount = config.__retryCount || 0;

      if (config.__retryCount < MAX_RETRIES) {
        const delay = getRetryDelay(error, config.__retryCount);
        config.__retryCount += 1;
        await wait(delay);
        return apiClient(config);
      }
    }

    return Promise.reject(error);
  }
);

export async function apiRequest(url, options = {}) {
  const {
    method = "GET",
    token,
    params,
    data,
    headers,
    cache = true,
  } = options;
  const normalizedMethod = method.toUpperCase();
  const resolvedToken = token || getStoredToken();
  const canCache = cache && normalizedMethod === "GET";
  const cacheKey = canCache
    ? getCacheKey({
        method: normalizedMethod,
        url,
        params,
        token: resolvedToken,
      })
    : "";

  const cached = canCache ? readCachedResponse(cacheKey, CACHE_TTL_MS) : null;
  if (cached) {
    return {
      data: cached,
      status: 200,
      statusText: "OK",
      headers: {},
      config: {},
      fromCache: true,
    };
  }

  if (canCache && inFlightRequests.has(cacheKey)) {
    return inFlightRequests.get(cacheKey);
  }

  const requestPromise = apiClient({
    url,
    method: normalizedMethod,
    params,
    data,
    headers: buildApiHeaders(resolvedToken, headers),
  })
    .then((response) => {
      if (canCache) writeCachedResponse(cacheKey, response.data);
      return response;
    })
    .catch((error) => {
      const stale = canCache
        ? readCachedResponse(cacheKey, STALE_FALLBACK_TTL_MS)
        : null;

      if (stale) {
        return {
          data: stale,
          status: 200,
          statusText: "OK",
          headers: {},
          config: {},
          fromCache: true,
          stale: true,
        };
      }

      throw error;
    })
    .finally(() => {
      if (canCache) inFlightRequests.delete(cacheKey);
    });

  if (canCache) inFlightRequests.set(cacheKey, requestPromise);

  return requestPromise;
}
