// Copyright 2018 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

'use strict';

const recordInteraction = document.getElementById('recordInteraction');

recordInteraction.onclick = (_) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.runtime.sendMessage({ action: 'INTERACTION', tab: tabs[0] });
  });
};
