// Creates a suggestion when someone is determined to be working on a doc. This
// is a naively calculated using a time-on-page threshold and at least one
// keypress.
new Monitor()
  .pathMatch(/^\/doc\//)
  .resetOnNav()
  .requireKeypress(5)

  .reason(Reasons.EDITED)
  .past()

  // Paper encodes the documents canonical ID in the Open Graph URL in the form:
  //   https://paper.dropbox.com/doc/Some-Title--[base64id]
  // or sometimes:
  //   https://paper.dropbox.com/doc/[base64id]
  .sourceID(() => {
    let p = document.location.pathname;
    let i = p.indexOf('--');
    if (i !== -1) return p.substr(i + 2);
    else return p.split('/').pop();
  })

  .setProvider('dropbox_paper', 'Dropbox Paper')
  .setType(Types.DOCUMENT)
  .attachment({
    name: () => textContent('.hp-header-title', 'Untitled'),
    html_url: () => document.location.href,
    description: () => '',
  });
