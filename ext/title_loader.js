'use strict';

chrome.runtime.sendMessage({ message: 'title', url: document.URL, title: document.title });
