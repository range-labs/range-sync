'use strict';

const DEFAULT_TYPE = 'LINK';
const DEFAULT_SUBTYPE = 'NONE';

// Initialize the sessions
refreshAllSessions();

// If cookies change, refresh sessions
chrome.cookies.onChanged.addListener(refreshAllSessions);

chrome.tabs.onUpdated.addListener((_tabId, _info, tab) => {
  // no-op unless done loading
  if (!tab.status || !tab.status.localeCompare('complete') == 0) return;

  // no-op if title is in the global block list
  for (const reTitle of BLOCK_LIST.title) {
    if (reTitle.test(tab.title)) return;
  }

  // no-op unless we have enough info to make an attachment
  if (!tab.url || !tab.title) return;

  // no-op if the title has not actually loaded yet
  if (tab.url.localeCompare(tab.title) == 0) return;

  attemptRecordInteraction(tab, false);
});

chrome.runtime.onMessage.addListener((request, _sender, _response) => {
  switch (request.action) {
    case 'INTERACTION':
      attemptRecordInteraction(request.tab, true);
      break;
  }
});

function attemptRecordInteraction(tab, force) {
  if (!tab || !tab.id) return;

  for (const s of currentSessions()) {
    const a = attachment(s, tab, force);
    if (!a) return Promise.resolve();

    recordInteraction(
      {
        interaction_type: (_) => 'VIEWED',
        idempotency_key: `${tab.id}::${tab.title}`,
        attachment: a,
      },
      authorize(s)
    ).catch(console.error);
  }
}

function attachment(session, tab, force) {
  const url = new URL(tab.url);

  // To avoid spam, do not automatically track domains without paths
  if (url.pathname.length <= 1) return null;

  const provider = providerInfo(url, tab.title, force);
  if (!provider) return null;

  return {
    ...provider,
    html_url: url.href,
    org_id: session.org.org_id,
  };
}

function providerInfo(url, title, force) {
  // For consistency, remove trailing forward slashes
  const base = url.hostname + url.pathname.replace(/\/+$/, '');
  // Loop through the known providers and check if the current URL matches one
  for (const filter of FILTERS) {
    let sourceId = '';
    for (const reUrl of filter.url_regex) {
      if (!reUrl.test(base)) continue;
      if (blocked(filter.block_list, url, title)) return null;

      for (const processor of filter.processors) {
        sourceId = processor.source_id_processor(url);
        if (!!sourceId) {
          return {
            name: processor.title_processor(title),
            provider: filter.provider,
            provider_name: filter.provider_name(url),
            source_id: sourceId,
            type: !!filter.type ? filter.type(url) : DEFAULT_TYPE,
            subtype: !!filter.subtype ? filter.subtype(url) : DEFAULT_SUBTYPE,
          };
        }
      }

      // No processor found for a recognized domain; return to avoid spam
      if (!force) return null;

      return {
        name: title,
        provider: filter.provider,
        provider_name: filter.provider_name(url),
        // suffixing 'chromeext_' will make it easier to find out what pages to
        // add next
        source_id: `chromeext_${base}`,
        type: DEFAULT_TYPE,
        subtype: DEFAULT_SUBTYPE,
      };
    }
  }

  // No processor found for any domain; return null to avoid spam
  if (!force) return null;

  // If there's no known provider, generate one based on the URL
  const hostParts = url.hostname.split('.');
  return {
    name: title,
    // i.e. 'subdomain.nytimes.com' -> 'chromeext_nytimes'
    provider: `chromeext_${hostParts[hostParts.length - 2]}`,
    // i.e. 'subdomain.nytimes.com' -> 'nytimes.com (via Range Sync)'
    provider_name: `${hostParts[hostParts.length - 2]}.${
      hostParts[hostParts.length - 1]
    } (via Range Sync)`,
    // suffixing 'chromeext_' will make it easier to find out what providers to
    // add next
    source_id: `chromeext_${base}`,
    type: DEFAULT_TYPE,
    subtype: DEFAULT_SUBTYPE,
  };
}

function blocked(blockList, url, title) {
  if (!blockList) return false;

  if (!!blockList.title) {
    for (const s of blockList.title) {
      if (s.test(title)) return true;
    }
  }

  if (!!blockList.url) {
    for (const r of blockList.url) {
      if (r.test(url.href)) return true;
    }
  }
}
