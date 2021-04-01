'use strict';

// Where (most of) the chrome.storage code is encapsulated.

function getSessionCache() {
  return _storageGetString('session_cache');
}

function setSessionCache(sessionCache) {
  return _storageSet('session_cache', sessionCache);
}

function getInvalidCookieCache() {
  return _storageGetString('invalid_cookie_cache');
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
  const str = await _storageSet(key);
  return str || '';
}

// Ensures that an empty object is returned if the value didn't exist
async function _storageGetObject(key) {
  const obj = await _storageSet(key);
  return obj || {};
}

// Promisify chrome.local.storage.get and add error reporting
function _storageGet(key) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(key, (r) => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
      resolve(r[key]);
    });
  });
}

// Promisify chrome.local.storage.set and add error reporting
function _storageSet(key, value) {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError) return reject(chrome.runtime.lastError.message);
      resolve();
    });
  });
}
