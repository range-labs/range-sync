![Range Logo](./img/range-arch.png)

# Contributing Guidelines

Our intent in making this repository open source is two fold:

1. To engender trust that the extension isn't doing anything untoward.
2. To improve the extension, such that it can support more services and sites.

When contributing to this repository, please first discuss the change in a GitHub issue. This will
help us steer you in the right direction and avoid duplicate work.

When submitting a change for review, please use our
[Pull Request Template](./pull_request_template.md) and fill out the appropriate sections with as
much detail as possible.

Also, please note we have a [code of conduct](./code_of_conduct.md), please follow it in all your
interactions with the project.

### New Services

Before adding a new service to the publicly distributed version of this extension, we want to ensure
that there is enough community/customer demand. First file an issue with the subject such as
`Add support for [your favorite tool]` to begin a discussion.

You are of course free to fork this repo and install an unpacked version while waiting for an
official build.

### Helpful Tips

#### Getting started

Please refer to [Google's documentation](https://developer.chrome.com/extensions/getstarted) on how
to build, develop, and test Chrome extensions locally.

#### Adding support for a new service

1. Create `ext/sites/some-service.js`.
2. Configure a `Monitor` instance, as per other examples in the same directory.
3. Update the manifest to include a content script that matches `some-service.com`

#### Attachment fields

Suggestions reference an attachment. Attachments are shared across users in an organization and
contain metadata about an artifact on another services. The Source ID is used to determine
uniqueness.

For example, if I edit a doc and you comment on a doc, they should both reference the same
attachment but with different "reasons". But pull request #101 in acme-corp/widgets should be
disambiguated from PR #101 in acme-corp/marketing-site.

An attachment can represent multiple types, and there optional properties associated with certain types.

All date fields should be in UTC ISO8601 (`2006-01-02T15:04:05.999Z1`) as compatible with
JavaScript's `toISOString()`. If you use JavaScript `Date` objects in the suggestion payload,
`JSON.stringify` will be used to serialize them correctly.

##### Core fields:

```
name         name for the suggestion, a file name, pull request title, or event name.
html_url     URL to link to for people to access the attachment.
description  (optional) descriptive text for the attachment. Limited to 255 chars.
```

##### Parent references:

```
parent_name         name for the parent, e.g. a folder, project, repo
parent_html_url     URL to link people to access the parent
parent_description  (optional) description for the parent
```

##### Type: `FILE`

```
date_created
date_modified
file_format    file extension, e.g. jpg, png, zip
file_type      user visible description of the file, e.g. "Figma Drawing"
```

##### Type: `EVENT`

```
start_date     (optional)
end_date       (optional)
location       (optional)
num_attendees  (optional)
session_identifier
```

##### Type: `CODE_CHANGE`

```
change_id     string used when displaying the change
change_label  prefix used when displaying change id. e.g. PR #123, cl/123
change_state  e.g. merged, opened, closed
```

##### Type: `ISSUE`

```
issue_id     string used when displaying the issue
issue_state  e.g. opened, closed, duplicate
issue_label  prefix used when displaying issue ids. e.g. Issue #455 , b/455
date_opened  (optional)
date_closed  (optional)
```

##### Type: `TASK`

```
task_state      e.g. opened, closed, complete, done
date_completed  (optional)
```

##### Additional Types

The following types don't have any additional properties:

```
LINK
CAMPAIGN
PROJECT
```
