'use strict';

const DEFAULT_TYPE = 'LINK';
const DEFAULT_SUBTYPE = 'NONE';
const ATTACHMENT_ORIGIN = 1;
const ATTACHMENT_CORE = ['source_id', 'provider', 'org_id', 'type', 'origin', 'name'];

// These are the onInstalled reasons that will trigger the options page to open
const _openOptionsReasons = ['install', 'update'];

// 1 hour
const dedupeThreshold = 60 * 60 * 1000;
// This is used to reduce the number of requests to Range servers
const _recordInteractionCache = {};

chrome.runtime.onInstalled.addListener(async (d) => {
  chrome.storage.local.get(['active_providers'], (r) => {
    // Carry over active providers from previous install
    const providers = r.active_providers || [];
    chrome.storage.local.set({ active_providers: providers }, () => {
      if (!_openOptionsReasons.includes(d.reason)) return;

      if (d.reason === 'update') {
        // Keeps track of whether the new providers have been seen by the user
        chrome.storage.local.set({ new_providers: NEW_PROVIDERS });
      }

      chrome.runtime.openOptionsPage();
    });
  });
});

chrome.tabs.onUpdated.addListener(async (_tabId, _info, tab) => {
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

  try {
    const s = await currentSession();
    await attemptRecordInteraction(tab, s, false);
    await reportFirstAction(USER_ACTIONS.FIRST_INTERACTION, s);
  } catch (e) {
    console.log(e);
  }
});

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  const handleErr = (err) => {
    console.log(err);
    sendResponse(false);
  };

  switch (request.action) {
    // Responses that don't need to use the session
    case MESSAGE_TYPES.INTEGRATION_STATUS:
      tabHasFilter(request.tab).then(sendResponse).catch(handleErr);
      break;
    case MESSAGE_TYPES.RELEVANT_HISTORY:
      searchRelevantHistory().then(sendResponse).catch(handleErr);
      break;
    case MESSAGE_TYPES.ALL_FILTERS:
      getAllFilters().then(sendResponse).catch(handleErr);
      break;
    case MESSAGE_TYPES.ENABLED_PROVIDERS:
      getEnabledProviders().then(sendResponse).catch(handleErr);
      break;
    case MESSAGE_TYPES.DISABLE_PROVIDER:
      toggleProvider(request.provider, false).then(sendResponse).catch(handleErr);
      break;
    // Responses that require the current session
    case MESSAGE_TYPES.ENABLE_PROVIDER:
      toggleProvider(request.provider, true)
        .then(sendResponse)
        .then(currentSession)
        .then((s) => {
          backfillHistory(s, request.provider);
        })
        .catch(handleErr);
      break;
    case MESSAGE_TYPES.NEW_PROVIDERS:
      getNewProviders().then(sendResponse).catch(handleErr);
      break;
    case MESSAGE_TYPES.ACK_NEW_PROVIDERS:
      ackNewProviders().then(sendResponse).catch(handleErr);
      break;
    case MESSAGE_TYPES.INTERACTION:
      currentSession()
        .then(async (s) => {
          const r = await attemptRecordInteraction(request.tab, s, true);
          reportFirstAction(USER_ACTIONS.FIRST_INTERACTION, s);
          sendResponse(r);
        })
        .catch(handleErr);
      break;
    case MESSAGE_TYPES.ADD_SNIPPET:
      // Since recording and interaction is idempotent we do it first to
      // ensure that the attachment exists.
      currentSession()
        .then(async (s) => {
          try {
            const i = await attemptRecordInteraction(request.tab, s, true);
            const r = await attemptAddSnippet(
              s,
              request.snippet_type,
              request.text,
              i.attachment_id
            );
            reportFirstAction(USER_ACTIONS.FIRST_SNIPPET, s);
            sendResponse(r);
          } catch (e) {
            handleErr(e);
          }
        })
        .catch(handleErr);
      break;
    case MESSAGE_TYPES.USER_STATS:
      currentSession()
        .then(async (s) => {
          const userId = sessionUserId(s);
          const r = await userStats(userId, authorize(s));
          r.user_id = userId;
          r.org_slug = s.org.slug;
          sendResponse(r);
        })
        .catch(handleErr);
      break;
    case MESSAGE_TYPES.RECENT_ACTIVITY:
      currentSession()
        .then(async (s) => {
          sendResponse(await recentActivity(authorize(s)));
        })
        .catch(handleErr);
      break;
    // Responses that require all sessions
    case MESSAGE_TYPES.SESSIONS:
      getSessions()
        .then(async (sessions) => {
          try {
            const c = await currentSession();
            sessions
              .filter((s) => s)
              .forEach((s) => {
                s.active = s.org.slug == c.org.slug;
              });
          } catch (err) {
            // If there is an error assigning an active session, we still return
            // the sessions after logging
            console.log(err);
          } finally {
            sendResponse(sessions);
          }
        })
        .catch(handleErr);
      break;
    case MESSAGE_TYPES.SET_SESSION:
      getSessions()
        .then(async (sessions) => {
          const s = sessions.find((s) => s.org.slug == request.org_slug);
          sendResponse(await setActiveOrg(s.org.slug));
        })
        .catch(handleErr);
      break;
  }

  return true;
});

