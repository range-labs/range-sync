const reEditPage = /^\/file\/([A-Za-z0-9]+)\/.+$/;

new Monitor()
  .pathMatch(reEditPage)
  .resetOnNav()
  .requireDuration(15000)
  .requireClick(3)

  .reason(Reasons.EDITED)
  .past()

  .sourceID(() => reMatch(document.location.pathname, reEditPage, 1))

  .setProvider('figma', 'Figma')
  .setType(Types.DOCUMENT)
  .setSubtype(Subtypes.FIGMA_DOCUMENT)
  .attachment({
    name: () => {
      let parts = document.title.split(' – ');
      parts.pop();
      return parts.join(' – ');
    },
    html_url: () => document.location.href,
  });
