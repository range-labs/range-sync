// Reasons describe the action that promoted the suggestion to be created.
// corresponds to SuggestionReason in snippets.proto.
const Reasons = {
  UNSET: 0,
  ADDED: 1,
  EDITED: 2,
  COMMENTED: 3,
  CLOSED: 4,
  CREATED: 5,
  OPENED: 6,
  STATUS_UPDATED: 7,
  REVIEWED: 8,
  RESOLVED: 9,
  MERGED: 10,
  COMPLETED: 11,
  ASSIGNED: 12,
  ATTENDED: 13,
  CHANGED: 14,
  SUBMITTED: 15,
};

// Types of attachment/artifact that Range understands. Try and fit within the
// current ontology. File a ticket to discuss new types.
const Types = {
  // File is used for a file (upload to dropbox, etc.)
  FILE: 1,
  // Document is used for a spreadsheet, document, etc.
  DOCUMENT: 2,
  // Event is used for an event such as a Calendar event
  EVENT: 3,
  // Code Change is used on code changes (Pull request, issues, etc)
  CODE_CHANGE: 4,
  // Issue is used on bug tracking software
  ISSUE: 5,
  // Task is a task that can be completed
  TASK: 6,
  // Meeting is used for a Range meeting with notes.
  MEETING: 7,
  // Campaign is used for email campaigns, intercom campaigns, or apollo sequences.
  CAMPAIGN: 8,
  // Project captures the container of tasks and may include administrative work.
  PROJECT: 9,
};

// For types.FILE, more specific subtypes.
const Subtypes = {
  NONE: 'NONE',
  GOOGLE_DOCUMENT: 'GOOGLE_DOCUMENT',
  GOOGLE_DRIVE: 'GOOGLE_DRIVE',
  GOOGLE_FORMS: 'GOOGLE_FORMS',
  GOOGLE_PRESENTATION: 'GOOGLE_PRESENTATION',
  GOOGLE_SPREADSHEET: 'GOOGLE_SPREADSHEET',
  MICROSOFT_WORD: 'MICROSOFT_WORD',
  MICROSOFT_POWERPOINT: 'MICROSOFT_POWERPOINT',
  MICROSOFT_EXCEL: 'MICROSOFT_EXCEL',
  DROPBOX_FILE: 'DROPBOX_FILE',
  PDF: 'PDF',
  IMAGE: 'IMAGE',
  CODE: 'CODE',
  VIDEO: 'VIDEO',
  FIGMA_DOCUMENT: 'FIGMA_DOCUMENT',
};

// Reads an open graph property, if present in the document.
// Example usage:
//     openGraph('og:title')
function openGraph(property) {
  const el = document.querySelector('meta[property="' + property + '"]');
  return el ? el.content : '';
}

// Reads the text content of a DOM node, identified by the given CSS selector.
// Example usage:
//     textContent('h1.title > span')
function textContent(selector, opt_defaultText) {
  const el = document.querySelector(selector);
  return (el && (el.textContent || el.value)) || opt_defaultText || '';
}

// Convenience for calling a regular expression on a string and returning the
// Nth group.
// Example usage:
//    reMatch('hello world', /(.+) (.+)/, 2)
//    > "world"
function reMatch(str, re, group) {
  const matches = re.exec(str);
  return matches ? matches[group] : '';
}

// Monitor is used to configure a site specific monitor for generating
// suggestions. Each of the fields can be set to absolute values or a lambda
// function that will be resolved when a suggestion is created.
class Monitor {
  constructor(name) {
    this._name = name || 'monitor';
    this._suggestion = null;
    this._clickCounter = 0;
    this._keypressCounter = 0;

    // Configuration for how the monitor should behave.
    this._resetOnNav = false;
    this._path = /.*/;
    this._hash = /.*/;
    this._requirements = [];

    // The below fields are related to the suggestion and attachment. They can
    // be a literal or a lambda, which will be evaluated when used.
    this._reason = Reasons.UNSET;
    this._snippetType = 1;
    this._sourceID = Date.now() + ':' + Math.random();
    this._type = Types.FILE;
    this._subtype = null;
    this._provider = 'EXTENSION';
    this._providerName = 'Chrome Extension';
    this._att = null;

    setInterval(() => this._pulse(), 2000);
    this._reset();
    this._log('initialized...');
  }

  // Only generate suggestion if the current path matches this regular expression.
  pathMatch(re) {
    this._path = re;
    return this;
  }

  // Only generate suggestion if the current hash fragment matches this regular expression.
  hashMatch(re) {
    this._hash = re;
    return this;
  }

  // For single-page apps, resets the monitor if the history state changes.
  resetOnNav() {
    window.addEventListener('popstate', () => {
      this._log('popstate fired');
      this._reset;
    });
    this._resetOnNav = true;
    return this;
  }

  // Adds a requirement that the user must click at least 'n' times before a
  // suggestion will be made.
  requireClick(n = 1, target = window) {
    let counter = 0;
    target.addEventListener(
      'click',
      e => {
        counter++;
        this._log('click', counter, _elName(e.target));
      },
      true
    );
    this._requirements.push(() => (counter < n ? 'click required' : null));
    return this;
  }

  // Adds a requirement that the user must type at least 'n' characters before a
  // suggestion will be made.
  requireKeypress(n = 1, target = window) {
    let counter = 0;
    target.addEventListener(
      'keypress',
      e => {
        counter++;
        this._log('keypress', counter, _elName(e.target));
      },
      true
    );
    this._requirements.push(() => (counter < n ? 'keypress required' : null));
    return this;
  }

