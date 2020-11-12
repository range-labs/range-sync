'use strict';

const manifest = chrome.runtime.getManifest();

// 30 seconds
const sessionCheckInterval = 30 * 1000;
// 30 minutes
const sessionExpiryThreshold = 30 * 60 * 1000;

let _sessionCache = {};
setInterval(refreshSessions, sessionCheckInterval);

async function isAuthenticated() {
  if (Object.keys(_sessionCache).length > 0) return true;
  await refreshSessions();
  return Object.keys(_sessionCache).length > 0;
}

function sessionUserId(s) {
  if (!s || !s.user || !s.user.user_id) {
    return null;
  }

  return s.user.user_id;
}

async function refreshSessions(force) {
  if (force) _sessionCache = {};

  // Check for new Range workspace cookies
  const cookieSlugs = await orgsFromCookies();
  for (const s of cookieSlugs) {
    if (!_sessionCache[s]) _sessionCache[s] = { from_cookie: true };
  }

  for (const slug in _sessionCache) {
    // Check for removed Range workspace cookies
    if (!cookieSlugs.includes(slug)) {
      delete _sessionCache[slug];
      continue;
    }

    const session = _sessionCache[slug];
    // If session newly initialized or close to expiring, refresh session
    if (
      session.from_cookie ||
      moment(session.session_expires_at) - moment() < sessionExpiryThreshold
    ) {
      delete _sessionCache[slug];
      const newSession = await getSession(slug);
      if (newSession) _sessionCache[slug] = newSession;
    }
  }
  return;
}

// Returns session information from cache. If it doesn't exist then reaches out
// to Range for authentication.
function getSession(orgSlug) {
  if (!!_sessionCache[orgSlug]) {
    return _sessionCache[orgSlug];
  }

  return rangeLogin(orgSlug)
    .then((resp) => {
      reportFirstAction(USER_ACTIONS.FIRST_LOGIN, resp);
      return resp;
    })
    .catch(() => console.log(`user is not authenticated with ${orgSlug}`));
}

// Returns a list of authenticated org slugs from Range cookies
function orgsFromCookies() {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({ domain: CONFIG.cookie_host || CONFIG.api_host }, (cookies) => {
      if (cookies === null) reject(chrome.runtime.lastError.message);
      else resolve(cookies.filter((c) => c.name.startsWith('at-')).map((c) => c.name.substr(3)));
    });
  });
}

// Posts a new suggestion to the Range servers on behalf of the user. Based on
// the suggestion object it will be deduped.
function recordInteraction(interaction, params) {
  return post(`/v1/activity`, interaction, params);
}

function recentActivity(params) {
  return get(
    `/v1/activity?collation=ATTACHMENT&attachment_visibility=NEW&include_dismissed=true&include_refs=true&limit=100`,
    params
  );
}

// Posts a new snippet to a Check-in.
function addSnippet(userId, snippet, params) {
  return post(`/v1/users/${userId}/snippets`, snippet, params);
}

function userStats(userId, params) {
  return get(`/v1/users/${userId}/stats`, params);
}

function rangeLogin(orgSlug) {
  return request(`/v1/auth/login/${orgSlug}`);
}

function reportAction(action, params) {
  return post(
    '/v1/actions',
    {
      name: action,
      reportedAt: new Date(),
      sessionId: Date.now() + '.' + hashCode(navigator.userAgent),
    },
    params
  );
}

// Builds a request params object with the appropriate headers to make an
// authenticated request.
function authorize(session) {
  return {
    headers: {
      Authorization: `reflex ${session.access_token}`,
    },
  };
}

function post(path, data, params = {}) {
  return request(path, {
    ...params,
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      ...params.headers,
    },
  });
}

function get(path, params = {}) {
  return request(path, {
    ...params,
    method: 'GET',
    headers: {
      ...params.headers,
    },
  });
}

// Makes a request to the Range API server, handling authentication and common error cases
function request(path, params = {}) {
  let statusCode = 0;
  let statusText = 'OK';
  return fetch(`https://${CONFIG.api_host}${path}`, {
    ...params,
    headers: {
      ...params.headers,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      'X-Range-Client': `ChromeExt/${manifest.version}`,
    },
    redirect: 'error',
  })
    .then((resp) => {
      statusCode = resp.status;
      statusText = resp.statusText;
      return resp.json();
    })
    .catch((e) => {
      console.log(`Network error, status: ${statusCode},  ${statusText} (${String(e)})`);
    })
    .then((resp) => {
      if (statusCode !== 200) {
        if (resp?.code === 16 || resp?.code === 7) {
          if (!path.includes('login')) {
            console.log('no longer authenticated, refreshing sessions...');
            refreshSessions(true);
          }
        }
        throw resp;
      }
      return resp;
    });
}

// Implementation of Java's String.hashCode. Not secure.
function hashCode(str) {
  let hash = 0;
  if (!str || str.length === 0) return hash;
  for (let i = 0; i < str.length; i++) {
    let char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return hash;
}
