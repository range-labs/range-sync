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