  // Require that the user scrolls at least this many pixels. Note, will only
  // work on pages with native scrolling. Web apps that require this
  // functionality will need custom logic.
  requiredScroll(distance) {
    this._requirements.push(() =>
      window.pageYOffset < distance ? 'more scrolling required' : null
    );
    return this;
  }

  // Require at least this much time on the page before generating a suggestion.
  requireDuration(durationMs) {
    this._requirements.push(() => {
      const age = Date.now() - this._pageStart;
      return age < durationMs ? `page too young ${Math.round(age / 1000)}s` : null;
    });
    return this;
  }

  // Suggestion setting: the reason the suggestion is being presented. See `Reasons`.
  reason(reason) {
    this._reason = reason;
    return this;
  }

  // Suggestion setting: the suggestion is shown in "what's happened"
  past() {
    this._snippetType = 1;
    return this;
  }

  // Suggestion setting: the suggestion is added to your plan.
  plan() {
    this._snippetType = 2;
    return this;
  }

  // Attachment: unique identifier that corresponds with the attachment included
  // in the suggestion.
  sourceID(val) {
    this._sourceID = val;
    return this;
  }

  // Attachment: the type of attachment, defaults to FILE. See `Types`.
  setType(val) {
    this._type = val;
    return this;
  }

  // Attachment: for file attachments, a subtype. See `Subtypes`.
  setSubtype(val) {
    this._subtype = val;
    return this;
  }

  // Attachment: information about the service provider. `id` should be a string
  // and must correspond with a known provider on the Range backend. `name` is
  // a user visible descriptor for the provider.
  setProvider(id, name) {
    this._provider = id;
    this._providerName = name;
    return this;
  }

  // Defines the attachment meta data that will accompany a suggestion. The
  // provided object should look contain the appropriate attachment fields,
  // values can be literals or a lambda which resolves the values at runtime.
  attachment(att) {
    this._att = att;
    return this;
  }

  //----------------------------------------------------------------------------

  _pulse() {
    // If the location changes and the monitor is configured to expect client
    // side navigations, reset all the internal state.
    if (this._resetOnNav && document.location.href !== this._currentHref) {
      this._log('location changed');
      this._reset();
      return;
    }

    // If the user isn't on a page that this monitor cares about, exit.
    if (!this._path.test(document.location.pathname)) return;
    if (!this._hash.test(document.location.hash)) return;

    // If a suggestion has already been made, see if we should update it.
    // NOTE: the endpoint will return a 409 but the attachment will be upserted.
    if (this._suggestion !== null) {
      this._checkForUpdate();
      return;
    }

    // Execute each of the requirement functions. Exit if any aren't met.
    for (let i = 0; i < this._requirements.length; i++) {
      let conditionMismatch = this._requirements[i]();
      if (conditionMismatch !== null) {
        this._log(conditionMismatch);
        return;
      }
    }

    this._log('suggestion eligible');
    this._send(this._createSuggestion());
  }

  _reset() {
    this._pageStart = Date.now();
    this._currentHref = document.location.href;
    this._suggestion = null;
  }

  _send(suggestion) {
    if (!suggestion) return;
    this._log('making suggestion', suggestion);
    chrome.runtime.sendMessage(
      {
        message: 'suggestion',
        suggestion,
      },
      resp => {
        if (resp.success) {
          this._log('suggestion made!');
          this._suggestion = suggestion;
        } else {
          this._log('suggestion failed, resetting', resp.reason);
          this._reset(); // TODO: may not want a full reset?
        }
      }
    );
  }

  _checkForUpdate() {
    let previous = this._suggestion;
    let latest = this._createSuggestion();
    if (previous.attachment.source_id !== latest.attachment.source_id) {
      // This implies a developer error and could lead to a lot of suggestions
      // being created accidentally. If we expect a completely different
      // suggestion then _reset should have been called and the requirements
      // met anew.
      console.error('Mismatched source_id, monitor should have been _reset()');
      return;
    }
    if (JSON.stringify(latest) !== JSON.stringify(previous)) {
      this._log('suggestion metadata changed');
      this._send(latest);
    }
  }

  _createSuggestion() {
    if (!this._att) {
      console.error("Monitor.attachment hasn't been called");
      return;
    }
    const sourceID = resolve(this._sourceID);
    if (!sourceID) {
      this._log('unable to determine sourceID');
      return;
    }
    let attachment = {};
    for (let k in this._att) {
      // TODO: Validate fields to avoid developer error.
      attachment[k] = resolve(this._att[k]);
    }
    return {
      reason: resolve(this._reason),
      snippet_type: resolve(this._snippetType),
      dedupe_strategy: 'UPSERT_PENDING',
      attachment: {
        source_id: sourceID,
        provider: resolve(this._provider),
        provider_name: resolve(this._providerName),
        type: resolve(this._type),
        subtype: resolve(this._subtype),
        ...attachment,
      },
    };
  }

  _log(msg, ...args) {
    args.unshift(`${this._name}: ${msg}`);
    console.debug.apply(console, args);
  }
}

function resolve(val) {
  if (typeof val === 'function') return val();
  else return val;
}

function _elName(el) {
  return el.constructor.name + (el.className ? '.' + el.className : '');
}
