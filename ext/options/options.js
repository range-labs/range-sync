'use strict';

// TODO: Figure out how to do code sharing with manifest v3 and service workers.
// Copied from const.js

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

const workspaceSelector = document.getElementById('workspaceSelector');
const activeOrg = document.getElementsByClassName('activeOrg');
const signInButton = document.getElementById('signInButton');
const workspaceButton = document.getElementById('workspaceButton');
const workspaceContent = document.getElementById('workspaceContent');
const workspaceList = document.getElementById('workspaceList');
const enableVisited = document.getElementById('enableVisited');
const toggleTemplate = document.getElementById('toggleTemplate');
const relevantToggles = document.getElementById('relevantToggles');
const irrelevantContent = document.getElementById('irrelevantContent');
const irrelevantToggles = document.getElementById('irrelevantToggles');
const showIrrelevant = document.getElementById('showIrrelevant');
const supportedCounts = document.getElementsByClassName('supportedCount');

(async () => {
  const providerNameMap = {};
  const newProviderOptions = [];
  const active = [];
  const inactive = [];

  const allFilters = await getAllFilters();
  const enabledProviders = await getEnabledProviders();
  const newProviders = await getNewProviders();
  for (const f of Object.values(allFilters)) {
    providerNameMap[f.provider_name] = f.provider;
    const inst = toggleTemplate.content.cloneNode(true);
    inst.querySelector('.providerIcon').src = `../images/providers/${f.provider}.png`;
    const name = inst.querySelector('.providerName');
    name.textContent = f.provider_name;
    name.id = f.provider;
    const desc = inst.querySelector('.switchDescription');

    if (enabledProviders.includes(f.provider)) {
      desc.textContent = 'Sync ON';
      desc.classList.add('active');
      inst.querySelector('.toggle').checked = true;
      active.push(inst);
    } else if (newProviders.includes(f.provider)) {
      const newProvider = inst.querySelector('.newProvider');
      newProvider.classList.add('active');
      desc.textContent = 'Sync OFF';
      inst.querySelector('.toggle').checked = false;
      newProviderOptions.push(inst);
    } else {
      desc.textContent = 'Sync OFF';
      inst.querySelector('.toggle').checked = false;
      inactive.push(inst);
    }
  }

  newProviderOptions.sort(sortProvider);
  newProviderOptions.forEach((e) => relevantToggles.appendChild(e));
  active.sort(sortProvider);
  active.forEach((e) => relevantToggles.appendChild(e));

  const history = await getRelevantHistory();
  const sortRelevant = (a, b) => {
    const providerA = providerNameMap[a.querySelector('.providerName').textContent];
    const providerB = providerNameMap[b.querySelector('.providerName').textContent];
    const scoreA = history[providerA] || 0;
    const scoreB = history[providerB] || 0;

    if (scoreA == scoreB) {
      return sortProvider(a, b);
    } else {
      return scoreB - scoreA;
    }
  };

  let irrelevantCount = 0;
  inactive.sort(sortRelevant);
  inactive.forEach((e) => {
    if (!!history[providerNameMap[e.querySelector('.providerName').textContent]]) {
      relevantToggles.appendChild(e);
    } else {
      irrelevantCount++;
      irrelevantToggles.appendChild(e);
    }
  });

  for (const c of supportedCounts) {
    c.textContent = irrelevantCount;
  }
  addToggleListeners();

  const sessions = await getSessions();
  const authState = await getAuthState();

  const setupSelector = () => {
    // If the users is associated with multiple workspaces
    if (sessions.length > 1) {
      workspaceSelector.addEventListener('click', () => {
        workspaceSelector.classList.toggle('open');
      });

      for (const s of sessions) {
        const isActive = s.active ? 'active' : '';
        const option = document.createElement('div');
        option.className = `workspaceOption ${isActive}`;
        option.textContent = s.org.name;
        option.addEventListener('click', async () => {
          await setActiveOrg(s.org.slug);
          location.reload();
        });
        workspaceList.appendChild(option);

        workspaceSelector.classList.add('active');
        workspaceButton.classList.add('active');
      }
    }
  };

  const activeSession = sessions && sessions.find((s) => s.active);
  switch (authState) {
    case AUTH_STATES.NO_AUTH.value:
      // If there are no user sessions
      workspaceSelector.classList.add('active');
      signInButton.classList.add('active');
      break;
    case AUTH_STATES.NO_SYNC_AUTH.value:
      // If the selected workspace is no longer authenticated allow to
      // reauthenticating or selecting another workspace
      for (const e of activeOrg) {
        e.textContent = 'another workspace...';
      }
      const workspaceOr = document.getElementById('workspaceOr');
      workspaceOr.classList.add('active');
      signInButton.textContent = 'Sign in to current workspace again';
      signInButton.classList.add('active');
      setupSelector();
      break;
    case AUTH_STATES.NO_SYNC_SELECTED.value:
      // If authentication is confirmed, put "Please select..." in workspace
      // selector
      for (const e of activeOrg) {
        e.textContent = 'Please select...';
      }
      setupSelector();
      break;
    case AUTH_STATES.OK.value:
      // If authentication is confirmed, put active workspace in workspace
      // selector
      for (const e of activeOrg) {
        e.textContent = activeSession.org.name;
      }
      setupSelector();
      break;
  }

  await ackNewProviders();
})();

