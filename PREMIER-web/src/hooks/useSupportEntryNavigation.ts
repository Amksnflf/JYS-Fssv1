import { useNavigate } from 'react-router-dom';
import { useUserStore } from '@/store/userStore';
import { loadSupportConfig, resolveSupportEntryTarget } from '@/utils/supportEntry';

export function useSupportEntryNavigation() {
  const nav = useNavigate();
  const token = useUserStore((s) => s.token);

  return async (replace = false) => {
    try {
      const config = await loadSupportConfig();
      const target = resolveSupportEntryTarget(config, Boolean(token));
      if (target.type === 'external') {
        if (replace) {
          window.location.replace(target.value);
          return;
        }
        window.location.assign(target.value);
        return;
      }
      nav(target.value, { replace });
    } catch {
      nav('/support-hub', { replace });
    }
  };
}
