'use strict';

const BLOCK_LIST = { title: [/^chrome:\/\//, /^Range/] };

const GUID_REGEX =
  '({){0,1}[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(}){0,1}';

const MERGE_BEHAVIOR = {
  // Keep all existing fields, fill remaining fields with new values
  KEEP_EXISTING: 'KEEP_EXISTING',
  // Replace existing fields with new attachment fields
  REPLACE_EXISTING: 'REPLACE_EXISTING',
};

// Currently inelegant, but this is a quick way of tracking what new providers
// have been added in a given update.
const NEW_PROVIDERS = [];

var INTEGRATION_STATUSES = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
};

var MESSAGE_TYPES = {
  INTEGRATION_STATUS: 'INTEGRATION_STATUS',
  RELEVANT_HISTORY: 'RELEVANT_HISTORY',
  ALL_FILTERS: 'ALL_FILTERS',
  ENABLED_PROVIDERS: 'ENABLED_PROVIDERS',
  ENABLE_PROVIDER: 'ENABLE_PROVIDER',
  DISABLE_PROVIDER: 'DISABLE_PROVIDER',
  NEW_PROVIDERS: 'NEW_PROVIDERS',
  ACK_NEW_PROVIDERS: 'ACK_NEW_PROVIDERS',
  INTERACTION: 'INTERACTION',
  ADD_SNIPPET: 'ADD_SNIPPET',
  USER_STATS: 'USER_STATS',
  RECENT_ACTIVITY: 'RECENT_ACTIVITY',
  SESSIONS: 'SESSIONS',
  SET_SESSION: 'SET_SESSION',
};

var SNIPPET_TYPES = {
  PAST: 1,
  FUTURE: 2,
  BACKLOG: 4,
};

var USER_ACTIONS = {
  FIRST_LOGIN: 'Extension First Login',
  FIRST_INTERACTION: 'Extension First Interaction Recorded',
  FIRST_SNIPPET: 'Extension First Snippet',
};

var AUTH_STATES = {
  // Not authenticated at all
  NO_AUTH: { value: 'NO_AUTH', badge: 'AUTH' },
  // Currently selected session is no longer authenticated
  NO_SYNC_AUTH: { value: 'NO_SYNC_AUTH', badge: 'AUTH' },
  // Multiple sessions are authenticated but none are selected
  NO_SYNC_SELECTED: { value: 'NO_SYNC_SELECTED', badge: 'SYNC' },
  // Everything is okay
  OK: { value: 'OK', badge: '' },
};
