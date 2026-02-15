// ─── Internationalization (i18n) Module ───────────────────
// Supports: English (en), Spanish (es), French (fr), German (de)

const translations = {
  en: {
    // Popup
    'popup.loading': 'Checking your calendar...',
    'popup.no_events': 'No upcoming appointments',
    'popup.no_events_sub': 'We\'ll notify you 5 minutes before your next session.',
    'popup.first_session': 'First session with this client. No prior notes.',
    'popup.got_it': 'Got it',
    'popup.snooze': 'Snooze 5min',
    'popup.view_history': 'View History',
    'popup.add_note': 'Add Note',
    'popup.send_summary': 'Send Summary',
    'popup.today_at': 'Today at',

    // Note capture
    'note.title': 'Post-Session Note',
    'note.for': 'Note for',
    'note.summary_label': 'Quick Summary',
    'note.summary_placeholder': 'Brief summary of the session...',
    'note.details_label': 'Detailed Notes',
    'note.details_placeholder': 'Detailed observations, treatment notes, action items...',
    'note.save': 'Save Note',
    'note.saved': 'Note saved!',

    // Email compose
    'email.to': 'To',
    'email.cc': 'Cc',
    'email.subject': 'Subject',
    'email.template': 'Template',
    'email.body': 'Body',
    'email.send': 'Send',
    'email.cancel': 'Cancel',
    'email.schedule': 'Schedule',
    'email.now': 'Send Now',
    'email.next_morning': 'Next Morning 9AM',
    'email.skip_weekends': 'Skip weekends',
    'email.sent': 'Email sent!',

    // Upgrade
    'upgrade.trial_days': 'days left in trial',
    'upgrade.title': 'Your free trial has ended',
    'upgrade.subtitle': 'Upgrade to keep AI prep, voice notes, and email summaries.',
    'upgrade.monthly': '$9/mo',
    'upgrade.yearly': '$89/yr',
    'upgrade.continue_free': 'Continue Free',

    // Settings
    'settings.title': 'Settings',
    'settings.notifications': 'Notifications',
    'settings.pre_reminder': 'Pre-appointment reminder',
    'settings.post_reminder': 'Post-session note prompt',
    'settings.calendar': 'Calendar',
    'settings.provider': 'Calendar provider',
    'settings.timezone': 'Timezone',

    // Account
    'account.title': 'Account',
    'account.email': 'Email',
    'account.plan': 'Plan',
    'account.trial_ends': 'Trial ends',
    'account.sign_out': 'Sign Out',
    'account.export_data': 'Export My Data',
    'account.delete_account': 'Delete Account',

    // Onboarding
    'onboarding.welcome': 'Welcome to PrepMeet',
    'onboarding.tagline': 'Get 2-bullet context about your next client, 5 minutes before appointments.',
    'onboarding.get_started': 'Get Started',
    'onboarding.connect_calendar': 'Connect Your Calendar',
    'onboarding.connect_google': 'Connect Google Calendar',
    'onboarding.connect_microsoft': 'Connect Microsoft Outlook',
    'onboarding.skip': 'Skip for now',
    'onboarding.profession': 'What\'s your profession?',
    'onboarding.all_set': 'You\'re all set!',
    'onboarding.trial_started': 'Your 14-day free trial has started.',
    'onboarding.start_using': 'Start Using PrepMeet',

    // Contacts
    'contacts.title': 'Contacts',
    'contacts.search': 'Search contacts...',
    'contacts.import': 'Import',
    'contacts.no_contacts': 'No contacts yet.',
    'contacts.importing': 'Importing contacts...',

    // Templates
    'templates.title': 'Email Templates',
    'templates.new': '+ New Template',
    'templates.no_templates': 'No custom templates yet.',
    'templates.name': 'Name',
    'templates.subject': 'Subject',
    'templates.body': 'Body',
    'templates.save': 'Save',
    'templates.cancel': 'Cancel',
    'templates.delete_confirm': 'Delete this template?',
  },

  es: {
    'popup.loading': 'Revisando tu calendario...',
    'popup.no_events': 'Sin citas pr\u00f3ximas',
    'popup.no_events_sub': 'Te notificaremos 5 minutos antes de tu pr\u00f3xima sesi\u00f3n.',
    'popup.first_session': 'Primera sesi\u00f3n con este cliente. Sin notas previas.',
    'popup.got_it': 'Entendido',
    'popup.snooze': 'Posponer 5min',
    'popup.view_history': 'Ver Historial',
    'popup.add_note': 'Agregar Nota',
    'popup.send_summary': 'Enviar Resumen',
    'popup.today_at': 'Hoy a las',

    'note.title': 'Nota Post-Sesi\u00f3n',
    'note.for': 'Nota para',
    'note.summary_label': 'Resumen R\u00e1pido',
    'note.summary_placeholder': 'Resumen breve de la sesi\u00f3n...',
    'note.details_label': 'Notas Detalladas',
    'note.details_placeholder': 'Observaciones detalladas, notas de tratamiento, acciones a seguir...',
    'note.save': 'Guardar Nota',
    'note.saved': '\u00a1Nota guardada!',

    'email.to': 'Para',
    'email.cc': 'Cc',
    'email.subject': 'Asunto',
    'email.template': 'Plantilla',
    'email.body': 'Cuerpo',
    'email.send': 'Enviar',
    'email.cancel': 'Cancelar',
    'email.now': 'Enviar Ahora',
    'email.next_morning': 'Ma\u00f1ana 9AM',
    'email.skip_weekends': 'Omitir fines de semana',
    'email.sent': '\u00a1Correo enviado!',

    'upgrade.trial_days': 'd\u00edas restantes de prueba',
    'upgrade.title': 'Tu prueba gratuita ha terminado',
    'upgrade.subtitle': 'Actualiza para mantener preparaci\u00f3n IA, notas de voz y res\u00famenes por correo.',
    'upgrade.continue_free': 'Continuar Gratis',

    'settings.title': 'Configuraci\u00f3n',
    'settings.notifications': 'Notificaciones',
    'settings.pre_reminder': 'Recordatorio pre-cita',
    'settings.post_reminder': 'Recordatorio de nota post-sesi\u00f3n',
    'settings.calendar': 'Calendario',
    'settings.provider': 'Proveedor de calendario',
    'settings.timezone': 'Zona horaria',

    'account.title': 'Cuenta',
    'account.email': 'Correo',
    'account.plan': 'Plan',
    'account.sign_out': 'Cerrar Sesi\u00f3n',
    'account.export_data': 'Exportar Mis Datos',
    'account.delete_account': 'Eliminar Cuenta',

    'onboarding.welcome': 'Bienvenido a PrepMeet',
    'onboarding.get_started': 'Comenzar',
    'onboarding.connect_calendar': 'Conecta Tu Calendario',
    'onboarding.connect_google': 'Conectar Google Calendar',
    'onboarding.connect_microsoft': 'Conectar Microsoft Outlook',
    'onboarding.skip': 'Omitir por ahora',
    'onboarding.profession': '\u00bfCu\u00e1l es tu profesi\u00f3n?',
    'onboarding.all_set': '\u00a1Todo listo!',
    'onboarding.start_using': 'Empezar a Usar PrepMeet',

    'contacts.title': 'Contactos',
    'contacts.search': 'Buscar contactos...',
    'contacts.import': 'Importar',
    'contacts.no_contacts': 'A\u00fan no hay contactos.',

    'templates.title': 'Plantillas de Correo',
    'templates.new': '+ Nueva Plantilla',
    'templates.no_templates': 'A\u00fan no hay plantillas.',
    'templates.save': 'Guardar',
    'templates.cancel': 'Cancelar',
  },

  fr: {
    'popup.loading': 'V\u00e9rification de votre calendrier...',
    'popup.no_events': 'Aucun rendez-vous \u00e0 venir',
    'popup.no_events_sub': 'Nous vous pr\u00e9viendrons 5 minutes avant votre prochaine session.',
    'popup.first_session': 'Premi\u00e8re session avec ce client. Aucune note pr\u00e9c\u00e9dente.',
    'popup.got_it': 'Compris',
    'popup.snooze': 'Reporter 5min',
    'popup.view_history': 'Voir l\'Historique',
    'popup.add_note': 'Ajouter une Note',
    'popup.send_summary': 'Envoyer le R\u00e9sum\u00e9',
    'popup.today_at': 'Aujourd\'hui \u00e0',

    'note.title': 'Note Post-Session',
    'note.for': 'Note pour',
    'note.summary_label': 'R\u00e9sum\u00e9 Rapide',
    'note.details_label': 'Notes D\u00e9taill\u00e9es',
    'note.save': 'Enregistrer',
    'note.saved': 'Note enregistr\u00e9e !',

    'email.send': 'Envoyer',
    'email.cancel': 'Annuler',
    'email.now': 'Envoyer Maintenant',
    'email.sent': 'Email envoy\u00e9 !',

    'upgrade.trial_days': 'jours restants d\'essai',
    'upgrade.title': 'Votre essai gratuit est termin\u00e9',
    'upgrade.continue_free': 'Continuer Gratuitement',

    'settings.title': 'Param\u00e8tres',
    'settings.notifications': 'Notifications',

    'account.title': 'Compte',
    'account.sign_out': 'D\u00e9connexion',
    'account.export_data': 'Exporter Mes Donn\u00e9es',

    'onboarding.welcome': 'Bienvenue sur PrepMeet',
    'onboarding.get_started': 'Commencer',
    'onboarding.connect_google': 'Connecter Google Calendar',
    'onboarding.connect_microsoft': 'Connecter Microsoft Outlook',
    'onboarding.profession': 'Quelle est votre profession ?',
    'onboarding.all_set': 'C\'est pr\u00eat !',

    'contacts.title': 'Contacts',
    'contacts.search': 'Rechercher des contacts...',
    'contacts.import': 'Importer',

    'templates.title': 'Mod\u00e8les d\'Email',
    'templates.save': 'Enregistrer',
    'templates.cancel': 'Annuler',
  },

  de: {
    'popup.loading': 'Kalender wird \u00fcberpr\u00fcft...',
    'popup.no_events': 'Keine anstehenden Termine',
    'popup.no_events_sub': 'Wir benachrichtigen Sie 5 Minuten vor Ihrem n\u00e4chsten Termin.',
    'popup.first_session': 'Erste Sitzung mit diesem Klienten. Keine vorherigen Notizen.',
    'popup.got_it': 'Verstanden',
    'popup.snooze': '5 Min sp\u00e4ter',
    'popup.view_history': 'Verlauf anzeigen',
    'popup.add_note': 'Notiz hinzuf\u00fcgen',
    'popup.send_summary': 'Zusammenfassung senden',
    'popup.today_at': 'Heute um',

    'note.title': 'Nachsitzungs-Notiz',
    'note.for': 'Notiz f\u00fcr',
    'note.summary_label': 'Kurzzusammenfassung',
    'note.details_label': 'Detaillierte Notizen',
    'note.save': 'Speichern',
    'note.saved': 'Notiz gespeichert!',

    'email.send': 'Senden',
    'email.cancel': 'Abbrechen',
    'email.now': 'Jetzt senden',
    'email.sent': 'E-Mail gesendet!',

    'upgrade.trial_days': 'Testtage verbleibend',
    'upgrade.title': 'Ihre kostenlose Testphase ist beendet',
    'upgrade.continue_free': 'Kostenlos fortfahren',

    'settings.title': 'Einstellungen',
    'settings.notifications': 'Benachrichtigungen',

    'account.title': 'Konto',
    'account.sign_out': 'Abmelden',
    'account.export_data': 'Meine Daten exportieren',

    'onboarding.welcome': 'Willkommen bei PrepMeet',
    'onboarding.get_started': 'Loslegen',
    'onboarding.connect_google': 'Google Kalender verbinden',
    'onboarding.connect_microsoft': 'Microsoft Outlook verbinden',
    'onboarding.profession': 'Was ist Ihr Beruf?',
    'onboarding.all_set': 'Alles bereit!',

    'contacts.title': 'Kontakte',
    'contacts.search': 'Kontakte suchen...',
    'contacts.import': 'Importieren',

    'templates.title': 'E-Mail-Vorlagen',
    'templates.save': 'Speichern',
    'templates.cancel': 'Abbrechen',
  },
};

