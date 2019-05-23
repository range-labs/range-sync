const reEditPage = /^\/p\/([0-9a-f]+)\/edit$/;

// Creates a suggestion when someone edits a medium post. They must make at
// least 10 keystrokes before a suggestion will be made.
new Monitor()
  .pathMatch(reEditPage)
  .resetOnNav()
  .requireKeypress(10)

  .reason(Reasons.EDITED)
  .past()

  // Medium's edit URL always has the ID of the article.
  .sourceID(() => reMatch(document.location.pathname, reEditPage, 1))

  .setProvider('medium', 'Medium')
  .setType(Types.DOCUMENT)
  .attachment({
    name: () => textContent('.graf--title', 'Untitled article'),
    description: () => textContent('.graf--subtitle'),
    html_url: () => document.location.href.replace(/\/edit/, ''),
  });
