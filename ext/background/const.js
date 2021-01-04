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

var INTEGRATION_STATUSES = {
  ENABLED: 'ENABLED',
  DISABLED: 'DISABLED',
  NOT_IMPLEMENTED: 'NOT_IMPLEMENTED',
};

var MESSAGE_TYPES = {
  IS_AUTHENTICATED: 'IS_AUTHENTICATED',
  INTEGRATION_STATUS: 'INTEGRATION_STATUS',
  RELEVANT_HISTORY: 'RELEVANT_HISTORY',
  ALL_FILTERS: 'ALL_FILTERS',
  ENABLED_PROVIDERS: 'ENABLED_PROVIDERS',
  ENABLE_PROVIDER: 'ENABLE_PROVIDER',
  DISABLE_PROVIDER: 'DISABLE_PROVIDER',
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
  FIRST_LOGIN: 'extension_first_login',
  FIRST_INTERACTION: 'extension_first_interaction_recorded',
  FIRST_SNIPPET: 'extension_first_snippet',
};
