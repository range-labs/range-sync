const manifest = chrome.runtime.getManifest();
const API_HOST = 'api.range.co';

// TODO: Verify cached sessions are valid, currently we rely on the background
// page not being long lived.

let _sessionCache = {};

// Returns a list of org slugs which the user is logged into.
function orgs() {
  return new Promise((resolve, reject) => {
    chrome.cookies.getAll({ domain: API_HOST }, cookies => {
      if (cookies === null) reject(chrome.runtime.lastError.message);
      else resolve(cookies.map(c => c.name.substr(3)));
    });
  });
}

// Returns session information, includes information about the user, org, and
// a short-lived session token for making API requests.
function getSession(orgSlug, opt_force) {
  if (_sessionCache[orgSlug] && !opt_force) {
    return _sessionCache[orgSlug];
  }
  return request(`/v1/auth/login/${orgSlug}`).then(resp => {
    _sessionCache[orgSlug] = resp;
    return resp;
  });
}

// Posts a new suggestion to the Range servers on behalf of the user. Based on
// the suggestion object it will be deduped.
function addSuggestion(userID, suggestion, params) {
  return post(`/v1/users/${userID}/suggestions`, suggestion, params);
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

function request(path, params = {}) {
  let statusCode = 0;
  let statusText = 'OK';
  return fetch(`https://${API_HOST}${path}`, {
    ...params,
    headers: {
      ...params.headers,
      'X-Requested-With': 'XMLHttpRequest',
      'Content-Type': 'application/json',
      'X-Range-Client': `ChromeExt/${manifest.version}`,
    },
    redirect: 'error',
  })
    .then(resp => {
      statusCode = resp.status;
      statusText = resp.statusText;
      return resp.json();
    })
    .catch(e => {
      throw new Error(`Network error, status: ${statusCode},  ${statusText} (${String(e)})`);
    })
    .then(resp => {
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

function post(path, data, params) {
  return request(path, {
    ...params,
    method: 'POST',
    body: JSON.stringify(data),
    headers: {
      ...params.headers,
    },
  });
}
