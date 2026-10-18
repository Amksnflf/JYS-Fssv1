import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { loadSupportConfig, resolveSupportEntryTarget } from '@/utils/supportEntry';

export default function SupportEntryPage() {
  const nav = useNavigate();
  const token = useUserStore((s) => s.token);

  useEffect(() => {
    let cancelled = false;
    loadSupportConfig()
      .then((config) => {
        if (cancelled) return;
        const target = resolveSupportEntryTarget(config, Boolean(token));
        if (target.type === 'external') {
          window.location.replace(target.value);
          return;
        }
        nav(target.value, { replace: true });
      })
      .catch(() => {
        if (!cancelled) {
          nav('/support-hub', { replace: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [nav, token]);

  return null;
}
