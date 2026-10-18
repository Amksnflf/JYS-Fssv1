export function getSafeRedirect(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/auth/')) {
    return '/assets';
  }
  return value;
}

export function withRedirect(path: string, redirect: string | null) {
  const safeRedirect = redirect && getSafeRedirect(redirect) !== '/assets' ? redirect : '';
  if (!safeRedirect) return path;
  return `${path}?redirect=${encodeURIComponent(safeRedirect)}`;
}
