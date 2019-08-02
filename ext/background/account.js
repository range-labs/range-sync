// Returns minimal information about the account(s) a user is logged into Range
// as. Intended for displaying UI.
function getAccounts() {
  return orgs()
    .then(slugs => Promise.all(slugs.map(getSession)))
    .then(sessions =>
      sessions.map(s => ({
        userID: s.user.user_id,
        name: s.user.profile.full_name,
        email: s.user.profile.email,
        profilePhoto: `https://range.imgix.net${
          s.user.profile.profile_photo
        }?fit=crop&crop=faces&w=150&h=150&dpr=2&q=40&sharp=20`,
        orgID: s.org.org_id,
        orgName: s.org.name,
        orgSlug: s.org.slug,
      }))
    );
}
