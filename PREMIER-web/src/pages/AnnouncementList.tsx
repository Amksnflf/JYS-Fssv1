import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchAnnouncementPage, type AnnouncementItem } from '@/api/announcement';
import PageHeader from '@/components/PageHeader';
import { PcContainer } from '@/components/pc';
import { toast } from '@/components/Toast';
import { useResponsive } from '@/hooks/useResponsive';

const PAGE_SIZE = 12;

function formatAnnouncementTime(value?: string) {
  if (!value) return '';
  return value.replace(/-/g, '/').slice(0, 19);
}

function announcementPreview(content?: string) {
  if (!content) return '';
  const plainText = content
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plainText) return '';
  return plainText.length <= 120 ? plainText : `${plainText.slice(0, 120)}...`;
}

function AnnouncementSkeleton() {
  return (
    <div className="rounded-2xl border border-line bg-bg p-5">
      <div className="h-6 w-2/3 animate-pulse rounded bg-bgSoft" />
      <div className="mt-4 h-4 w-full animate-pulse rounded bg-bgSoft" />
      <div className="mt-2 h-4 w-4/5 animate-pulse rounded bg-bgSoft" />
      <div className="mt-5 h-4 w-1/3 animate-pulse rounded bg-bgSoft" />
    </div>
  );
}

function AnnouncementCard({ item }: { item: AnnouncementItem }) {
  const preview = announcementPreview(item.content);
  const time = formatAnnouncementTime(item.publishedAt ?? item.createdAt);

  return (
    <Link
      to={`/announcement/${item.id}`}
      className="block rounded-2xl border border-line bg-bg p-5 transition hover:border-text hover:shadow-pcCard"
    >
      <div className="flex items-center gap-2 text-xs text-textSub">
        {item.category ? <span className="rounded-full bg-bgSoft px-2 py-1">{item.category}</span> : null}
        <span>{time}</span>
      </div>
      <h2 className="mt-3 text-[18px] font-semibold leading-7 text-text">{item.title}</h2>
      {preview ? <p className="mt-3 text-sm leading-6 text-textSub">{preview}</p> : null}
    </Link>
  );
}

export default function AnnouncementListPage() {
  const { t, i18n } = useTranslation();
  const { isPc } = useResponsive();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pageNo, setPageNo] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    fetchAnnouncementPage(1, PAGE_SIZE, i18n.language)
      .then((data) => {
        if (cancel) return;
        setAnnouncements(data?.records ?? []);
        setTotal(data?.total ?? 0);
        setPageNo(1);
      })
      .catch((error) => {
        if (cancel) return;
        setAnnouncements([]);
        setTotal(0);
        toast.error(error instanceof Error ? error.message : t('common.noData'));
      })
      .finally(() => {
        if (!cancel) setLoading(false);
      });
    return () => {
      cancel = true;
    };
  }, [i18n.language, t]);

  const hasMore = announcements.length < total;

  const loadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    fetchAnnouncementPage(pageNo + 1, PAGE_SIZE, i18n.language)
      .then((data) => {
        setAnnouncements((prev) => [...prev, ...(data?.records ?? [])]);
        setTotal(data?.total ?? total);
        setPageNo((prev) => prev + 1);
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : t('common.noData'));
      })
      .finally(() => setLoadingMore(false));
  };

  const content = loading ? (
    <div className={`grid gap-4 ${isPc ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {Array.from({ length: isPc ? 4 : 3 }).map((_, index) => (
        <AnnouncementSkeleton key={index} />
      ))}
    </div>
  ) : announcements.length === 0 ? (
    <div className="rounded-2xl border border-dashed border-line bg-bg px-6 py-12 text-center text-sm text-textSub">
      {t('common.noData')}
    </div>
  ) : (
    <div className={`grid gap-4 ${isPc ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {announcements.map((item) => (
        <AnnouncementCard key={item.id} item={item} />
      ))}
    </div>
  );

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <section className="mx-auto w-[980px]">
            <div className="mb-8">
              <h1 className="text-[34px] font-semibold tracking-[-0.03em] text-text">{t('profile.notice')}</h1>
              <p className="mt-3 text-sm text-textSubPc">{t('home.platformNotice')}</p>
            </div>
            {content}
            {hasMore ? (
              <div className="mt-8 flex justify-center">
                <button type="button" onClick={loadMore} className="pc-btn-pill min-w-[180px]" disabled={loadingMore}>
                  {loadingMore ? `${t('common.viewMore')}...` : t('common.viewMore')}
                </button>
              </div>
            ) : null}
          </section>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <PageHeader title={t('profile.notice')} fallbackPath="/" />
      <div className="mx-auto w-full max-w-md px-4 pb-8 pt-5">
        <div className="mb-4 text-sm text-textSub">{t('home.platformNotice')}</div>
        {content}
        {hasMore ? (
          <button
            type="button"
            onClick={loadMore}
            className="mt-5 flex h-11 w-full items-center justify-center rounded-full bg-bgSoft text-sm text-text"
            disabled={loadingMore}
          >
            {loadingMore ? `${t('common.viewMore')}...` : t('common.viewMore')}
          </button>
        ) : null}
      </div>
    </div>
  );
}
