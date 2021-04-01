'use strict';

/*
 * Where the chrome.storage code is encapsulated.
 *
 * There are still chunks of "legacy" chrome.storage code, but this where all
 * future access should be encapsulated.
 *
 * At the moment errors are reported and then ignored. It is assumed that these
 * methods will always return a string or object, even if they are empty.
 */

function getSessionCache() {
  return _storageGetObject('session_cache');
}

function setSessionCache(sessionCache) {
  return _storageSet('session_cache', sessionCache);
}

function getInvalidCookieCache() {
  return _storageGetObject('invalid_cookie_cache');
}

function setInvalidCookieCache(invalidCookieCache) {
  return _storageSet('invalid_cookie_cache', invalidCookieCache);
}

function getActiveOrg() {
  return _storageGetString('active_org');
}

function setActiveOrg(activeOrg) {
  return _storageSet('active_org', activeOrg);
}

function setAuthState(authState) {
  return _storageSet('auth_state', authState);
}

// Ensures that an empty string is returned if the value didn't exist
async function _storageGetString(key) {
  const str = await _storageGet(key);
  return str || '';
}

// Ensures that an empty object is returned if the value didn't exist
async function _storageGetObject(key) {
  const obj = await _storageGet(key);
  return obj || {};
}

// Promisify chrome.local.storage.get and add error reporting
function _storageGet(key) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (r) => {
      if (chrome.runtime.lastError) {
        console.error(`error in chrome.storage.local.get: ${chrome.runtime.lastError.message}`);
        console.error(key);
      }
      resolve(r[key]);
    });
  });
}

// Promisify chrome.local.storage.set and add error reporting
function _storageSet(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) {
        console.error(`error in chrome.storage.local.set: ${chrome.runtime.lastError.message}`);
        console.error(key);
        console.error(value);
      }
      resolve();
    });
  });
}
