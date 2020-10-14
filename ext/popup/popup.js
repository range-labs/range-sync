'use strict';

const SNIPPET_TYPES = {
  'check-in-past': 'PAST',
  'check-in-future': 'FUTURE',
  'check-in-backlog': 'BACKLOG',
};

// These are also used in background.js. Be sure to update there as well!
const MESSAGE_TYPES = {
  IS_AUTHENTICATED: 'IS_AUTHENTICATED',
  INTERACTION: 'INTERACTION',
  ADD_SNIPPET: 'ADD_SNIPPET',
  USER_STATS: 'USER_STATS',
};

const accordions = document.getElementsByClassName('accordion');
const checkInContainer = document.getElementById('check-in-container');
const checkInSuccess = document.getElementById('check-in-success');
const checkInTypes = document.getElementsByClassName('check-in-type');
const checkInText = document.getElementById('check-in-text');
const addToCheckInButton = document.getElementById('add-to-check-in-button');
const attachmentTitle = document.getElementById('attachment-title');
const attachmentSubtitle = document.getElementById('attachment-subtitle');
const attachmentIcon = document.getElementById('attachment-icon');
const checkInLogo = document.getElementById('check-in-logo');
const checkInTime = document.getElementById('check-in-time');
const checkInButton = document.getElementById('check-in-button');
const viewCheckInButton = document.getElementById('view-check-in-button');

function currentCheckInType() {
  for (const t of checkInTypes) {
    if (t.classList.contains('active')) {
      return SNIPPET_TYPES[t.id];
    }
  }

  return SNIPPET_TYPES['check-in-past'];
}

chrome.runtime.sendMessage({ action: MESSAGE_TYPES.USER_STATS }, (resp) => {
  const userId = resp.user_id;
  const updateCount = resp.update_count;
  const lastUpdate = moment(resp.last_update_at);
  const dayDiff = lastUpdate.diff(moment(), 'days');

  checkInTime.className = '';
  if (updateCount < 1) {
    checkInLogo.src = '/images/check-in-yesterday.png';
    checkInTime.classList.add('check-in-yesterday');
    checkInTime.innerText = 'Share your first Check-in!';
    checkInButton.classList.add('active');
  } else if (dayDiff < 1) {
    checkInLogo.src = '/images/check-in-today.png';
    checkInTime.classList.add('check-in-today');
    checkInTime.innerText = 'Checked in today';
    checkInButton.classList.remove('active');
    viewCheckInButton.classList.add('active');
    viewCheckInButton.href = `https://range.co/_/checkins?user=${userId}`;
  } else if (dayDiff == 1) {
    checkInLogo.src = '/images/check-in-yesterday.png';
    checkInTime.classList.add('check-in-yesterday');
    checkInTime.innerText = 'Last Check-in: Yesterday';
    checkInButton.classList.add('active');
  } else if (lastUpdate.isSame(moment(), 'week')) {
    checkInLogo.src = '/images/check-in-long.png';
    checkInTime.classList.add('check-in-long');
    checkInTime.innerText = `Last Check-in: ${lastUpdate.format('dddd')}`;
    checkInButton.classList.add('active');
  } else {
    checkInLogo.src = '/images/check-in-long.png';
    checkInTime.classList.add('check-in-long');
    checkInTime.innerText = `Last Check-in: ${dayDiff} days ago`;
    checkInButton.classList.add('active');
  }
});

chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  const currentTab = tabs[0];

  addToCheckInButton.onclick = () => {
    sendInteraction(currentTab);
    sendSnippet(currentCheckInType(), currentTab, checkInText.value);
  };

  const tabUrl = new URL(currentTab.url);
  attachmentTitle.innerText = currentTab.title;
  attachmentSubtitle.innerText = `${tabUrl.hostname} - Viewed`;
  if (!!currentTab.favIconUrl) {
    attachmentIcon.src = currentTab.favIconUrl;
  } else {
    attachmentIcon.src = `chrome://favicon/size/24/${tabUrl.href.split('?')[0]}`;
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
      case 'check-in-future':
        checkInText.placeholder = 'What do you want to accomplish?';
        addToCheckInButton.innerText = 'Add to next Check-in';
        checkInSuccess.innerText = 'Item added to your next Check-in';
        break;
      case 'check-in-backlog':
        checkInText.placeholder = 'Why is this going to the backlog?';
        addToCheckInButton.innerText = 'Add to Backlog';
        checkInSuccess.innerText = 'Item added to your Backlog';
        break;
      case 'check-in-past':
      default:
        checkInText.placeholder = 'What progress did you make?';
        addToCheckInButton.innerText = 'Add to next Check-in';
        checkInSuccess.innerText = 'Item added to your next Check-in';
        break;
    }
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