let currentLocale = 'en';

/**
 * Initialize i18n. Detects locale from browser or user preference.
 */
export async function initI18n() {
  // Check user preference first
  const { locale } = await chrome.storage.sync.get('locale');
  if (locale && translations[locale]) {
    currentLocale = locale;
    return;
  }

  // Auto-detect from browser
  const browserLang = navigator.language.split('-')[0];
  if (translations[browserLang]) {
    currentLocale = browserLang;
  }
}

/**
 * Get translated string. Falls back to English if key not found in current locale.
 */
export function t(key, params = {}) {
  const str = translations[currentLocale]?.[key] || translations.en[key] || key;

  // Simple parameter substitution: t('key', { count: 5 }) replaces {count}
  return str.replace(/\{(\w+)\}/g, (_, name) => params[name] ?? `{${name}}`);
}

/**
 * Set locale and persist preference.
 */
export async function setLocale(locale) {
  if (!translations[locale]) return;
  currentLocale = locale;
  await chrome.storage.sync.set({ locale });
}

/**
 * Get current locale.
 */
export function getLocale() {
  return currentLocale;
}

/**
 * Get list of available locales.
 */
export function getAvailableLocales() {
  return [
    { code: 'en', name: 'English' },
    { code: 'es', name: 'Espa\u00f1ol' },
    { code: 'fr', name: 'Fran\u00e7ais' },
    { code: 'de', name: 'Deutsch' },
  ];
}

/**
 * Apply translations to DOM elements with data-i18n attribute.
 * Usage: <span data-i18n="popup.got_it">Got it</span>
 */
export function applyTranslations(root = document) {
  root.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    el.textContent = t(key);
  });

  root.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    el.placeholder = t(key);
  });

  root.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    el.title = t(key);
  });
}
