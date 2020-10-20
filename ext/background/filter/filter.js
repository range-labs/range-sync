'use strict';

const DEFAULT_PROVIDERS = ['confluence', 'drive', 'dropbox_paper', 'stackoverflow'];

const GUID_REGEX =
  '({){0,1}[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(}){0,1}';

const BLOCK_LIST = { title: [/^chrome:\/\//, /^Range/] };

// We store the cache here rather than using chrome.storage because we cannot
// save objects with their methods in chrome.storage.
const _filters = [];

// This isn't super elegant yet. It is reset every time the extension is
// reinstalled. This will be integrated with Chrome history in the future.
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.set({ active_providers: DEFAULT_PROVIDERS });
});

function enabledFilters(userRequested) {
  // This is only used when a user is recording something on purpose
  if (userRequested) return Promise.resolve(_filters);

  return new Promise((resolve) => {
    chrome.storage.local.get(['active_providers'], (resp) => {
      if (!resp || !resp.active_providers) resolve([]);

      const activeFilters = [];
      for (const f of _filters) {
        if (resp.active_providers.includes(f.provider)) activeFilters.push(f);
      }

      resolve(activeFilters);
    });
  });
}

function registerFilter(filter) {
  _filters.push(filter);
  const toStore = {};
  for (const f of _filters) {
    toStore[f.provider] = staticFilter(f);
  }
  chrome.storage.local.set({ filters: toStore });
}


// We cannot store objects with their methods to chrome.storage. If we need
// access to that field when reading the filter from chrome.storage, we need to
// convert the methods to a value.
function staticFilter(filter) {
  return {
    ...filter,
    provider_name: filter.provider_name(),
  };
}

function reMatch(str, re, index) {
  const match = str.match(re);
  return match ? match[index] : null;
}

function trimLastPart(str, match) {
  const parts = str.split(match);
  if (parts.length > 1) parts.pop();
  return parts.join(match);
}
