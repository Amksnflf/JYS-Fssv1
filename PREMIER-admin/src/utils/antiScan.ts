export function initAntiScan(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const ua = (navigator.userAgent || '').toLowerCase();
  const isHeadless =
    Boolean(navigator.webdriver) ||
    /headlesschrome|phantomjs|selenium|puppeteer|playwright|crawl|spider|slurp|sqlmap|nikto|nmap|masscan|zgrab/i.test(ua);

  if (isHeadless) {
    document.documentElement.innerHTML = '';
    window.stop?.();
    return;
  }

  document.addEventListener(
    'contextmenu',
    (e) => {
      e.preventDefault();
    },
    { capture: true }
  );

  document.addEventListener(
    'keydown',
    (e) => {
      const key = e.key?.toUpperCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      if (
        e.key === 'F12' ||
        (ctrlOrMeta && key === 'U') ||
        (ctrlOrMeta && key === 'S') ||
        (ctrlOrMeta && e.shiftKey && (key === 'I' || key === 'J' || key === 'C'))
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    },
    { capture: true }
  );
}
