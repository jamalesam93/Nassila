export const APP_MENU_COMMANDS = {
  NEW_SESSION: 'new-session',
  IMPORT_REFERENCES: 'import-references',
  EXPORT_BIBLIOGRAPHY: 'export-bibliography',
  EXPORT_CSL_JSON: 'export-csl-json',
  UNDO: 'undo',
  REDO: 'redo',
  CLEAR_CITATIONS: 'clear-citations',
  RUN_AUTOCORRECT: 'run-autocorrect',
  FIND_MISSING_DOIS: 'find-missing-dois',
  VERIFY_ONLINE: 'verify-online',
  DETECT_DUPLICATES: 'detect-duplicates',
  SELECT_STYLE: 'select-style',
  SET_THEME_SYSTEM: 'set-theme-system',
  SET_THEME_LIGHT: 'set-theme-light',
  SET_THEME_DARK: 'set-theme-dark',
  TOGGLE_THEME: 'toggle-theme',
  SHOW_SETTINGS: 'show-settings',
  SHOW_ABOUT: 'show-about',
  SET_LOCALE_EN: 'set-locale-en',
  SET_LOCALE_AR: 'set-locale-ar'
} as const

export type AppMenuCommand = typeof APP_MENU_COMMANDS[keyof typeof APP_MENU_COMMANDS]
