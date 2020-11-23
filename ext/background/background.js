'use strict';

const DEFAULT_TYPE = 'LINK';
const DEFAULT_SUBTYPE = 'NONE';
const ATTACHMENT_ORIGIN = 1;

chrome.tabs.onUpdated.addListener((_tabId, _info, tab) => {
  // no-op unless done loading
  if (!tab.status || !tab.status.localeCompare('complete') == 0) return;

  // no-op unless we have enough info to make an attachment
  if (!tab.url || !tab.title) return;

  // no-op if the title has not actually loaded yet
  if (tab.url.localeCompare(tab.title) == 0) return;

  // no-op if title is in the global block list
  if (blocked(BLOCK_LIST, null, tab.title)) return;

  currentSession()
    .then((s) => {
      attemptRecordInteraction(tab, s, false).then(() => {
        reportFirstAction(USER_ACTIONS.FIRST_INTERACTION, s);
      });
    })
    .catch(console.log);
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const handleErr = (err) => {
    console.log(err);
    sendResponse(false);
  };

  switch (request.action) {
    // Responses that don't need to use the session
    case MESSAGE_TYPES.IS_AUTHENTICATED:
      isAuthenticated().then(sendResponse);
      break;
    case MESSAGE_TYPES.INTEGRATION_STATUS:
      tabHasFilter(request.tab).then(sendResponse).catch(handleErr);
      break;
    case MESSAGE_TYPES.RELEVANT_HISTORY:
      searchRelevantHistory().then(sendResponse).catch(handleErr);
      break;
    // Responses that require the current session
    case MESSAGE_TYPES.INTERACTION:
      currentSession().then((s) => {
        attemptRecordInteraction(request.tab, s, true)
          .then(() => {
            reportFirstAction(USER_ACTIONS.FIRST_INTERACTION, s);
            sendResponse();
          })
          .catch(handleErr);
      });
      break;
    case MESSAGE_TYPES.ADD_SNIPPET:
      // Since recording and interaction is idempotent we do it first to
      // ensure that the attachment exists.
      currentSession().then((s) => {
        attemptRecordInteraction(request.tab, s, true)
          .then((r) => attemptAddSnippet(s, request.snippet_type, request.text, r.attachment_id))
          .then(() => {
            reportFirstAction(USER_ACTIONS.FIRST_SNIPPET, s);
            sendResponse();
          })
          .catch(handleErr);
      });
      break;
    case MESSAGE_TYPES.USER_STATS:
      currentSession().then((s) => {
        const userId = sessionUserId(s);
        userStats(userId, authorize(s))
          .then((r) => {
            r.user_id = userId;
            r.org_slug = s.org.slug;
            sendResponse(r);
          })
          .catch(handleErr);
      });
      break;
    case MESSAGE_TYPES.RECENT_ACTIVITY:
      currentSession().then((s) => {
        recentActivity(authorize(s)).then(sendResponse).catch(handleErr);
      });
      break;
    // Responses that require all sessions
    case MESSAGE_TYPES.SESSIONS:
      orgsFromCookies()
        .then((orgs) => Promise.all(orgs.map(getSession)))
        .then((sessions) => {
          currentSession().then((c) => {
            sessions.forEach((s) => {
              if (s) s.active = s?.org.slug == c.org.slug;
            });
            sendResponse(sessions.filter((s) => s));
          });
        })
        .catch(handleErr);
      break;
    case MESSAGE_TYPES.SET_SESSION:
      orgsFromCookies()
        .then((orgs) => Promise.all(orgs.map(getSession)))
        .then((sessions) => {
          const s = sessions.filter((s) => s && s.org.slug == request.org_slug)[0];
          setActiveOrg(s.org.slug).then(sendResponse);
        })
        .catch(handleErr);
      break;
  }
  return true;
});

