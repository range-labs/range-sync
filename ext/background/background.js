'use strict';

const DEFAULT_TYPE = 'LINK';
const DEFAULT_SUBTYPE = 'NONE';

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

  // Responses that don't need to use the session
  switch (request.action) {
    case MESSAGE_TYPES.IS_AUTHENTICATED:
      sendResponse(isAuthenticated());
      return;
    case MESSAGE_TYPES.INTEGRATION_STATUS:
      tabHasFilter(request.tab).then(sendResponse).catch(handleErr);
      return true;
  }

  // Responses that require sessions
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

async function attemptRecordInteraction(tab, session, force) {
  if (!tab || !tab.id) {
    console.log('invalid tab sent to record interaction');
    console.log(tab);
    return Promise.reject('invalid tab sent to record interaction');
  }

  const a = await attachment(session, tab, force);
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

async function attachment(session, tab, force) {
  const url = new URL(tab.url);

  // To avoid spam, do not automatically track domains without paths
  if (url.pathname.length <= 1 && !force) return null;

  const provider = await providerInfo(url, tab.title, force);
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
  return enabledFilters(force).then((filters) => {
    for (const filter of filters) {
      let sourceId = '';
      for (const reUrl of filter.url_regex) {
        if (!reUrl.test(base)) continue;
        if (blocked(filter.block_list, url, title) && !force) return null;

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
          // prefixing 'chromeext_' will make it easier to find out what pages
          // to add next
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
    const tld = hostParts[hostParts.length - 1];
    const domain = hostParts[hostParts.length - 2];
    return {
      name: title,
      // i.e. 'subdomain.nytimes.com' -> 'chromeext_nytimes'
      provider: `chromeext_${domain.replace(/[\W-]/, '')}`,
      // i.e. 'subdomain.nytimes.com' -> 'nytimes.com (via Range Sync)'
      provider_name: `${domain}.${tld} (via Range Sync)`,
      // prefixing 'chromeext_' will make it easier to find out what providers
      // to add next
      source_id: `chromeext_${base}`,
      type: DEFAULT_TYPE,
      subtype: DEFAULT_SUBTYPE,
    };
  });
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
