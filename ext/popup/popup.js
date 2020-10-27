'use strict';

let SNIPPET_TYPES;
let INTEGRATION_STATUSES;
let MESSAGE_TYPES;

const init = new Promise((resolve) => {
  chrome.runtime.getBackgroundPage((bg) => {
    SNIPPET_TYPES = bg.SNIPPET_TYPES;
    INTEGRATION_STATUSES = bg.INTEGRATION_STATUSES;
    MESSAGE_TYPES = bg.MESSAGE_TYPES;
    console.log(SNIPPET_TYPES);
    console.log(INTEGRATION_STATUSES);
    console.log(MESSAGE_TYPES);
    resolve();
  });
});

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
const checkInButton = document.getElementById('checkInButton');
const viewCheckInButton = document.getElementById('viewCheckInButton');
const activityList = document.getElementById('activityList');
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
  await init;

  chrome.runtime.sendMessage({ action: MESSAGE_TYPES.USER_STATS }, (resp) => {
    const userId = resp.user_id;
    const updateCount = resp.update_count;
    const lastUpdate = moment(resp.last_update_at);
    const dayDiff = lastUpdate.diff(moment(), 'days');

    checkInTime.className = '';
    if (updateCount < 1) {
      checkInLogo.src = '/images/check-in-yesterday.png';
      checkInTime.classList.add('checkInYesterday');
      checkInTime.textContent = 'Share your first Check-in!';
      checkInButton.classList.add('active');
    } else if (dayDiff < 1) {
      checkInLogo.src = '/images/check-in-today.png';
      checkInTime.classList.add('checkInToday');
      checkInTime.textContent = 'Checked in today';
      checkInButton.classList.remove('active');
      viewCheckInButton.classList.add('active');
      viewCheckInButton.href = `https://range.co/_/checkins?user=${userId}`;
    } else if (dayDiff == 1) {
      checkInLogo.src = '/images/check-in-yesterday.png';
      checkInTime.classList.add('checkInYesterday');
      checkInTime.textContent = 'Last Check-in: Yesterday';
      checkInButton.classList.add('active');
    } else if (lastUpdate.isSame(moment(), 'week')) {
      checkInLogo.src = '/images/check-in-long.png';
      checkInTime.classList.add('checkInLong');
      checkInTime.textContent = `Last Check-in: ${lastUpdate.format('dddd')}`;
      checkInButton.classList.add('active');
    } else {
      checkInLogo.src = '/images/check-in-long.png';
      checkInTime.classList.add('checkInLong');
      checkInTime.textContent = `Last Check-in: ${dayDiff} days ago`;
      checkInButton.classList.add('active');
    }
  });

  // Fill appropriate popup sections with tab information
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    const tab = tabs[0];

    addToCheckInButton.onclick = () => {
      sendInteraction(tab);
      sendSnippet(currentCheckInType(), tab, checkInText.value);
    };

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

  chrome.runtime.sendMessage({ action: MESSAGE_TYPES.RECENT_ACTIVITY }, (response) => {
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
        const activityItem = document.createElement('a');
        activityItem.classList.add('activityItem');
        activityItem.classList.add('link');
        activityItem.href = attachment.html_url;
        activityItem.target = '_blank';
        activityItem.innerHTML = `<div class="attachmentIconWrapper">
        <img class="attachmentIcon" src="/images/providers/${attachment.provider}.png" />
      </div>
      <div class="attachmentData">
        <div class="attachmentTitle">${attachment.name}</div>
        <div class="attachmentSubtitle">${
          interactionsByAttachmentId[attachment.id].interaction_type !== 'UNSET'
            ? interactionsByAttachmentId[attachment.id].interaction_type.toLowerCase()
            : 'Viewed'
        }</div>
      </div>`;
        activityList.appendChild(activityItem);
      });
    }
  });

  chrome.runtime.sendMessage({ action: MESSAGE_TYPES.IS_AUTHENTICATED }, (r) => {
    if (!!r) {
      // If authentication has been confirmed, show accordion
      const authElements = document.getElementsByClassName('authenticated');
      for (const e of authElements) {
        e.style.display = 'block';
      }
    } else {
      // If the user is not authenticated with Range, show login button
      const unauthElements = document.getElementsByClassName('unauthenticated');
      for (const e of unauthElements) {
        e.style.display = 'flex';
      }
    }
  });

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
        case 'checkInFuture':
          checkInText.placeholder = 'What do you want to accomplish?';
          addToCheckInButton.textContent = 'Add to next Check-in';
          checkInSuccess.textContent = 'Item added to your next Check-in';
          break;
        case 'checkInBacklog':
          checkInText.placeholder = 'Why is this going to the backlog?';
          addToCheckInButton.textContent = 'Add to Backlog';
          checkInSuccess.textContent = 'Item added to your Backlog';
          break;
        case 'checkInPast':
        default:
          checkInText.placeholder = 'What progress did you make?';
          addToCheckInButton.textContent = 'Add to next Check-in';
          checkInSuccess.textContent = 'Item added to your next Check-in';
          break;
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

  return SNIPPET_TYPES['checkInPast'];
}

function enableProvider(providerName) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['active_providers'], (resp) => {
      if (!providerName) {
        resolve();
        return;
      }

      // While developing we can accidentally introduce invalid providers
      const providers = (resp.active_providers || []).filter((p) => !!p);
      if (!providers.includes(providerName)) providers.push(providerName);
      chrome.storage.local.set({ active_providers: providers }, () => {
        resolve();
      });
    });
  });
}

function disableProvider(providerName) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['active_providers'], (resp) => {
      if (!providerName) {
        resolve();
        return;
      }

      // While developing we can accidentally introduce invalid providers
      const providers = (resp.active_providers || []).filter((p) => !!p);
      const idx = providers.indexOf(providerName);
      if (idx > -1) providers.splice(idx, 1);
      chrome.storage.local.set({ active_providers: providers }, () => {
        resolve();
      });
    });
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
