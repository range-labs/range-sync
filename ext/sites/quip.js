const reEditPage = /^\/([A-Za-z0-9]+)\/[^\\]+$/;

// Creates a suggestion when someone edits a quip document.
new Monitor()
  .pathMatch(reEditPage)
  .resetOnNav()
  .requireKeypress(4)

  .reason(Reasons.EDITED)
  .past()

  .sourceID(() => reMatch(document.location.pathname, reEditPage, 1))

  .setProvider('quip', 'Quip')
  .setType(Types.DOCUMENT)
  .attachment({
    name: () => textContent('.nav-path-title', 'Untitled article'),
    html_url: () => document.location.href,
  });
