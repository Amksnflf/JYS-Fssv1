import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { PcContainer } from '@/components/pc';
import { useResponsive } from '@/hooks/useResponsive';
import { useUserStore } from '@/store/userStore';
import type { SupportHubConfig } from '@/api/support';
import {
  buildEmbeddedSupportScript,
  getSupportTicketEntryPath,
  getSupportVendorLabel,
  loadSupportConfig,
  resolveOnlineSupportTarget,
} from '@/utils/supportEntry';

function cloneExecutableScript(scriptNode: HTMLScriptElement) {
  const script = document.createElement('script');
  Array.from(scriptNode.attributes).forEach((attr) => {
    script.setAttribute(attr.name, attr.value);
  });
  script.text = scriptNode.text || scriptNode.textContent || '';
  return script;
}

function mountThirdPartyScript(container: HTMLDivElement, scriptContent: string) {
  container.innerHTML = '';
  const trimmed = scriptContent.trim();
  if (!trimmed) {
    return () => {
      container.innerHTML = '';
    };
  }

  const template = document.createElement('template');
  template.innerHTML = trimmed;
  if (!template.content.childNodes.length) {
    const script = document.createElement('script');
    script.text = trimmed;
    container.appendChild(script);
    return () => {
      container.innerHTML = '';
    };
  }

  const fragment = template.content.cloneNode(true) as DocumentFragment;
  Array.from(fragment.querySelectorAll('script')).forEach((node) => {
    node.replaceWith(cloneExecutableScript(node));
  });
  container.appendChild(fragment);
  return () => {
    container.innerHTML = '';
  };
}

export default function SupportLivePage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const token = useUserStore((s) => s.token);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [config, setConfig] = useState<SupportHubConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [scriptMode, setScriptMode] = useState<'manual' | 'auto' | 'none'>('none');

  useEffect(() => {
    let cancelled = false;
    loadSupportConfig(true)
      .then((nextConfig) => {
        if (cancelled) return;
        const target = resolveOnlineSupportTarget(nextConfig, Boolean(token));
        if (target.type === 'external') {
          window.location.replace(target.value);
          return;
        }
        if (target.value !== '/support/live') {
          nav(target.value, { replace: true });
          return;
        }
        setConfig(nextConfig);
      })
      .catch(() => {
        if (!cancelled) {
          nav('/support-hub', { replace: true });
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [nav, token]);

  useEffect(() => {
    if (!config || config.thirdPartyType !== 'embed_script' || !containerRef.current) {
      return;
    }

    const scriptContent = buildEmbeddedSupportScript(config);
    if (!scriptContent) {
      setScriptMode('none');
      setFailed(true);
      return;
    }

    try {
      setFailed(false);
      setScriptMode(config.thirdPartyScript?.trim() ? 'manual' : 'auto');
      return mountThirdPartyScript(containerRef.current, scriptContent);
    } catch {
      setScriptMode('none');
      setFailed(true);
      return;
    }
  }, [config]);

  const openTicketFallback = () => {
    nav(getSupportTicketEntryPath(Boolean(token)));
  };

  const vendorLabel = getSupportVendorLabel(config?.vendor);
  const scriptHint = scriptMode === 'manual'
    ? t('supportHub.manualScript', '当前使用后台填入的自定义脚本接入。')
    : scriptMode === 'auto'
      ? t('supportHub.autoScriptHint', {
        vendor: vendorLabel,
        defaultValue: `当前已按 ${vendorLabel} 官方嵌入方式自动接入。`,
      })
      : '';

  const content = failed ? (
    <div className="rounded-2xl border border-line bg-bg px-5 py-10 text-center shadow-card">
      <div className="text-[18px] font-semibold text-text">
        {t('supportHub.onlineTitle')}
      </div>
      <div className="mt-3 text-[13px] leading-6 text-textSub">
        {t('supportHub.liveUnavailable', '当前在线客服脚本未成功加载，您可以改走正式工单处理。')}
      </div>
      <div className="mt-5 flex justify-center gap-3">
        <button
          type="button"
          onClick={() => nav('/support-hub')}
          className="rounded-full border border-line px-4 py-2 text-[13px] text-text"
        >
          {t('supportHub.backToHub', '返回 Support Hub')}
        </button>
        <button
          type="button"
          onClick={openTicketFallback}
          className="rounded-full bg-text px-4 py-2 text-[13px] text-white"
        >
          {t('supportHub.goToTicket', '改走工单')}
        </button>
      </div>
    </div>
  ) : (
    <div className="rounded-2xl border border-line bg-bg shadow-card">
      <div className="border-b border-line px-5 py-4">
        <div className="text-[18px] font-semibold text-text">{t('supportHub.onlineTitle')}</div>
        <div className="mt-2 text-[13px] leading-6 text-textSub">
          {loading
            ? t('supportHub.liveLoading', '正在载入在线客服...')
            : t('supportHub.liveLoaded', '如果未自动显示聊天组件，请返回客服中心改走工单流程。')}
        </div>
        {scriptHint ? (
          <div className="mt-2 text-[12px] leading-5 text-textSub">
            {scriptHint}
          </div>
        ) : null}
      </div>
      <div ref={containerRef} className="min-h-[420px] px-4 py-4" />
    </div>
  );

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          {content}
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title={t('supportHub.onlineTitle')} fallbackPath="/support-hub" />
      <div className="px-4 pb-8 pt-5">
        {content}
      </div>
    </div>
  );
}
