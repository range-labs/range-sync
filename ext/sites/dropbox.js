// Creates a suggestion when someone is determined to be working on a doc. This
// is a naively calculated using a time-on-page threshold and at least one
// keypress.
new Monitor()
  .pathMatch(/^\/doc\//)
  .resetOnNav()
  .requireKeypress(5)

  .reason(Reasons.EDITED)
  .past()

  // Paper runs in an iframe and encodes the document's canonical ID in the URL with the form:
  //   https://paper.dropbox.com/doc/Title-Of-Document-[base64id]
  .sourceID(() => {
    let parts = document.location.pathname.split('-');
    return parts[parts.length - 1];
  })

  .setProvider('dropbox_paper', 'Dropbox Paper')
  .setType(Types.DOCUMENT)
  .attachment({
    name: () => textContent('.hp-header-title', 'Untitled'),
    html_url: () => document.querySelector('.hp-sharing-header-copylink').href,
    description: () => '',
  });
