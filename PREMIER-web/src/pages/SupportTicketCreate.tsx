import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import PageHeader from '@/components/PageHeader';
import { PcContainer } from '@/components/pc';
import { toast } from '@/components/Toast';
import { useResponsive } from '@/hooks/useResponsive';
import {
  createSupportTicket,
  fetchSupportCategories,
  localizeSupportCategories,
  type SupportCategory,
} from '@/api/support';

const PRIORITY_OPTIONS = [1, 2, 3, 4] as const;

export default function SupportTicketCreatePage() {
  const { t, i18n } = useTranslation();
  const nav = useNavigate();
  const { isPc } = useResponsive();
  const [rawCategories, setRawCategories] = useState<SupportCategory[]>([]);
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [relatedOrderNo, setRelatedOrderNo] = useState('');
  const [relatedSymbol, setRelatedSymbol] = useState('');
  const [priority, setPriority] = useState<number>(2);

  useEffect(() => {
    let cancelled = false;
    fetchSupportCategories()
      .then((data) => {
        if (cancelled) return;
        setRawCategories(data ?? []);
      })
      .finally(() => {
        if (!cancelled) setBooting(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const categories = useMemo(
    () => localizeSupportCategories(rawCategories, i18n.language),
    [rawCategories, i18n.language]
  );

  // Default to (or keep) a valid category for the current language list.
  useEffect(() => {
    if (!categories.length) return;
    if (!categories.some((item) => item.categoryKey === category)) {
      setCategory(categories[0].categoryKey);
    }
  }, [categories, category]);

  const canSubmit = useMemo(
    () => Boolean(category && content.trim()) && !loading,
    [category, content, loading]
  );

  const handleSubmit = async () => {
    if (!category) {
      toast.info(t('supportTicket.selectCategory'));
      return;
    }
    if (!content.trim()) {
      toast.info(t('supportTicket.contentRequired'));
      return;
    }
    setLoading(true);
    try {
      const ticket = await createSupportTicket({
        category,
        subject: subject.trim() || undefined,
        content: content.trim(),
        priority,
        relatedOrderNo: relatedOrderNo.trim() || undefined,
        relatedSymbol: relatedSymbol.trim() || undefined,
        lang: i18n.language,
        source: 'h5',
        channel: 'ticket',
      });
      toast.success(t('supportTicket.submitSuccess'));
      nav(`/support/ticket/${ticket.id}`, { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : t('supportTicket.submitFailed');
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const form = (
    <div className="space-y-5">
      <section className="rounded-2xl border border-line bg-bg px-4 py-4 shadow-card">
        <div className="text-[15px] font-semibold">{t('supportTicket.category')}</div>
        <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
          {booting ? (
            <div className="col-span-full text-[13px] text-textSub">{t('common.loading')}</div>
          ) : categories.length === 0 ? (
            <div className="col-span-full text-[13px] text-textSub">{t('common.noData')}</div>
          ) : (
            categories.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setCategory(item.categoryKey)}
                className={`rounded-xl border px-3 py-3 text-[13px] ${
                  category === item.categoryKey
                    ? 'border-text bg-bgSoft font-semibold text-text'
                    : 'border-line text-textSub'
                }`}
              >
                {item.categoryName}
              </button>
            ))
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-bg px-4 py-4 shadow-card">
        <div className="text-[15px] font-semibold">{t('supportTicket.subject')}</div>
        <input
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder={t('supportTicket.subjectPlaceholder')}
          className="input-base mt-3 h-12"
        />

        <div className="mt-5 text-[15px] font-semibold">{t('supportTicket.content')}</div>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder={t('supportTicket.contentPlaceholder')}
          className="mt-3 min-h-[148px] w-full rounded-2xl border border-line bg-bg px-4 py-4 text-sm text-text outline-none focus:border-text focus:ring-2 focus:ring-text/10"
        />
      </section>

      <section className="rounded-2xl border border-line bg-bg px-4 py-4 shadow-card">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-[14px] font-semibold">{t('supportTicket.relatedOrderNo')}</div>
            <input
              value={relatedOrderNo}
              onChange={(event) => setRelatedOrderNo(event.target.value)}
              placeholder={t('supportTicket.relatedOrderPlaceholder')}
              className="input-base mt-3 h-12"
            />
          </div>
          <div>
            <div className="text-[14px] font-semibold">{t('supportTicket.relatedSymbol')}</div>
            <input
              value={relatedSymbol}
              onChange={(event) => setRelatedSymbol(event.target.value)}
              placeholder="BTC/USDT"
              className="input-base mt-3 h-12"
            />
          </div>
        </div>

        <div className="mt-5 text-[14px] font-semibold">{t('supportTicket.priority')}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {PRIORITY_OPTIONS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setPriority(item)}
              className={`rounded-full px-4 py-2 text-[13px] ${
                priority === item ? 'bg-text text-bg' : 'bg-bgSoft text-textSub'
              }`}
            >
              {t(`supportTicket.priority${item}`)}
            </button>
          ))}
        </div>
      </section>

      <button type="button" onClick={handleSubmit} disabled={!canSubmit} className="btn-primary w-full">
        {loading ? t('common.loading') : t('supportTicket.submitNow')}
      </button>
    </div>
  );

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <div className="mx-auto max-w-[900px]">
            <div className="flex items-end justify-between">
              <div>
                <h1 className="pc-h2 m-0">{t('supportTicket.createTitle')}</h1>
                <p className="mt-3 text-[14px] text-textSubPc">{t('supportTicket.createSubtitle')}</p>
              </div>
            </div>
            <div className="mt-8">{form}</div>
          </div>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-12 md:bg-[#3c3c3c] md:py-6">
      <div className="mx-auto min-h-screen w-full max-w-md bg-bg">
        <PageHeader title={t('supportTicket.createTitle')} fallbackPath="/support-hub" />
        <div className="px-4 pb-8 pt-5">{form}</div>
      </div>
    </div>
  );
}
