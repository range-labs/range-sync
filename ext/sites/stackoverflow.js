const NEW_POST_TIME_CUTOFF_MSEC = 20 * 1000;

const reUserId = /\/users\/([\d\w]+)/;
const reQuestionPage = /\/questions\/([\d]+)/;

// Only run on question pages
if (reQuestionPage.test(document.location.pathname)) {
  const signatures = postSignatures();
  if (isNewQuestion(signatures)) {
    stackOverflowMonitor().reason(Reasons.CREATED);
  }
  if (isNewAnswer(signatures)) {
    stackOverflowMonitor().reason(Reasons.COMMENTED);
  }
}

function stackOverflowMonitor() {
  return new Monitor()
    .pathMatch(reQuestionPage)
    .past()
    .sourceID(() => reMatch(document.location.pathname, reQuestionPage, 1))
    .setProvider('stackoverflow', 'Stack Overflow')
    .setType(Types.DOCUMENT)
    .setSubtype(Subtypes.NONE) // TODO: Should we add a sub-type for "Question"?
    .attachment({
      name: () => {
        return document.title.split(' - ')[0];
      },
      html_url: () => document.location.href,
    });
}

// Returns a parsed array of post signatures.
// The first post is the original question, the rest are answers.
// Each post includes: isByCurrentUser and isNew
function postSignatures() {
  var sigs = [];
  // Find the Current UserID from
  const profile = document.querySelector('.my-profile');
  const currentUser = reMatch(profile.pathname, reUserId, 1);
  // Inspect all the question/answer signatures on the page
  const sigEls = document.querySelectorAll('.post-signature');
  for (var i = 0; i < sigEls.length; i++) {
    const userEl = sigEls[i].querySelector('.user-details a');
    const timeEl = sigEls[i].querySelector('.user-action-time span');
    if (!userEl || !userEl.pathname || !timeEl || !timeEl.title) continue;
    const isNew = new Date() - new Date(timeEl.title) < NEW_POST_TIME_CUTOFF_MSEC;
    const user = reMatch(userEl.pathname, reUserId, 1);
    sigs.push({
      isByCurrentUser: currentUser == user,
      isNew: isNew,
    });
  }
  return sigs;
}

// Returns true if this question is new, and created by the current user.
function isNewQuestion(sigs) {
  if (sigs.length == 0) return false;
  if (!sigs[0].isByCurrentUser) return false;
  if (!sigs[0].isNew) return false;
  return true;
}

// Returns true if this question has new answers by the current user.
function isNewAnswer(sigs) {
  if (sigs.length <= 1) return false;
  for (var i = 1; i < sigs.length; i++) {
    if (sigs[i].isByCurrentUser && sigs[i].isNew) return true;
  }
  return false;
}
