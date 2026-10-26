export type MainMenuLocale = 'en' | 'ar'

type MenuLabelSet = {
  file: string
  edit: string
  references: string
  view: string
  window: string
  help: string
  newSession: string
  openProject: string
  saveProject: string
  importReferences: string
  exportBibliography: string
  exportCslJson: string
  undo: string
  redo: string
  clearAllCitations: string
  runAutocorrect: string
  findMissingDois: string
  verifyOnline: string
  detectDuplicates: string
  selectCitationStyle: string
  settings: string
  language: string
  english: string
  arabicUi: string
  theme: string
  themeSystem: string
  themeLight: string
  themeDark: string
  toggleTheme: string
  alwaysOnTop: string
  helpExternalGroup: string
  nassilaDocs: string
  cslDocs: string
  cslRepo: string
  reportIssue: string
  about: string
  cut: string
  copy: string
  paste: string
  selectAll: string
  minimize: string
  zoom: string
  close: string
  reload: string
  forceReload: string
  resetZoom: string
  zoomIn: string
  zoomOut: string
  toggleFullscreen: string
}

const EN: MenuLabelSet = {
  file: 'File',
  edit: 'Edit',
  references: 'References',
  view: 'View',
  window: 'Window',
  help: 'Help',
  newSession: 'New Session',
  openProject: 'Open Project…',
  saveProject: 'Save Project…',
  importReferences: 'Import References...',
  exportBibliography: 'Export Bibliography...',
  exportCslJson: 'Export CSL JSON...',
  undo: 'Undo',
  redo: 'Redo',
  clearAllCitations: 'Clear All Citations',
  runAutocorrect: 'Run Autocorrect',
  findMissingDois: 'Find Missing DOIs',
  verifyOnline: 'Verify references (L1+L2)...',
  detectDuplicates: 'Detect Duplicates',
  selectCitationStyle: 'Select Citation Style...',
  settings: 'Settings…',
  language: 'Language',
  english: 'English',
  arabicUi: 'العربية (Arabic)',
  theme: 'Theme',
  themeSystem: 'System',
  themeLight: 'Light',
  themeDark: 'Dark',
  toggleTheme: 'Toggle Theme',
  alwaysOnTop: 'Always on Top',
  helpExternalGroup: 'Documentation',
  nassilaDocs: 'Nassila user guide (website)',
  cslDocs: 'Citation Style Language documentation',
  cslRepo: 'CSL style repository (GitHub)',
  reportIssue: 'Report issue (Nassila on GitHub)',
  about: 'About Nassila…',
  cut: 'Cut',
  copy: 'Copy',
  paste: 'Paste',
  selectAll: 'Select All',
  minimize: 'Minimize',
  zoom: 'Zoom',
  close: 'Close',
  reload: 'Reload',
  forceReload: 'Force Reload',
  resetZoom: 'Actual Size',
  zoomIn: 'Zoom In',
  zoomOut: 'Zoom Out',
  toggleFullscreen: 'Toggle Full Screen'
}

const AR: MenuLabelSet = {
  file: 'ملف',
  edit: 'تحرير',
  references: 'المراجع',
  view: 'عرض',
  window: 'النافذة',
  help: 'مساعدة',
  newSession: 'جلسة جديدة',
  openProject: 'فتح مشروع…',
  saveProject: 'حفظ المشروع…',
  importReferences: 'استيراد المراجع…',
  exportBibliography: 'تصدير قائمة المراجع…',
  exportCslJson: 'تصدير CSL JSON…',
  undo: 'تراجع',
  redo: 'إعادة التنفيذ',
  clearAllCitations: 'مسح كل المراجع',
  runAutocorrect: 'تشغيل التصحيح التلقائي',
  findMissingDois: 'البحث عن معرّفات DOI المفقودة',
  verifyOnline: 'التحقق من المراجع (L1 + L2)…',
  detectDuplicates: 'الكشف عن التكرارات',
  selectCitationStyle: 'اختيار أسلوب الاقتباس…',
  settings: 'الإعدادات…',
  language: 'اللغة',
  english: 'English',
  arabicUi: 'العربية',
  theme: 'المظهر',
  themeSystem: 'حسب النظام',
  themeLight: 'فاتح',
  themeDark: 'داكن',
  toggleTheme: 'تبديل المظهر',
  alwaysOnTop: 'إبقاء النافذة في المقدمة',
  helpExternalGroup: 'التوثيق',
  nassilaDocs: 'دليل مستخدم ناسيلا (الموقع)',
  cslDocs: 'وثائق CSL (Citation Style Language)',
  cslRepo: 'مستودع أساليب CSL (GitHub)',
  reportIssue: 'الإبلاغ عن مشكلة (ناسيلا على GitHub)',
  about: 'عن ناسيلا…',
  cut: 'قص',
  copy: 'نسخ',
  paste: 'لصق',
  selectAll: 'تحديد الكل',
  minimize: 'تصغير النافذة',
  zoom: 'تكبير النافذة',
  close: 'إغلاق',
  reload: 'إعادة التحميل',
  forceReload: 'إعادة تحميل إجبارية',
  resetZoom: 'الحجم الفعلي',
  zoomIn: 'تكبير العرض',
  zoomOut: 'تصغير العرض',
  toggleFullscreen: 'تبديل ملء الشاشة'
}

export function mainMenuLabels(locale: MainMenuLocale): MenuLabelSet {
  return locale === 'ar' ? AR : EN
}
