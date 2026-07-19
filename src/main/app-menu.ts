import { BrowserWindow, Menu, shell, type MenuItemConstructorOptions } from 'electron'
import { APP_MENU_COMMANDS, type AppMenuCommand } from '../shared/app-menu-commands'
import { NASSILA_GITHUB_ISSUES, NASSILA_WEBSITE_DOCS_BASE } from '../shared/nassila-project'
import { type MainMenuLocale, mainMenuLabels } from './menu-i18n'

/** Last UI locale used to build the app menu (for new windows without an explicit locale). */
let currentMenuLocale: MainMenuLocale = 'en'

function sendCommand(window: BrowserWindow, command: AppMenuCommand): void {
  const target = BrowserWindow.getFocusedWindow() ?? window
  if (!target.isDestroyed()) {
    target.webContents.send('menu:command', command)
  }
}

export function buildAppMenu(window: BrowserWindow, locale?: MainMenuLocale): void {
  if (locale) {
    currentMenuLocale = locale
  }
  const loc = currentMenuLocale
  const m = mainMenuLabels(loc)
  const command = (id: AppMenuCommand) => () => sendCommand(window, id)

  const template: MenuItemConstructorOptions[] = [
    {
      label: m.file,
      submenu: [
        { label: m.newSession, accelerator: 'CmdOrCtrl+N', click: command(APP_MENU_COMMANDS.NEW_SESSION) },
        {
          label: m.openProject,
          accelerator: 'CmdOrCtrl+O',
          click: command(APP_MENU_COMMANDS.OPEN_PROJECT)
        },
        {
          label: m.saveProject,
          accelerator: 'CmdOrCtrl+S',
          click: command(APP_MENU_COMMANDS.SAVE_PROJECT)
        },
        { type: 'separator' },
        {
          label: m.importReferences,
          accelerator: 'CmdOrCtrl+I',
          click: command(APP_MENU_COMMANDS.IMPORT_REFERENCES)
        },
        { type: 'separator' },
        {
          label: m.exportBibliography,
          accelerator: 'CmdOrCtrl+E',
          click: command(APP_MENU_COMMANDS.EXPORT_BIBLIOGRAPHY)
        },
        {
          label: m.exportCslJson,
          accelerator: 'CmdOrCtrl+Shift+E',
          click: command(APP_MENU_COMMANDS.EXPORT_CSL_JSON)
        },
        { type: 'separator' },
        process.platform === 'darwin' ? { role: 'close' } : { role: 'quit' }
      ]
    },
    {
      label: m.edit,
      submenu: [
        { label: m.undo, accelerator: 'CmdOrCtrl+Z', click: command(APP_MENU_COMMANDS.UNDO) },
        { label: m.redo, accelerator: 'CmdOrCtrl+Shift+Z', click: command(APP_MENU_COMMANDS.REDO) },
        { type: 'separator' },
        { role: 'cut', label: m.cut },
        { role: 'copy', label: m.copy },
        { role: 'paste', label: m.paste },
        { role: 'selectAll', label: m.selectAll },
        { type: 'separator' },
        {
          label: m.clearAllCitations,
          accelerator: 'CmdOrCtrl+Backspace',
          click: command(APP_MENU_COMMANDS.CLEAR_CITATIONS)
        }
      ]
    },
    {
      label: m.references,
      submenu: [
        {
          label: m.runAutocorrect,
          accelerator: 'CmdOrCtrl+Shift+A',
          click: command(APP_MENU_COMMANDS.RUN_AUTOCORRECT)
        },
        {
          label: m.findMissingDois,
          accelerator: 'CmdOrCtrl+Shift+D',
          click: command(APP_MENU_COMMANDS.FIND_MISSING_DOIS)
        },
        {
          label: m.verifyOnline,
          accelerator: 'CmdOrCtrl+Shift+V',
          click: command(APP_MENU_COMMANDS.VERIFY_ONLINE)
        },
        {
          label: m.detectDuplicates,
          accelerator: 'CmdOrCtrl+Shift+U',
          click: command(APP_MENU_COMMANDS.DETECT_DUPLICATES)
        },
        { type: 'separator' },
        {
          label: m.selectCitationStyle,
          accelerator: 'CmdOrCtrl+Shift+S',
          click: command(APP_MENU_COMMANDS.SELECT_STYLE)
        },
        { type: 'separator' },
        {
          label: m.settings,
          click: command(APP_MENU_COMMANDS.SHOW_SETTINGS)
        }
      ]
    },
    {
      label: m.view,
      submenu: [
        {
          label: m.language,
          submenu: [
            { label: m.english, click: command(APP_MENU_COMMANDS.SET_LOCALE_EN) },
            { label: m.arabicUi, click: command(APP_MENU_COMMANDS.SET_LOCALE_AR) }
          ]
        },
        {
          label: m.theme,
          submenu: [
            { label: m.themeSystem, click: command(APP_MENU_COMMANDS.SET_THEME_SYSTEM) },
            { label: m.themeLight, click: command(APP_MENU_COMMANDS.SET_THEME_LIGHT) },
            { label: m.themeDark, click: command(APP_MENU_COMMANDS.SET_THEME_DARK) },
            { label: m.toggleTheme, accelerator: 'CmdOrCtrl+Shift+T', click: command(APP_MENU_COMMANDS.TOGGLE_THEME) }
          ]
        },
        { type: 'separator' },
        { role: 'reload', label: m.reload },
        { role: 'forceReload', label: m.forceReload },
        { type: 'separator' },
        { role: 'resetZoom', label: m.resetZoom },
        { role: 'zoomIn', label: m.zoomIn },
        { role: 'zoomOut', label: m.zoomOut },
        { role: 'togglefullscreen', label: m.toggleFullscreen }
      ]
    },
    {
      label: m.window,
      submenu: [
        { role: 'minimize', label: m.minimize },
        { role: 'zoom', label: m.zoom },
        { type: 'separator' },
        { type: 'checkbox', label: m.alwaysOnTop, click: (item) => window.setAlwaysOnTop(item.checked) },
        { type: 'separator' },
        { role: 'close', label: m.close }
      ]
    },
    {
      label: m.help,
      submenu: [
        {
          label: m.helpExternalGroup,
          submenu: [
            {
              label: m.nassilaDocs,
              click: () => {
                const docsPath = loc === 'ar' ? '/ar/docs' : '/docs'
                void shell.openExternal(`${NASSILA_WEBSITE_DOCS_BASE}${docsPath}`)
              }
            },
            {
              label: m.cslDocs,
              click: () => shell.openExternal('https://docs.citationstyles.org/')
            },
            {
              label: m.cslRepo,
              click: () => shell.openExternal('https://github.com/citation-style-language/styles')
            },
            {
              label: m.reportIssue,
              click: () => shell.openExternal(NASSILA_GITHUB_ISSUES)
            }
          ]
        },
        { type: 'separator' },
        {
          label: m.about,
          click: command(APP_MENU_COMMANDS.SHOW_ABOUT)
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
