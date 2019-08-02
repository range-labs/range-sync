let _lastFetch = 0;
let _attachments = [];

// Returns an array of attachments that have been suggested via the extension.
function getAttachments() {
  if (Date.now() - _lastFetch < 1000 * 60) {
    return Promise.resolve(_attachments);
  }
  return loadAttachments()
    .then(() => _attachments)
    .catch(e => {
      console.error('Failed to load attachments: ', e);
      return _attachments;
    });
}

// Sort, remove duplicates via source_id, and keep track of only last 100 suggestions.
function cleanAttachments() {
  let seen = {};
  _attachments.forEach(
    a => (a.display_date = a.display_date || a.date_modified || a.date_created || a.created_at)
  );
  _attachments.sort((a, b) => new Date(b.display_date) - new Date(a.display_date));
  _attachments = _attachments.filter(attachment =>
    seen[attachment.source_id] ? false : (seen[attachment.source_id] = 1)
  );
  _attachments.length = Math.min(_attachments.length, 100);
}

function storeAttachments() {
  chrome.storage.local.set({ attachments: _attachments });
}

function loadAttachments() {
  let after = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return orgs()
    .then(slugs => Promise.all(slugs.map(getSession)))
    .then(sessions =>
      Promise.all(
        sessions.map(s => {
          return listAttachments(s.user.user_id, after, authorize(s)).then(resp => {
            console.log(resp);
            resp.attachments.forEach(attachment => _attachments.push(attachment));
          });
        })
      )
    )
    .then(() => {
      cleanAttachments();
      storeAttachments();
      _lastFetch = Date.now();
    });
}

// Background page is ephemeral, so load stored version of attachments.
chrome.storage.local.get('attachments', function(result) {
  _attachments = result.attachments || [];
});

// Listen for suggestion requests from the content scripts.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message !== 'suggestion') {
    console.error('unexpected message:', request);
    return;
  }
  const suggestion = request.suggestion;

  _attachments.push({ display_date: new Date().toISOString(), ...suggestion.attachment });
  cleanAttachments();
  storeAttachments();

  // Look up each account the user is authed as and send a suggestion.
  // TODO: If the user isn't logged-in the suggestion will get dropped. Perhaps
  // we should use `_attachments` to replay recent activity.
  orgs()
    .then(slugs => Promise.all(slugs.map(getSession)))
    .then(sessions =>
      Promise.all(
        sessions.map(s => {
          return addSuggestion(s.user.user_id, suggestion, authorize(s))
            .then(resp => console.log('AddSuggestion: saved'))
            .catch(e => {
              if (e.code === 6) {
                console.log('AddSuggestion: already exists');
                return true;
              }
              console.warn('AddSuggestion: error', e);
              throw e;
            });
        })
      )
    )
    .then(() => sendResponse({ success: true }))
    .catch(e => {
      sendResponse({ success: false, reason: e });
    });
  return true;
});
