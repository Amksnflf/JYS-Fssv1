export function initAntiScan(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const nav = window.navigator as Navigator & {
    webdriver?: boolean;
  };
  const win = window as Window & {
    _phantom?: unknown;
    __nightmare?: unknown;
    callPhantom?: unknown;
    Cypress?: unknown;
  };

  const ua = (nav.userAgent || '').toLowerCase();

  // 白名单放行 Google / Bing 等正规搜索引擎爬虫，保障 Google SEO 收录与排名
  const isSearchEngineBot =
    ua.includes('googlebot') ||
    ua.includes('google-inspectiontool') ||
    ua.includes('adsbot-google') ||
    ua.includes('mediapartners-google') ||
    ua.includes('bingbot') ||
    ua.includes('slurp') ||
    ua.includes('duckduckbot');

  if (isSearchEngineBot) {
    return;
  }

  const isMaliciousHeadless =
    Boolean(win._phantom) ||
    Boolean(win.__nightmare) ||
    Boolean(win.callPhantom) ||
    ua.includes('phantomjs') ||
    ua.includes('python-requests') ||
    ua.includes('scrapy') ||
    ua.includes('httrack') ||
    ua.includes('webcopier') ||
    ua.includes('sqlmap') ||
    ua.includes('nikto') ||
    ua.includes('nuclei') ||
    ua.includes('curl/');

  if (isMaliciousHeadless) {
    try {
      document.body.innerHTML = '';
      window.location.replace('about:blank');
    } catch {
      // Ignore
    }
    return;
  }

  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
    },
    { passive: false }
  );

  document.addEventListener(
    'keydown',
    (e) => {
      const key = e.key.toUpperCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      // Block F12, Ctrl/Cmd+Shift+I/J/C, Ctrl/Cmd+U (View Source), Ctrl/Cmd+S
      if (
        e.key === 'F12' ||
        (ctrlOrMeta && e.shiftKey && (key === 'I' || key === 'J' || key === 'C')) ||
        (e.metaKey && e.altKey && (key === 'I' || key === 'J' || key === 'U' || key === 'C')) ||
        (ctrlOrMeta && (key === 'U' || key === 'S'))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );

  try {
    console.clear();
  } catch {
    // Ignore
  }
}
