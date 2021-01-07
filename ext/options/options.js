'use strict';

let MESSAGE_TYPES;

const init = new Promise((resolve) => {
  chrome.runtime.getBackgroundPage((bg) => {
    MESSAGE_TYPES = bg.MESSAGE_TYPES;
    resolve();
  });
});

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
  await init;

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
  if (!sessions || sessions.length < 1) {
    workspaceSelector.classList.add('active');
    signInButton.classList.add('active');
    return;
  }

  if (sessions.length < 2) return;

  workspaceSelector.addEventListener('click', () => {
    workspaceSelector.classList.toggle('open');
  });

  for (const s of sessions) {
    const isActive = s.active ? 'active' : '';
    if (isActive) {
      for (const e of activeOrg) {
        e.textContent = s.org.name;
      }
    }

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
