import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Eye } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { fetchNewsDetail, type NewsItem } from '@/api/quote';
import PageHeader from '@/components/PageHeader';
import { PcContainer } from '@/components/pc';
import { toast } from '@/components/Toast';
import { useResponsive } from '@/hooks/useResponsive';
import { formatNewsTime, getNewsAvatar, getNewsCover } from '@/utils/newsMedia';
import { brandName } from '@/brand';

export default function NewsDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const newsId = Number(id);
  const { isPc } = useResponsive();
  const [news, setNews] = useState<NewsItem | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!Number.isFinite(newsId)) return;
    setLoading(true);
    fetchNewsDetail(newsId)
      .then((data) => setNews(data ?? null))
      .catch((error) => {
        setNews(null);
        toast.error(error instanceof Error ? error.message : t('news.loadFailed'));
      })
      .finally(() => setLoading(false));
  }, [newsId]);

  if (!Number.isFinite(newsId)) {
    return <Navigate to="/market" replace />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg">
        <PageHeader title={t('news.detailTitle')} fallbackPath="/market" />
        <div className="px-4 pt-6">
          <div className="h-8 w-2/3 animate-pulse rounded bg-bgSoft" />
          <div className="mt-4 h-4 w-1/3 animate-pulse rounded bg-bgSoft" />
          <div className="mt-6 h-60 animate-pulse rounded-xl bg-bgSoft" />
        </div>
      </div>
    );
  }

  if (!news) {
    return <Navigate to="/market" replace />;
  }

  const content = news.content || news.summary || `<p>${t('news.noContent')}</p>`;
  const sourceName = news.author || news.sourceName || brandName;
  const authorAvatar = getNewsAvatar(news);
  const cover = getNewsCover(news);

  const contentClassName =
    'news-html mt-6 text-[15px] leading-7 text-[#333] [&_figure]:my-4 [&_img]:my-4 [&_img]:max-w-full [&_img]:rounded-lg [&_p]:my-4 [&_table]:w-full [&_table]:border-collapse [&_td]:border [&_td]:border-line [&_td]:p-2 [&_th]:border [&_th]:border-line [&_th]:bg-bgSoft [&_th]:p-2';

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <article className="mx-auto w-[920px] rounded-lg border border-line bg-bg p-8">
            <div className="text-[13px] font-medium text-textSubPc">
              <Link to="/market" className="hover:text-text">
                {t('nav.market')}
              </Link>
              <span className="px-2">/</span>
              <span>{t('news.detailTitle')}</span>
            </div>
            <h1 className="mt-4 text-[32px] font-semibold leading-tight text-text">{news.title}</h1>
            <div className="mt-5 flex flex-wrap items-center gap-4 text-[14px] text-textSubPc">
              <img src={authorAvatar} alt={sourceName} className="h-11 w-11 rounded-full object-cover" />
              <span>{sourceName}</span>
              <span>{formatNewsTime(news.publishedAt)}</span>
              <span className="inline-flex items-center gap-1">
                <Eye size={15} />
                {news.viewCount ?? 0}
              </span>
            </div>
            <img src={cover} alt="" className="mt-6 block h-[340px] w-full rounded-xl object-cover" />
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
    <div className="min-h-screen bg-bg pb-12 md:bg-[#3c3c3c] md:py-6">
      <article className="mx-auto min-h-screen w-full max-w-md bg-bg">
        <PageHeader title={t('news.detailTitle')} fallbackPath="/market" />
        <div className="px-4 pb-8 pt-6">
          <h1 className="text-[26px] font-black leading-tight text-text">{news.title}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-textSub">
            <img src={authorAvatar} alt={sourceName} className="h-10 w-10 rounded-full object-cover" />
            <span>{sourceName}</span>
            <span>{formatNewsTime(news.publishedAt)}</span>
            <span className="inline-flex items-center gap-1">
              <Eye size={14} />
              {news.viewCount ?? 0}
            </span>
          </div>
          <img src={cover} alt="" className="mt-5 block w-full rounded-xl object-cover" />
          <div className={contentClassName} dangerouslySetInnerHTML={{ __html: content }} />
        </div>
      </article>
    </div>
  );
}
