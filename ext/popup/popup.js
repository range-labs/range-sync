'use strict';

const record = document.getElementById('record');
record.onclick = (_) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({ action: 'INTERACTION', tab: tabs[0] });
  });
};

chrome.storage.local.get(['sessions'], (r) => {
  // If the user is not authenticated with Range, show login button
  if (!r || !r.sessions || Object.keys(r.sessions).length < 1) {
    const unauthElements = document.getElementsByClassName('unauthenticated');
    for (const e of unauthElements) {
      e.style.display = 'flex';
    }
    return;
  }

  // If authentication has been confirmed, show accordion
  const authElements = document.getElementsByClassName('authenticated');
  for (const e of authElements) {
    e.style.display = 'block';
  }
});

// Attach events to accordions
const accordions = document.getElementsByClassName('accordion');
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