enableVisited.addEventListener('click', async () => {
  const toggles = relevantToggles.querySelectorAll('.toggleContainer');
  for (const t of toggles) {
    const desc = t.querySelector('.switchDescription');
    const checkbox = t.querySelector('.toggle');
    const name = t.querySelector('.providerName');

    if (!desc.classList.contains('active')) {
      enableToggle(desc, checkbox);
      await enableProvider(name.id);
    }
  }
});

showIrrelevant.addEventListener('click', () => {
  showIrrelevant.classList.add('inactive');
  irrelevantContent.classList.remove('inactive');
});

function sortProvider(a, b) {
  return a.querySelector('.providerName').textContent.toUpperCase() <
    b.querySelector('.providerName').textContent.toUpperCase()
    ? -1
    : 1;
}

async function addToggleListeners() {
  const toggles = document.getElementsByClassName('toggleContainer');
  const disableButton = document.getElementById('disableAll');

  disableButton.addEventListener('click', async () => {
    for (const t of toggles) {
      const desc = t.querySelector('.switchDescription');
      const checkbox = t.querySelector('.toggle');
      const name = t.querySelector('.providerName');

      disableToggle(desc, checkbox);
      await disableProvider(name.id);
    }
  });

  for (const t of toggles) {
    const desc = t.querySelector('.switchDescription');
    const name = t.querySelector('.providerName');
    const checkbox = t.querySelector('.toggle');
    const slider = t.querySelector('.slider');

    slider.addEventListener('click', (e) => {
      e.preventDefault();
      return false;
    });

    t.addEventListener('click', () => {
      if (desc.classList.contains('active')) {
        disableToggle(desc, checkbox);
        disableProvider(name.id);
      } else {
        enableToggle(desc, checkbox);
        enableProvider(name.id);
      }
    });
  }
}

function enableToggle(desc, checkbox) {
  desc.classList.add('active');
  desc.textContent = 'Sync ON';
  checkbox.checked = true;
}

function disableToggle(desc, checkbox) {
  desc.classList.remove('active');
  desc.textContent = 'Sync OFF';
  checkbox.checked = false;
}

function getRelevantHistory() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.RELEVANT_HISTORY }, resolve);
  });
}

function getSessions() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.SESSIONS }, resolve);
  });
}

function setActiveOrg(orgSlug) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.SET_SESSION, org_slug: orgSlug }, resolve);
  });
}

function getAllFilters() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.ALL_FILTERS }, resolve);
  });
}

function getEnabledProviders() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.ENABLED_PROVIDERS }, resolve);
  });
}

function getNewProviders() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.NEW_PROVIDERS }, resolve);
  });
}

function ackNewProviders() {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ action: MESSAGE_TYPES.ACK_NEW_PROVIDERS }, resolve);
  });
}

function enableProvider(provider) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: MESSAGE_TYPES.ENABLE_PROVIDER, provider: provider },
      resolve
    );
  });
}

function disableProvider(provider) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(
      { action: MESSAGE_TYPES.DISABLE_PROVIDER, provider: provider },
      resolve
    );
  });
}

function getAuthState() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['auth_state'], (resp) => {
      resolve(resp.auth_state);
    });
  });
}
