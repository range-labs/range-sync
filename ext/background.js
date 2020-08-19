'use strict';

const QUEUE_LIMIT = 25;

chrome.history.search({ text: '', maxResults: QUEUE_LIMIT }, (items) => {
  const seen = {};
  const history = [];
  for (const i of items) {
    if (!!seen[i.url]) continue;
    seen[i.url] = 1;
    history.push(i);
  }
  chrome.storage.sync.set({ history, seen }, console.log);
});

chrome.history.onVisited.addListener((item) => {
  chrome.storage.sync.get(['history', 'seen'], (results) => {
    const history = results.history;
    const seen = results.seen;

    if (!!seen[item.url]) return;
    seen[item.url] = 1;
    if (history.push(item) > QUEUE_LIMIT) history.shift();

    chrome.storage.sync.set({ history, seen }, console.log);
  });
});

chrome.runtime.onMessage.addListener((data) => {
  chrome.storage.sync.get(['history', 'seen'], (results) => {
    const history = results.history;
    const seen = results.seen;

    if (!seen[data.url]) return;

    const idx = history.findIndex((e) => e.url == data.url);
    if (!history[idx].title) {
      history[idx].title = data.title;
      chrome.storage.sync.set({ history }, console.log);
    }
  });
});