// Respond to message from Range app to confirm extension is installed.
chrome.runtime.onMessageExternal.addListener(function (_request, _sender, sendResponse) {
  sendResponse({ isInstalled: true });
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
        ).then(() => {
          resolve(relevantHistory);
        });
      }
    );
  });
}

async function backfillHistory(session, provider) {
  console.log(`backfilling ${provider}`);

  const backfillStart = await getBackfillTime(provider);
  setBackfillTime(provider);

  let count = 0;
  await new Promise((resolve) => {
    chrome.history.search(
      { text: '', startTime: backfillStart, maxResults: 10000 },
      async (history) => {
        const toSync = {};
        for (const h of history) {
          try {
            const url = new URL(h.url);
            const info = await providerInfo(url, h.title, false);
            if (!info || info.provider != provider) continue;

            toSync[info.source_id] = {
              id: h.id,
              title: h.title,
              url: h.url,
              favIconUrl: `chrome://favicon/size/24/${new URL(h.url).href.split('?')[0]}`,
              time: moment(h.lastVisitTime).toISOString() || new Date().toISOString(),
            };
          } catch (_) {
            continue;
          }
        }

        const tabs = Object.values(toSync);
        tabs.sort((a, b) => {
          return moment(b.time) - moment(a.time);
        });
        for (const t of tabs) {
          try {
            await attemptRecordInteraction(t, session, false, t.time);
            count++;
          } catch (e) {
            console.log(e);
          }

          await new Promise((resolve) => {
            setTimeout(resolve, 100);
          });
        }

        resolve();
      }
    );
  });

  console.log(`finished backfilling ${count} interactions for ${provider}`);
  return;
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

async function attemptRecordInteraction(
  tab,
  session,
  force,
  interactionAt = new Date().toISOString()
) {
  if (!tab || !tab.id) {
    console.log('invalid tab sent to record interaction');
    console.log(tab);
    return Promise.reject('invalid tab sent to record interaction');
  }

  const a = await attachment(session, tab, force);
  if (!a) return Promise.reject('could not create attachment for interaction');
  const waitTime = _recordInteractionCache[a.source_id];
  if (!!waitTime && moment().before(waitTime)) {
    return Promise.reject('recently recorded interaction for this source ID');
  }

  setChromeActivity(a, tab);

  const merged = await mergeAttachment(session, a);
  const resp = await recordInteraction(
    {
      interaction_type: (_) => 'VIEWED',
      idempotency_key: `${moment().startOf('day')}::${tab.title}`,
      interaction_at: interactionAt,
      attachment: merged,
    },
    authorize(session)
  );
  _recordInteractionCache[a.source_id] = moment().add(dedupeThreshold, 'ms');
  setBackfillTime(merged.provider);

  return resp;
}

// Queries Range for existing attachments and merges the attachments based on a
// provider's configured behavior. The Range backend will overwrite all fields
// sent to it, but leave the rest alone.
async function mergeAttachment(session, attachment) {
  const dedupe = getProviderDedupe(attachment.provider);
  if (dedupe == MERGE_BEHAVIOR.REPLACE_EXISTING) return attachment;

  // This is the default, KEEP_EXISTING case
  const activity = await listActivity(attachment.provider, authorize(session));
  for (const a of activity.attachments) {
    if (a.source_id != attachment.source_id) continue;

    // Delete the properties that we want to preserve in the existing attachment
    for (const f in a) {
      // Send the core properties to ensure that the attachment is associated
      // and updated properly in Range
      if (ATTACHMENT_CORE.includes(f)) continue;
      delete attachment[f];
    }
    break;
  }

  return attachment;
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

async function providerInfo(url, title, force) {
  // For consistency, remove trailing forward slashes
  const base = url.hostname + url.pathname.replace(/\/+$/, '');

  // Loop through the known providers and check if the current URL matches one
  const filters = await enabledFilters(force);
  for (const filter of filters) {
    if (filter.no_sync && !force) continue;

    let sourceId = '';
    for (const reUrl of filter.url_regex) {
      if (!reUrl.test(base)) continue;
      if (blocked(filter.block_list, url, title) && !force) return null;

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

          if (processor.change_info) Object.assign(info, processor.change_info(url));
          if (processor.issue_info) Object.assign(info, processor.issue_info(url));
          if (filter.parent) Object.assign(info, filter.parent(url));

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
  const tld = hostParts[hostParts.length - 1] || '';
  const domain = hostParts[hostParts.length - 2] || '';
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

async function currentSession() {
  const sessions = await getSessions();
  if (!sessions || sessions.length < 1) throw 'no authenticated sessions';
  if (sessions.length == 1) return sessions[0];

  return new Promise((resolve, reject) => {
    chrome.storage.local.get(['active_org'], (resp) => {
      const slug = resp.active_org;
      if (!slug) reject('no active org slug found');

      const session = sessions.find((s) => s.org.slug == slug);
      if (!session) reject(`no org found matching slug "${slug}"`);

      resolve(session);
    });
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

function getBackfillTime(provider) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backfill'], (resp) => {
      if (!resp.backfill || !resp.backfill[provider]) {
        resolve(moment().subtract(90, 'd').valueOf());
      } else {
        resolve(resp.backfill[provider]);
      }
    });
  });
}

function setBackfillTime(provider) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['backfill'], (resp) => {
      const backfill = resp.backfill || {};
      backfill[provider] = new Date().getTime();
      chrome.storage.local.set({ backfill: backfill }, resolve);
    });
  });
}
