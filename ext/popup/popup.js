'use strict';

// fastdom is used to avoid layout thrashing
const pFastdom = fastdom.extend(fastdomPromised);

pFastdom.measure(() => {
  const record = document.getElementById('record');
  record.onclick = (_) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      chrome.runtime.sendMessage({ action: 'INTERACTION', tab: tabs[0] });
    });
  };
});

chrome.storage.local.get(['sessions'], (r) => {
  // If the user is not authenticated with Range, show login button
  if (!r || !r.sessions || Object.keys(r.sessions).length < 1) {
    pFastdom.measure(() => {
      const unauthElements = document.getElementsByClassName('unauthenticated');

      pFastdom.mutate(() => {
        for (const e of unauthElements) {
          e.style.display = 'flex';
        }
      });
    });
    return;
  }

  // If authentication has been confirmed, show accordion
  pFastdom.measure(() => {
    const authElements = document.getElementsByClassName('authenticated');

    pFastdom.mutate(() => {
      for (const e of authElements) {
        e.style.display = 'block';
      }

      pFastdom.measure(() => {
        const accordions = document.getElementsByClassName('accordion');
        const panels = document.getElementsByClassName('panel');

        const clearPanels = () => {
          for (const p of panels) {
            p.style.display = 'none';
          }
        };

        const clearAccordions = () => {
          for (const o of accordions) {
            o.classList.remove('active');
          }
        };

        for (const a of accordions) {
          const setActive = () => {
            a.classList.add('active');
            a.nextElementSibling.style.display = 'flex';
          };

          a.addEventListener('click', () => {
            const currentlyActive = a.classList.contains('active');

            pFastdom
              // Wipe the current state
              .mutate(() => {
                clearPanels();
                clearAccordions();
              })
              .then(() => {
                // Only reactivate the single, active accordion
                if (!currentlyActive) {
                  pFastdom.mutate(setActive);
                }
              });
          });
        }
      });
    });
  });
});
