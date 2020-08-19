'use strict';

const histNode = document.getElementById('history');

chrome.storage.sync.get('history', (results) => {
  const history = results.history;

  for (const item of history) {
    console.log(item.title);
    const itemTitle = document.createElement('p');
    itemTitle.appendChild(document.createTextNode(item.title));
    histNode.appendChild(itemTitle);
    const itemUrl = document.createElement('p');
    itemUrl.appendChild(document.createTextNode(item.url));
    histNode.appendChild(itemUrl);
  }
});
