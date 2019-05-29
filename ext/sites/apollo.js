const sequenceEditor = /^#\/sequences\/([a-f0-9]+)\?/;
const taskProcessing = /^#\/tasks\/([a-f0-9]+)\//;

// Creates a suggestion that approximates when someone works on a sequence.
new Monitor('edit monitor')
  .hashMatch(sequenceEditor)
  .resetOnNav()
  .requireDuration(15000)
  .requireClick()
  .requireKeypress()

  .reason(Reasons.EDITED)
  .past()

  .sourceID(() => reMatch(document.location.hash, sequenceEditor, 1))

  .setProvider('apollo', 'Apollo')
  .setType(Types.CAMPAIGN)
  .attachment({
    name: () => {
      let parts = document.title.split(' - ');
      parts.pop();
      return parts.join(' - ');
    },
    html_url: () => document.location.href,
  });

// Creates a suggestion to capture when someone is working through tasks on a
// sequence. This will be de-duped with suggestions created by the above monitor
// by using the same sequence id.
new Monitor('processing monitor')
  .hashMatch(/^#\/tasks\/([a-f0-9]+)\/contacts\//)
  .resetOnNav()
  .requireDuration(10000)
  .requireClick()
  .requireKeypress()

  .reason(Reasons.CHANGED)
  .past()

  .sourceID(() => {
    const el = findSequenceLink();
    return el ? el.href.split('/').pop() : '';
  })

  .setProvider('apollo', 'Apollo')
  .setType(Types.CAMPAIGN)
  .attachment({
    name: () => {
      const el = findSequenceLink();
      return el ? el.innerText : '';
    },
    html_url: () => {
      const el = findSequenceLink();
      return el ? el.href : '';
    },
  });

function findSequenceLink() {
  // The sequence is linked in the UI at #/tasks/{task_id}/sequences/{sequence_id}
  let parts = document.location.hash.split('/');
  parts.length = 3;
  const prefix = parts.join('/') + '/sequences/';
  return document.querySelector(`a[href^="${prefix}"]`);
}
