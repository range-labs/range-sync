'use strict';

const DEFAULT_TYPE = 'LINK';
const DEFAULT_SUBTYPE = 'NONE';

const SNIPPET_TYPES = {
  PAST: 1,
  FUTURE: 2,
  BACKLOG: 4,
};

// These are also used in popup.js. Be sure to update there as well!
const MESSAGE_TYPES = {
  IS_AUTHENTICATED: 'IS_AUTHENTICATED',
  INTERACTION: 'INTERACTION',
  ADD_SNIPPET: 'ADD_SNIPPET',
  USER_STATS: 'USER_STATS',
};

// Initialize the sessions
orgsFromCookies()
  .then((orgs) => Promise.all(orgs.map(getSession)))
  .catch(console.log);

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

  orgsFromCookies()
    .then((orgs) => Promise.all(orgs.map(getSession)))
    .then((sessions) => {
      for (const s of sessions) {
        attemptRecordInteraction(tab, s, false).catch(console.log);
      }
    })
    .catch(console.log);
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const handleErr = (err) => {
    console.log(err);
    sendResponse(false);
  };

  // Just check the cache. This is needed for rendering the popup so we want a
  // quick response.
  if (request.action === MESSAGE_TYPES.IS_AUTHENTICATED) {
    sendResponse(isAuthenticated());
    return;
  }

  orgsFromCookies()
    .then((orgs) => Promise.all(orgs.map(getSession)))
    .then((sessions) =>
      sessions.forEach((s) => {
        switch (request.action) {
          case MESSAGE_TYPES.INTERACTION:
            attemptRecordInteraction(request.tab, s, true).then(sendResponse).catch(handleErr);
            break;
          case MESSAGE_TYPES.ADD_SNIPPET:
            // Since recording and interaction is idempotent we do it first to
            // ensure that the attachment exists.
            attemptRecordInteraction(request.tab, s, true)
              .then((r) =>
                attemptAddSnippet(
                  s,
                  SNIPPET_TYPES[request.snippet_type],
                  request.text,
                  r.attachment_id
                )
              )
              .then(sendResponse)
              .catch(handleErr);
            break;
          case MESSAGE_TYPES.USER_STATS:
            const userId = sessionUserId(s);
            userStats(userId, authorize(s))
              .then((r) => {
                r.user_id = userId;
                sendResponse(r);
              })
              .catch(handleErr);
            break;
        }
      })
    )
    .catch(console.log);

  return true;
});

function attemptRecordInteraction(tab, session, force) {
  if (!tab || !tab.id) {
    console.log('invalid tab sent to record interaction');
    console.log(tab);
    return Promise.reject('invalid tab sent to record interaction');
  }

  const a = attachment(session, tab, force);
  if (!a) {
    if (force) {
      console.log(session);
      console.log(tab);
      return Promise.reject('could not create attachment for interaction');
    }
    return Promise.resolve();
  }

  return recordInteraction(
    {
      interaction_type: (_) => 'VIEWED',
      idempotency_key: `${moment().startOf('day')}::${tab.title}`,
      attachment: a,
    },
    authorize(session)
  );
}

function attemptAddSnippet(session, snippetType, text, attachmentId) {
  const userId = sessionUserId(session);
  return addSnippet(
    userId,
    {
      user_id: userId,
      snippet_type: snippetType,
      content: text,
      attachment_id: attachmentId,
      dedupe_strategy: 4,
    },
    authorize(session)
  );
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
    provider: `chromeext_${hostParts[hostParts.length - 2].replace(/[\W-]/, '')}`,
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
