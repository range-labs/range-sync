'use strict';

let MESSAGE_TYPES;

const init = new Promise((resolve) => {
  chrome.runtime.getBackgroundPage((bg) => {
    MESSAGE_TYPES = bg.MESSAGE_TYPES;
    resolve();
  });
});

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

  chrome.storage.local.get(['active_providers', 'filters'], (resp) => {
    if (!resp || !resp.filters) return;
    if (!resp.active_providers) resp.active_providers = [];

    const active = [];
    const inactive = [];
    const providerNameMap = {};

    for (const f of Object.values(resp.filters)) {
      providerNameMap[f.provider_name] = f.provider;
      const inst = toggleTemplate.content.cloneNode(true);
      inst.querySelector('.providerIcon').src = `../images/providers/${f.provider}.png`;
      const name = inst.querySelector('.providerName');
      name.textContent = f.provider_name;
      name.id = f.provider;
      const desc = inst.querySelector('.switchDescription');

      if (resp.active_providers.includes(f.provider)) {
        desc.textContent = 'Sync ON';
        desc.classList.add('active');
        inst.querySelector('.toggle').checked = true;
        active.push(inst);
      } else {
        desc.textContent = 'Sync OFF';
        inst.querySelector('.toggle').checked = false;
        inactive.push(inst);
      }
    }

    active.sort(sortProvider);
    active.forEach((e) => relevantToggles.appendChild(e));

    getRelevantHistory()
      .then((history) => {
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
      })
      .then(addToggleListeners)
      .catch(console.log);

    getSessions().then((sessions) => {
      // if (sessions.length < 2) return;

      workspaceSelector.addEventListener('click', () => {
        workspaceSelector.classList.toggle('open');
      });
      workspaceSelector.classList.add('active');

      for (const s of sessions) {
        const isActive = s.active ? 'active' : '';
        const option = document.createElement('div');
        option.className = `workspaceOption ${isActive}`;
        option.textContent = s.org.name;
        option.addEventListener('click', () => {
          setActiveOrg(e.id).then(() => {
            location.reload();
          });
        });
        workspaceList.appendChild(option);
      }
    });
  });
})();

enableVisited.addEventListener('click', async () => {
  const toggles = relevantToggles.querySelectorAll('.toggleContainer');
  for (const t of toggles) {
    const desc = t.querySelector('.switchDescription');
    const checkbox = t.querySelector('.toggle');
    const name = t.querySelector('.providerName');

    if (!desc.classList.contains('active')) {
      enableToggle(desc, checkbox);
      await toggleStoredProvider(name.id, true);
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
      await toggleStoredProvider(name.id, false);
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
        toggleStoredProvider(name.id, false);
      } else {
        enableToggle(desc, checkbox);
        toggleStoredProvider(name.id, true);
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

function toggleStoredProvider(provider, active) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['active_providers'], (resp) => {
      const providers = resp.active_providers || [];
      const idx = providers.indexOf(provider);
      if (active) {
        if (idx < 0) providers.push(provider);
      } else {
        if (idx > -1) providers.splice(idx, 1);
      }

      chrome.storage.local.set({ active_providers: providers }, resolve);
    });
  });
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
