'use strict';

// TODO: Figure out how to do code sharing with manifest v3 and service workers.
// Copied from const.js

var SNIPPET_TYPES = {
  PAST: 1,
  FUTURE: 2,
  BACKLOG: 4,
};

var INTEGRATION_STATUSES = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
};

var MESSAGE_TYPES = {
  INTEGRATION_STATUS: 'INTEGRATION_STATUS',
  RELEVANT_HISTORY: 'RELEVANT_HISTORY',
  ALL_FILTERS: 'ALL_FILTERS',
  ENABLED_PROVIDERS: 'ENABLED_PROVIDERS',
  ENABLE_PROVIDER: 'ENABLE_PROVIDER',
  DISABLE_PROVIDER: 'DISABLE_PROVIDER',
  NEW_PROVIDERS: 'NEW_PROVIDERS',
  ACK_NEW_PROVIDERS: 'ACK_NEW_PROVIDERS',
  INTERACTION: 'INTERACTION',
  ADD_SNIPPET: 'ADD_SNIPPET',
  USER_STATS: 'USER_STATS',
  RECENT_ACTIVITY: 'RECENT_ACTIVITY',
  SESSIONS: 'SESSIONS',
  SET_SESSION: 'SET_SESSION',
};

var AUTH_STATES = {
  // Not authenticated at all
  NO_AUTH: { value: 'NO_AUTH', badge: 'AUTH' },
  // Currently selected session is no longer authenticated
  NO_SYNC_AUTH: { value: 'NO_SYNC_AUTH', badge: 'AUTH' },
  // Multiple sessions are authenticated but none are selected
  NO_SYNC_SELECTED: { value: 'NO_SYNC_SELECTED', badge: 'SYNC' },
  // Everything is okay
  OK: { value: 'OK', badge: '' },
};

// End TODO;

const accordions = document.getElementsByClassName('accordion');
const checkInContainer = document.getElementById('checkInContainer');
const checkInSuccess = document.getElementById('checkInSuccess');
const checkInTypes = document.getElementsByClassName('checkInType');
const checkInText = document.getElementById('checkInText');
const addToCheckInButton = document.getElementById('addToCheckInButton');
const attachmentTitle = document.getElementById('attachmentTitle');
const attachmentSubtitle = document.getElementById('attachmentSubtitle');
const attachmentIcon = document.getElementById('attachmentIcon');
const checkInLogo = document.getElementById('checkInLogo');
const checkInTime = document.getElementById('checkInTime');
const activeOrgNames = document.getElementsByClassName('activeOrgName');
const checkInButton = document.getElementById('checkInButton');
const viewCheckInButton = document.getElementById('viewCheckInButton');
const activityList = document.getElementById('activityList');
const activityItemTemplate = document.getElementById('activityItemTemplate');
const activityDropdown = document.getElementById('activityDropdown');
const activityDropdownButton = document.getElementById('activityDropdownButton');
const activityDropdownItems = document.getElementsByClassName('activityDropdownItem');
const settingsLinks = document.getElementsByClassName('settingsLink');
const hostnames = document.getElementsByClassName('hostname');
const providerNames = document.getElementsByClassName('providerName');
const integrationIndicator = document.getElementById('integrationIndicator');
const integrationEnabled = document.getElementById('integrationEnabled');
const integrationDisabled = document.getElementById('integrationDisabled');
const integrationNotSupported = document.getElementById('integrationNotSupported');
const disableIntegrationLink = document.getElementById('disableIntegrationLink');
const enableIntegrationLink = document.getElementById('enableIntegrationLink');
const enableIntegrationButton = document.getElementById('enableIntegrationButton');
const integrationOn = document.getElementById('integrationOn');
const integrationOff = document.getElementById('integrationOff');
const enabledCounts = document.getElementsByClassName('enabledCount');