function searchRelevantHistory() {
  const relevantHistory = {};
  return new Promise((resolve) => {
    chrome.history.search(
      { text: '', startTime: moment().subtract(90, 'd').unix() * 1000, maxResults: 10000 },
      (history) => {
        Promise.all(
          history.map(async (h) => {
            if (!h.url || !h.title) return;

            try {
              const info = await providerInfo(new URL(h.url), h.title, true);
              if (!info || !info.provider || info.provider.includes('chromeext_')) return;

              if (!relevantHistory[info.provider]) {
                relevantHistory[info.provider] = 1;
              } else {
                relevantHistory[info.provider]++;
              }
            } catch (err) {
              return;
            }
          })
        ).then((h) => {
          resolve(relevantHistory);
        });
      }
    );
  });
}

function setChromeActivity(attachment, tab) {
  chrome.storage.local.get(['recent_activity'], (resp) => {
    const recentActivity =
      resp.recent_activity?.filter((activity) => activity.source_id !== attachment.source_id) || [];
    if (recentActivity.length > 99) recentActivity.pop();
    const activity = { ...attachment, favIconUrl: tab.favIconUrl };

    recentActivity.unshift(activity);
    chrome.storage.local.set({ recent_activity: recentActivity });
  });
}

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
  setChromeActivity(a, tab);
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
    origin: ATTACHMENT_ORIGIN,
  };
}

function providerInfo(url, title, force) {
  // For consistency, remove trailing forward slashes
  const base = url.hostname + url.pathname.replace(/\/+$/, '');
  // Loop through the known providers and check if the current URL matches one
  return enabledFilters(force).then((filters) => {
    for (const filter of filters) {
      if (filter.no_sync && !force) continue;

      let sourceId = '';
      for (const reUrl of filter.url_regex) {
        if (blocked(filter.block_list, url, title) && !force) return null;
        if (!reUrl.test(base)) continue;

        for (const processor of filter.processors) {
          sourceId = processor.source_id_processor(url);
          if (!!sourceId) {
            const info = {
              name: processor.title_processor(title),
              provider: filter.provider,
              provider_name: filter.provider_name(url, title),
              source_id: sourceId,
              type: !!filter.type ? filter.type(url) : DEFAULT_TYPE,
              subtype: !!filter.subtype ? filter.subtype(url, title) : DEFAULT_SUBTYPE,
            };

            if (info.type == 'CODE_CHANGE') {
              Object.assign(info, filter.parent(url));
              Object.assign(info, processor.change_info(url));
            }
            return info;
          }
        }

        // No processor found for a recognized domain; return to avoid spam
        if (!force) return null;

        return {
          name: title,
          provider: filter.provider,
          provider_name: filter.provider_name(url, title),
          // prefixing 'chromeext_' will make it easier to find out what pages
          // to add next
          source_id: `chromeext_${base}`,
          type: DEFAULT_TYPE,
          subtype: DEFAULT_SUBTYPE,
        };
      }
    }

    // No filter found for any domain; return null to avoid spam
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

  if (!!blockList.title && !!title) {
    for (const s of blockList.title) {
      if (s.test(title)) return true;
    }
  }

  if (!!blockList.url && !!url) {
    for (const r of blockList.url) {
      if (r.test(url.href)) return true;
    }
  }

  return false;
}

function currentSession() {
  return new Promise((resolve) => {
    orgsFromCookies()
      .then((orgs) => Promise.all(orgs.map(getSession)))
      .then((sessions) => {
        chrome.storage.local.get(['active_org'], (resp) => {
          const slug = resp.active_org || sessions[0].org.slug;
          const session = sessions.find((s) => s?.org.slug == slug) || sessions[0];
          setActiveOrg(session.org.slug).then(() => {
            resolve(session);
          });
        });
      })
      .catch(console.log);
  });
}

function setActiveOrg(slug) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ active_org: slug }, resolve);
  });
}

// Only reports the first instance of a given action. Used in Intercom for targeting how far
// someone has gotten into extension usage.
function reportFirstAction(action, session) {
  const actionSlug = `${action}.${session.user.user_id}`;
  return new Promise((resolve) => {
    chrome.storage.sync.get(['reported_actions'], (resp) => {
      const reportedActions = resp.reported_actions || {};
      if (reportedActions[actionSlug]) {
        resolve();
        return;
      }

      reportAction(action, authorize(session))
        .then(() => {
          reportedActions[actionSlug] = true;
          chrome.storage.sync.set({ reported_actions: reportedActions }, resolve);
        })
        .catch(console.log);
    });
  });
}
