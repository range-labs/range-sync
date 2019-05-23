// Creates a suggestion when someone is determined to be working on a doc. This
// is a naively calculated using a time-on-page threshold and at least one
// keypress.
new Monitor()
  .pathMatch(/^\/doc\//)
  .resetOnNav()
  .requireKeypress(10)

  .reason(Reasons.EDITED)
  .past()

  // Paper encodes the documents canonical ID in the Open Graph URL in the form:
  //   https://paper.dropbox.com/doc/Some-Title--[base64id]
  // or sometimes:
  //   https://paper.dropbox.com/doc/[base64id]
  .sourceID(() => {
    let url = openGraph('og:url');
    let i = url.indexOf('--');
    if (i !== -1) return url.substr(i + 2);
    else return url.split('/').pop();
  })

  .setProvider('dropbox_paper', 'Dropbox Paper')
  .setType(Types.DOCUMENT)
  .attachment({
    name: () => openGraph('og:title'),
    html_url: () => openGraph('og:url'),
    description: () => openGraph('og:description'),
  });
