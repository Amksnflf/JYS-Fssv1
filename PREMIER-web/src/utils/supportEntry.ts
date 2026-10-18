import { fetchSupportConfig, fetchSupportConfigFallback, type SupportHubConfig } from '@/api/support';

export type SupportTarget =
  | { type: 'path'; value: string }
  | { type: 'external'; value: string };

const DEFAULT_SUPPORT_CONFIG: SupportHubConfig = {
  enabled: true,
  mode: 'hub',
  vendor: 'none',
  helpCenterEnabled: true,
  ticketEnabled: true,
  thirdPartyEnabled: false,
  thirdPartyType: 'none',
  thirdPartyUrl: '',
  thirdPartyScript: '',
  thirdPartyAppId: '',
  fallbackToTicket: true,
};

let supportConfigCache: SupportHubConfig | null = null;
let supportConfigPromise: Promise<SupportHubConfig> | null = null;

function pathTarget(value: string): SupportTarget {
  return { type: 'path', value };
}

function externalTarget(value: string): SupportTarget {
  return { type: 'external', value };
}

function normalizeSupportVendor(vendor?: string | null): string {
  return vendor?.trim().toLowerCase() || DEFAULT_SUPPORT_CONFIG.vendor;
}

function quoteScriptValue(value: string): string {
  return JSON.stringify(value);
}

function normalizeSupportConfig(config?: Partial<SupportHubConfig> | null): SupportHubConfig {
  return {
    ...DEFAULT_SUPPORT_CONFIG,
    ...config,
    mode: config?.mode?.trim() || DEFAULT_SUPPORT_CONFIG.mode,
    vendor: normalizeSupportVendor(config?.vendor),
    thirdPartyType: config?.thirdPartyType?.trim() || DEFAULT_SUPPORT_CONFIG.thirdPartyType,
    thirdPartyUrl: config?.thirdPartyUrl?.trim() || '',
    thirdPartyScript: config?.thirdPartyScript?.trim() || '',
    thirdPartyAppId: config?.thirdPartyAppId?.trim() || '',
  };
}

export function getDefaultSupportConfig(): SupportHubConfig {
  return DEFAULT_SUPPORT_CONFIG;
}

export function invalidateSupportConfigCache() {
  supportConfigCache = null;
  supportConfigPromise = null;
}

export function getSupportVendorLabel(vendor?: string | null): string {
  switch (normalizeSupportVendor(vendor)) {
    case 'crisp':
      return 'Crisp';
    case 'intercom':
      return 'Intercom';
    case 'zendesk':
      return 'Zendesk';
    case 'custom':
      return 'Custom';
    default:
      return 'Support';
  }
}

export function buildEmbeddedSupportScript(config: Pick<SupportHubConfig, 'vendor' | 'thirdPartyType' | 'thirdPartyScript' | 'thirdPartyAppId'>): string {
  const manualScript = config.thirdPartyScript?.trim() || '';
  if (manualScript) {
    return manualScript;
  }
  if (config.thirdPartyType !== 'embed_script') {
    return '';
  }

  const appId = config.thirdPartyAppId?.trim() || '';
  if (!appId) {
    return '';
  }

  switch (normalizeSupportVendor(config.vendor)) {
    case 'crisp':
      return `<script>
window.$crisp = [];
window.CRISP_WEBSITE_ID = ${quoteScriptValue(appId)};
(function () {
  const d = document;
  const s = d.createElement('script');
  s.src = 'https://client.crisp.chat/l.js';
  s.async = 1;
  d.head.appendChild(s);
})();
</script>`;
    case 'intercom':
      return `<script>
window.intercomSettings = { app_id: ${quoteScriptValue(appId)} };
(function () {
  const w = window;
  const ic = w.Intercom;
  if (typeof ic === 'function') {
    ic('reattach_activator');
    ic('update', w.intercomSettings);
    return;
  }
  const d = document;
  const i = function () { i.c(arguments); };
  i.q = [];
  i.c = function (args) { i.q.push(args); };
  w.Intercom = i;
  const l = function () {
    const s = d.createElement('script');
    s.type = 'text/javascript';
    s.async = true;
    s.src = 'https://widget.intercom.io/widget/' + ${quoteScriptValue(appId)};
    const x = d.getElementsByTagName('script')[0];
    if (x && x.parentNode) {
      x.parentNode.insertBefore(s, x);
    } else {
      d.head.appendChild(s);
    }
  };
  if (d.readyState === 'complete') {
    l();
  } else if (w.attachEvent) {
    w.attachEvent('onload', l);
  } else {
    w.addEventListener('load', l, false);
  }
})();
</script>`;
    case 'zendesk':
      return `<script id="ze-snippet" src="https://static.zdassets.com/ekr/snippet.js?key=${encodeURIComponent(appId)}"></script>`;
    default:
      return '';
  }
}

export async function loadSupportConfig(force = false): Promise<SupportHubConfig> {
  if (!force && supportConfigCache) {
    return supportConfigCache;
  }
  if (!force && supportConfigPromise) {
    return supportConfigPromise;
  }
  supportConfigPromise = fetchSupportConfig()
    .catch(() => fetchSupportConfigFallback())
    .then((config) => normalizeSupportConfig(config))
    .catch(() => DEFAULT_SUPPORT_CONFIG)
    .finally(() => {
      supportConfigPromise = null;
    });
  supportConfigCache = await supportConfigPromise;
  return supportConfigCache;
}

export function getSupportTicketEntryPath(loggedIn: boolean): string {
  return loggedIn
    ? '/support/ticket/new'
    : `/auth/login?redirect=${encodeURIComponent('/support/ticket/new')}`;
}

function fallbackSupportPath(config: SupportHubConfig, loggedIn: boolean): SupportTarget {
  if (config.fallbackToTicket && config.ticketEnabled) {
    return pathTarget(getSupportTicketEntryPath(loggedIn));
  }
  if (config.helpCenterEnabled) {
    return pathTarget('/support');
  }
  if (config.ticketEnabled) {
    return pathTarget(getSupportTicketEntryPath(loggedIn));
  }
  return pathTarget('/support-hub');
}

export function canUseThirdPartySupport(config: SupportHubConfig): boolean {
  if (!config.enabled || !config.thirdPartyEnabled) {
    return false;
  }
  if (config.thirdPartyType === 'external_url') {
    return Boolean(config.thirdPartyUrl);
  }
  if (config.thirdPartyType === 'embed_script') {
    return Boolean(buildEmbeddedSupportScript(config));
  }
  return false;
}

export function resolveOnlineSupportTarget(config: SupportHubConfig, loggedIn: boolean): SupportTarget {
  if (canUseThirdPartySupport(config)) {
    if (config.thirdPartyType === 'external_url' && config.thirdPartyUrl) {
      return externalTarget(config.thirdPartyUrl);
    }
    return pathTarget('/support/live');
  }
  return fallbackSupportPath(config, loggedIn);
}

export function resolveSupportEntryTarget(config: SupportHubConfig, loggedIn: boolean): SupportTarget {
  if (!config.enabled) {
    if (config.helpCenterEnabled) {
      return pathTarget('/support');
    }
    return fallbackSupportPath(config, loggedIn);
  }

  if (config.mode === 'help_only') {
    if (config.helpCenterEnabled) {
      return pathTarget('/support');
    }
    return fallbackSupportPath(config, loggedIn);
  }

  if (config.mode === 'third_party_only') {
    return resolveOnlineSupportTarget(config, loggedIn);
  }

  return pathTarget('/support-hub');
}
