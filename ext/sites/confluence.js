const wikiURL = /^\/wiki\/spaces\/([A-Z]+)\/pages\/edit(?:-v2)?\/([0-9]+)$/;

// Creates a suggestion when someone edits a confluence article. They must be on
// the page for at least 15s and issue at least one key press.
new Monitor()
  .pathMatch(wikiURL)
  .resetOnNav()
  .requireKeypress(10)

  .reason(Reasons.EDITED)
  .past()

  // Confluence's edit page has space and the ID of the article.
  .sourceID(() => {
    const m = wikiURL.exec(document.location.pathname);
    return m ? m[1] + '-' + m[2] : '';
  })

  .setProvider('confluence', 'Confluence')
  .setType(Types.DOCUMENT)
  .attachment({
    name: () => textContent('textarea[data-test-id="editor-title"]', 'Untitled article'),
    html_url: () => {
      const m = wikiURL.exec(document.location.pathname);
      if (!m) return '';
      const host = document.location.host;
      return `https://${host}/wiki/spaces/${m[1]}/pages/${m[2]}`;
    },
  });