(async () => {
  chrome.runtime.sendMessage({ action: MESSAGE_TYPES.USER_STATS }, async (resp) => {
    const userId = resp.user_id;
    const updateCount = resp.update_count;
    const lastUpdate = moment(resp.last_update_at);
    const sameDay = lastUpdate.isSame(moment(), 'day');
    const dayDiff = moment().diff(lastUpdate, 'days');

    checkInTime.className = '';
    if (updateCount < 1) {
      checkInLogo.src = '/images/check-in-yesterday.png';
      checkInTime.classList.add('checkInYesterday');
      checkInTime.textContent = 'Share your first Check-in!';
      checkInButton.classList.add('active');
      viewCheckInButton.classList.remove('active');
      checkInButton.href = `https://range.co/${resp.org_slug}/compose`;
    } else if (sameDay) {
      checkInLogo.src = '/images/check-in-today.png';
      checkInTime.classList.add('checkInToday');
      checkInTime.textContent = 'Checked in today';
      checkInButton.classList.remove('active');
      viewCheckInButton.classList.add('active');
      viewCheckInButton.href = `https://range.co/${resp.org_slug}/checkins?user=${userId}`;
    } else if (dayDiff < 2) {
      checkInLogo.src = '/images/check-in-yesterday.png';
      checkInTime.classList.add('checkInYesterday');
      checkInTime.textContent = 'Last Check-in: Yesterday';
      checkInButton.classList.add('active');
      viewCheckInButton.classList.remove('active');
    } else if (lastUpdate.isSame(moment(), 'week')) {
      checkInLogo.src = '/images/check-in-long.png';
      checkInTime.classList.add('checkInLong');
      checkInTime.textContent = `Last Check-in: ${lastUpdate.format('dddd')}`;
      checkInButton.classList.add('active');
      viewCheckInButton.classList.remove('active');
    } else {
      checkInLogo.src = '/images/check-in-long.png';
      checkInTime.classList.add('checkInLong');
      checkInTime.textContent = `Last Check-in: ${dayDiff} days ago`;
      checkInButton.classList.add('active');
      viewCheckInButton.classList.remove('active');
    }
  });

  // Fill appropriate popup sections with tab information
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    addToCheckInButton.onclick = () => {
      sendInteraction(tab);
      sendSnippet(currentCheckInType(), tab, checkInText.value);
    };

    checkInText.addEventListener('keydown', (e) => {
      if (e.metaKey && e.keyCode === 13) {
        sendInteraction(tab);
        sendSnippet(currentCheckInType(), tab, checkInText.value);
      }
    });

    const tabUrl = new URL(tab.url);
    attachmentTitle.textContent = tab.title;
    attachmentSubtitle.textContent = `${tabUrl.hostname} - Viewed`;
    if (!!tab.favIconUrl) {
      attachmentIcon.src = tab.favIconUrl;
    } else {
      attachmentIcon.src = `chrome://favicon/size/24/${tabUrl.href.split('?')[0]}`;
    }

    for (const h of hostnames) {
      h.textContent = tabUrl.hostname;
    }

    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.INTEGRATION_STATUS, tab: tab }, (r) => {
      switch (r.status) {
        case INTEGRATION_STATUSES.ENABLED:
          integrationEnabled.classList.add('active');
          integrationIndicator.textContent = 'ON';
          break;
        case INTEGRATION_STATUSES.DISABLED:
          integrationDisabled.classList.add('active');
          integrationIndicator.textContent = 'OFF';
          break;
        default:
          integrationNotSupported.classList.add('active');
          integrationIndicator.textContent = 'Request';
          break;
      }

      disableIntegrationLink.addEventListener('click', () => {
        disableProvider(r.provider).then(() => {
          integrationOn.classList.remove('active');
          disableIntegrationLink.classList.remove('active');
          integrationOff.classList.add('active');
          enableIntegrationLink.classList.add('active');
          integrationIndicator.textContent = 'OFF';
        });
      });

      enableIntegrationLink.addEventListener('click', () => {
        enableProvider(r.provider).then(() => {
          integrationOff.classList.remove('active');
          enableIntegrationLink.classList.remove('active');
          integrationOn.classList.add('active');
          disableIntegrationLink.classList.add('active');
          integrationIndicator.textContent = 'ON';
        });
      });

      enableIntegrationButton.addEventListener('click', () => {
        enableProvider(r.provider).then(() => {
          integrationDisabled.classList.remove('active');
          enableIntegrationLink.classList.remove('active');
          integrationEnabled.classList.add('active');
          integrationIndicator.textContent = 'ON';
        });
      });

      for (const p of providerNames) {
        if (r.provider_name && !r.provider_name.includes('(via Range Sync)')) {
          p.textContent = r.provider_name;
          continue;
        }

        const parts = tabUrl.hostname.split('.');
        const domain = parts[parts.length - 2];
        if (!domain) break;

        p.textContent = domain.charAt(0).toUpperCase() + domain.slice(1);
      }

      for (const c of enabledCounts) {
        c.textContent = r.enabled_count;
      }
    });
  });

  chrome.runtime.sendMessage({ action: MESSAGE_TYPES.RECENT_ACTIVITY }, recentActivityHandler);

  const sessions = await getSessions();
  const authState = await getAuthState();

  switch (authState) {
    case AUTH_STATES.NO_AUTH.value:
    case AUTH_STATES.NO_SYNC_AUTH.value:
      // If the user is not authenticated with Range or is no longer
      // authenticated with the selected session
      const unauthElements = document.getElementsByClassName('unauthenticated');
      for (const e of unauthElements) {
        e.style.display = 'flex';
      }
      break;
    case AUTH_STATES.NO_SYNC_SELECTED.value:
      // If the user is authenticated with multiple workspaces but has not
      // selected one, show link to options page
      const noActiveElements = document.getElementsByClassName('noActiveWorkspace');
      for (const e of noActiveElements) {
        e.style.display = 'flex';
      }
      break;
    case AUTH_STATES.OK.value:
      // If authentication has been confirmed, show accordion
      const authElements = document.getElementsByClassName('authenticated');
      for (const e of authElements) {
        e.style.display = 'block';
      }
      checkInText.focus();
      break;
  }

  let activeOrg = '';
  if (sessions.length > 1) {
    for (const s of sessions) {
      if (s.active) {
        activeOrg = `${s.org.name} `;
        for (const a of activeOrgNames) {
          a.textContent = activeOrg;
        }
        break;
      }
    }
  }

  // Attach events to accordions
  for (const a of accordions) {
    a.addEventListener('click', () => {
      const isActive = a.classList.contains('active');

      for (const e of accordions) {
        e.classList.remove('active');
      }

      if (!isActive) {
        a.classList.add('active');
      }
      checkInText.focus();
    });
  }

  for (const t of checkInTypes) {
    t.addEventListener('click', () => {
      if (t.classList.contains('active')) return;

      for (const e of checkInTypes) {
        e.classList.remove('active');
      }
      t.classList.add('active');

      switch (t.id) {
        case 'FUTURE':
          checkInText.placeholder = 'What do you want to accomplish?';
          addToCheckInButton.textContent = `Add to next ${activeOrg}Check-in`;
          checkInSuccess.textContent = `Item added to your next ${activeOrg}Check-in`;
          break;
        case 'BACKLOG':
          checkInText.placeholder = 'Why is this going to the backlog?';
          addToCheckInButton.textContent = `Add to ${activeOrg}Backlog`;
          checkInSuccess.textContent = `Item added to your ${activeOrg}Backlog`;
          break;
        case 'PAST':
        default:
          checkInText.placeholder = 'What progress did you make?';
          addToCheckInButton.textContent = `Add to next ${activeOrg}Check-in`;
          checkInSuccess.textContent = `Item added to your next ${activeOrg}Check-in`;
          break;
      }

      checkInText.focus();
    });
  }

  activityDropdown.addEventListener('click', () => {
    if (activityDropdown.classList.contains('active')) activityDropdown.classList.remove('active');
    else activityDropdown.classList.add('active');
  });

  for (const filterOption of activityDropdownItems) {
    filterOption.addEventListener('click', () => {
      activityDropdownButton.querySelector('#activityDropdownLabel').innerText =
        filterOption.innerText;

      if (filterOption.id === 'allActivityFilter') {
        chrome.runtime.sendMessage(
          { action: MESSAGE_TYPES.RECENT_ACTIVITY },
          recentActivityHandler
        );
      } else {
        chrome.storage.local.get(['filters', 'recent_activity'], (resp) => {
          activityList.innerHTML = '';
          const filters = resp.filters;
          const recentActivity = resp.recent_activity;
          if (recentActivity?.length > 0) {
            recentActivity.forEach((attachment) => {
              const activityItem = activityItemTemplate.content.cloneNode(true);
              activityItem.querySelector('.activityItem.link').href = attachment.html_url;
              activityItem.querySelector('.activityItem.link').target = '_blank';
              activityItem.querySelector('.attachmentIcon').src = filters[attachment.provider]
                ? `/images/providers/${attachment.provider}.png`
                : attachment.favIconUrl;
              activityItem.querySelector('.attachmentTitle').innerText = attachment.name;
              activityItem.querySelector('.attachmentSubtitle').innerText = 'Viewed';
              activityList.appendChild(activityItem);
            });
          } else {
            activityList.innerText = 'No activity yet';
          }
        });
      }
    });
  }

  for (const l of settingsLinks) {
    l.addEventListener('click', () => chrome.runtime.openOptionsPage());
  }
})();

