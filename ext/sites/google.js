const reEditPage = /^\/(document|spreadsheets|presentation)\/d\/([A-Za-z0-9-]+)\/edit$/;

// Google doesn't appear to do client side redirects between docs, so we can
// check the product on page load.
const googleType = reMatch(document.location.pathname, reEditPage, 1);

if (googleType === 'document') {
  // Docs uses a special iframe to capture key-presses. We can listen directly
  // on it to detect edits to the main doc.
  googleMonitor()
    .requireKeypress(
      3,
      document.querySelector('iframe.docs-texteventtarget-iframe').contentDocument
    )
    .reason(Reasons.EDITED);

  // Comments occur in a textarea in the main window.
  googleMonitor()
    .requireKeypress(3)
    .reason(Reasons.COMMENTED);
}

if (googleType === 'spreadsheets') {
  // To differentiate comments we'd need to look at event target which would
  // need a reworking of the Monitor API.
  googleMonitor()
    .requireKeypress(3)
    .reason(Reasons.EDITED);
}

if (googleType === 'presentation') {
  // Presentations has a google docs style method of key capture, however it
  // isn't present on page load. Since presentations requires a lot of clicking
  // to edit, use clicks as a simpler proxy for activity.
  googleMonitor()
    .requireClick(5)
    .reason(Reasons.EDITED);
}

function googleMonitor() {
  return new Monitor()
    .pathMatch(reEditPage)
    .resetOnNav()
    .past()
    .sourceID(() => reMatch(document.location.pathname, reEditPage, 2))
    .setProvider('drive', () => {
      switch (googleType) {
        case 'document':
          return 'Google Documents';
        case 'spreadsheets':
          return 'Google Sheets';
        case 'presentation':
          return 'Google Slides';
        default:
          return 'Google Drive';
        // TODO: Support other google types.
      }
    })
    .setType(Types.DOCUMENT)
    .setSubtype(() => {
      switch (googleType) {
        case 'document':
          return Subtypes.GOOGLE_DOCUMENT;
        case 'spreadsheets':
          return Subtypes.GOOGLE_SPREADSHEETS;
        case 'presentation':
          return Subtypes.GOOGLE_PRESENTATION;
        default:
          return Subtypes.GOOGLE_DRIVE;
        // TODO: Support other google types.
      }
    })
    .attachment({
      name: () => textContent('input.docs-title-input', 'Untitled'),
      html_url: () => document.location.href,
    });
}
