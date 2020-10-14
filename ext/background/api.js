'use strict';

const manifest = chrome.runtime.getManifest();

let _sessionCache = {};

function isAuthenticated() {
  return Object.keys(_sessionCache).length > 0;
}

function sessionUserId(s) {
  if (!s || !s.user || !s.user.user_id) {
    return null;
  }

  return s.user.user_id;
}

// Returns session information from cache. If it doesn't exist then reaches out
// to Range for authentication.
function getSession(orgSlug) {
  if (!!_sessionCache[orgSlug]) {
    return _sessionCache[orgSlug];
  }

  return rangeLogin(orgSlug).then((resp) => {
    _sessionCache[orgSlug] = resp;
    return resp;
  });
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
      console.warn(`Network error, status: ${statusCode},  ${statusText} (${String(e)})`);
    })
    .then((resp) => {
      if (statusCode !== 200) {
        if (resp.code === 16 || resp.code === 7) {
          console.warn('no longer authenticated, clearing sessions...');
          _sessionCache = {};
        }
        throw resp;
      }
      return resp;
    });
}
