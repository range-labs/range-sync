'use strict';

/**
 * Workaround for secondary monitors on MacOS where redraws don't happen
 * SO Link: https://stackoverflow.com/questions/56500742/why-is-my-google-chrome-extensions-popup-ui-laggy-on-external-monitors-but-not
 * Bug Link: https://bugs.chromium.org/p/chromium/issues/detail?id=971701
 */
if (
  // From testing the following conditions seem to indicate that the popup was opened on a secondary monitor
  window.screenLeft < 0 ||
  window.screenTop < 0 ||
  window.screenLeft > window.screen.width ||
  window.screenTop > window.screen.height
) {
  chrome.runtime.getPlatformInfo(function (info) {
    if (info.os === 'mac') {
      const fontFaceSheet = new CSSStyleSheet();
      fontFaceSheet.insertRule(`
        @keyframes redraw {
          0% {
            opacity: 1;
          }
          100% {
            opacity: .99;
          }
        }
      `);
      fontFaceSheet.insertRule(`
        html {
          animation: redraw 1s linear infinite;
        }
      `);
      document.adoptedStyleSheets = [...document.adoptedStyleSheets, fontFaceSheet];
    }
  });
}
