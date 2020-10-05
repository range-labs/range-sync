'use strict';

const SNIPPET_TYPES = {
  'check-in-past': 'PAST',
  'check-in-future': 'FUTURE',
  'check-in-backlog': 'BACKLOG',
};

const accordions = document.getElementsByClassName('accordion');
const checkInContainer = document.getElementById('check-in-container');
const checkInSuccess = document.getElementById('check-in-success');
const checkInTypes = document.getElementsByClassName('check-in-type');
const checkInText = document.getElementById('check-in-text');
const checkInButton = document.getElementById('add-to-check-in-button');

function currentCheckInType() {
  for (const t of checkInTypes) {
    if (t.classList.contains('active')) {
      return SNIPPET_TYPES[t.id];
    }
  }

  return SNIPPET_TYPES['check-in-past'];
}

checkInButton.onclick = () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    sendInteraction(tabs[0]);
    sendCheckIn(currentCheckInType(), tabs[0], checkInText.value);
  });
};

chrome.storage.local.get(['sessions'], (r) => {
  if (!r || !r.sessions || Object.keys(r.sessions).length < 1) {
    // If the user is not authenticated with Range, show login button
    const unauthElements = document.getElementsByClassName('unauthenticated');
    for (const e of unauthElements) {
      e.style.display = 'flex';
    }
  } else {
    // If authentication has been confirmed, show accordion
    const authElements = document.getElementsByClassName('authenticated');
    for (const e of authElements) {
      e.style.display = 'block';
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
      case 'check-in-future':
        checkInText.placeholder = 'What do you want to accomplish?';
        checkInButton.innerText = 'Add to next Check-in';
        checkInSuccess.innerText = 'Item added to your next Check-in';
        break;
      case 'check-in-backlog':
        checkInText.placeholder = 'Why is this going to the backlog?';
        checkInButton.innerText = 'Add to Backlog';
        checkInSuccess.innerText = 'Item added to your Backlog';
        break;
      case 'check-in-past':
      default:
        checkInText.placeholder = 'What progress did you make?';
        checkInButton.innerText = 'Add to next Check-in';
        checkInSuccess.innerText = 'Item added to your next Check-in';
        break;
    }
  });
}

function sendInteraction(tab) {
  chrome.runtime.sendMessage({ action: 'INTERACTION', tab: tab });
}

function sendCheckIn(type, tab, text) {
  chrome.runtime.sendMessage(
    { action: 'ADD_SNIPPET', snippet_type: type, tab: tab, text: text },
    () => {
      checkInContainer.classList.remove('active');
      checkInSuccess.classList.add('active');
    }
  );
}
