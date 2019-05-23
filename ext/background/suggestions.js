let _recentSuggestions = [];

// Returns an array of recent attachments that have been suggested via the
// extension.
function recentSuggestions() {
  return Promise.resolve(_recentSuggestions);
}

// Background page is ephemeral, so load stored version of suggestions.
chrome.storage.local.get('suggestions', function(result) {
  _recentSuggestions = result.suggestions || [];
});

// Listen for suggestion requests from the content scripts.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.message !== 'suggestion') {
    console.error('unexpected message:', request);
    return;
  }
  const suggestion = request.suggestion;

  _recentSuggestions.unshift({ createdAt: Date.now(), ...suggestion });

  // Remove duplicates via source_id and keep track of last 100 suggestions.
  let seen = {};
  _recentSuggestions = _recentSuggestions.filter(s =>
    seen[s.attachment.source_id] ? false : (seen[s.attachment.source_id] = 1)
  );
  _recentSuggestions.length = Math.min(_recentSuggestions.length, 100);
  chrome.storage.local.set({ suggestions: _recentSuggestions });

  // Look up each account the user is authed as and send a suggestion.
  // TODO: If the user isn't logged-in the suggestion will get dropped. Perhaps
  // we should use `_recentSuggestions` to replay recent activity.
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