function currentCheckInType() {
  for (const t of checkInTypes) {
    if (t.classList.contains('active')) {
      return SNIPPET_TYPES[t.id];
    }
  }

  return SNIPPET_TYPES['PAST'];
}

function enableProvider(provider) {
  return new Promise(resolve, () => {
    chrome.runtime.sendMessage(
      { action: MESSAGE_TYPES.ENABLE_PROVIDER, provider: provider },
      resolve
    );
  });
}

function disableProvider(provider) {
  return new Promise(resolve, () => {
    chrome.runtime.sendMessage(
      { action: MESSAGE_TYPES.DISABLE_PROVIDER, provider: provider },
      resolve
    );
  });
}

function sendInteraction(tab) {
  chrome.runtime.sendMessage({ action: MESSAGE_TYPES.INTERACTION, tab: tab });
}

function sendSnippet(type, tab, text) {
  chrome.runtime.sendMessage(
    { action: MESSAGE_TYPES.ADD_SNIPPET, snippet_type: type, tab: tab, text: text },
    () => {
      checkInContainer.classList.remove('active');
      checkInSuccess.classList.add('active');
    }
  );
}

function getSessions() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.SESSIONS }, resolve);
  });
}

function recentActivityHandler(response) {
  if (!response) return;

  chrome.storage.local.get(['filters', 'recent_activity'], (r) => {
    const filters = r.filters;
    const recentActivity = r.recent_activity;

    let interactionsByAttachmentId = {};
    response.interactions?.forEach(
      (interaction) =>
        (interactionsByAttachmentId = {
          ...interactionsByAttachmentId,
          [interaction.attachment_id]: interaction,
        })
    );
    if (response.attachments.length > 0) {
      activityList.innerText = '';
      response.attachments.forEach((attachment) => {
        let provider = attachment.provider;
        if (provider.startsWith('chromeext_')) provider = provider.slice(10);

        let attachmentIcon = '';
        if (!filters[provider])
          attachmentIcon = recentActivity?.find(
            (activity) => activity.provider === attachment.provider
          )?.favIconUrl;

        const activityItem = activityItemTemplate.content.cloneNode(true);
        activityItem.querySelector('.activityItem.link').href = attachment.html_url;
        activityItem.querySelector('.activityItem.link').target = '_blank';
        activityItem.querySelector('.attachmentIcon').src = attachmentIcon
          ? attachmentIcon
          : `/images/providers/${provider}.png`;
        activityItem.querySelector('.attachmentTitle').innerText = attachment.name;
        activityItem.querySelector('.attachmentTitle').innerText = attachment.name;
        activityItem.querySelector('.attachmentSubtitle').innerText =
          interactionsByAttachmentId[attachment.id].interaction_type !== 'UNSET'
            ? interactionsByAttachmentId[attachment.id].interaction_type.toLowerCase()
            : 'Viewed';

        activityList.prepend(activityItem);
      });
    } else {
      activityList.innerText = 'No activity yet';
    }
  });
}

function getAuthState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth_state'], (resp) => {
      resolve(resp.auth_state);
    });
  });
}
