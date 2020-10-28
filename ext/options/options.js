'use strict';

const toggleTemplate = document.getElementById('toggle-template');
const toggleContainer = document.getElementById('toggleContent');
const moreContainer = document.getElementById('moreContainer');

chrome.storage.local.get(['active_providers', 'filters'], (resp) => {
  if (!resp || !resp.filters) return;
  if (!resp.active_providers) resp.active_providers = [];

  const active = [];
  const inactive = [];

  for (const f of Object.values(resp.filters)) {
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
  inactive.sort(sortProvider);

  active.forEach((e) => toggleContainer.appendChild(e));
  inactive.forEach((e) => toggleContainer.appendChild(e));

  addToggleListeners();
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

      if (desc.classList.contains('active')) {
        disableToggle(desc, checkbox);
        await toggleStoredProvider(name.id, false);
      }
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
