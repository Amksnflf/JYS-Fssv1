import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { fetchAnnouncementDetail, type AnnouncementItem } from '@/api/announcement';
import PageHeader from '@/components/PageHeader';
import { PcContainer } from '@/components/pc';
import { toast } from '@/components/Toast';
import { useResponsive } from '@/hooks/useResponsive';

function formatAnnouncementTime(value?: string) {
  if (!value) return '';
  return value.replace(/-/g, '/').slice(0, 19);
}

export default function AnnouncementDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const announcementId = Number(id);
  const { isPc } = useResponsive();
  const [announcement, setAnnouncement] = useState<AnnouncementItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(announcementId)) return;
    setLoading(true);
    fetchAnnouncementDetail(announcementId)
      .then((data) => setAnnouncement(data ?? null))
      .catch((error) => {
        setAnnouncement(null);
        toast.error(error instanceof Error ? error.message : t('common.noData'));
      })
      .finally(() => setLoading(false));
  }, [announcementId, t]);

  if (!Number.isFinite(announcementId)) {
    return <Navigate to="/announcement" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <PageHeader title={t('profile.notice')} fallbackPath="/announcement" />
        <div className="mx-auto w-full max-w-md px-4 pt-6">
          <div className="h-8 w-2/3 animate-pulse rounded bg-bgSoft" />
          <div className="mt-4 h-4 w-1/3 animate-pulse rounded bg-bgSoft" />
          <div className="mt-6 h-44 animate-pulse rounded-2xl bg-bgSoft" />
        </div>
      </div>
    );
  }

  if (!announcement) {
    return <Navigate to="/announcement" replace />;
  }

  const time = formatAnnouncementTime(announcement.publishedAt ?? announcement.createdAt);
  const content = announcement.content?.trim() ? announcement.content : `<p>${t('common.noData')}</p>`;
  const contentClassName =
    'announcement-html mt-6 text-[15px] leading-7 text-[#333] [&_figure]:my-4 [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_p]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:p-2 [&_th]:border [&_th]:border-line [&_th]:bg-bgSoft [&_th]:p-2';

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <article className="mx-auto w-[920px] rounded-lg border border-line bg-bg p-8">
            <div className="text-[13px] font-medium text-textSubPc">
              <Link to="/announcement" className="hover:text-text">
                {t('profile.notice')}
              </Link>
              <span className="px-2">/</span>
              <span>{announcement.title}</span>
            </div>
            <h1 className="mt-4 text-[32px] font-semibold leading-tight text-text">{announcement.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-[14px] text-textSubPc">
              {announcement.category ? <span className="rounded-full bg-bgSection px-3 py-1 text-text">{announcement.category}</span> : null}
              <span>{time}</span>
            </div>
            <div
              className={`${contentClassName} mt-8 text-textSubPc leading-8`}
              dangerouslySetInnerHTML={{ __html: content }}
            />
          </article>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg">
      <article className="mx-auto min-h-screen w-full max-w-md bg-bg">
        <PageHeader title={t('profile.notice')} fallbackPath="/announcement" />
        <div className="px-4 pb-8 pt-6">
          <div className="flex flex-wrap items-center gap-2 text-xs text-textSub">
            {announcement.category ? <span className="rounded-full bg-bgSoft px-2 py-1">{announcement.category}</span> : null}
            <span>{time}</span>
          </div>
          <h1 className="mt-4 text-[26px] font-black leading-tight text-text">{announcement.title}</h1>
          <div className={contentClassName} dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </article>
    </div>
  );
}
