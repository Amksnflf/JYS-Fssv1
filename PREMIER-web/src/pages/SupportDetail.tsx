import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { findTutorial } from '@/data/tutorials';
import { useResponsive } from '@/hooks/useResponsive';
import { PcContainer } from '@/components/pc';

export default function SupportDetailPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const { isPc } = useResponsive();
  const article = findTutorial(id);

  if (!article) {
    return <Navigate to="/support" replace />;
  }

  const title = t(`tutorials.${article.id}.title`);
  const paragraphs = t(`tutorials.${article.id}.paragraphs`, {
    returnObjects: true,
  }) as string[];
  const headingIndices = new Set(article.headingIndices ?? []);

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <article className="mx-auto w-[900px] rounded-lg border border-line bg-bg p-8">
            <h1 className="text-[28px] font-semibold leading-tight text-text">{title}</h1>
            <div className="mt-3 text-[14px] font-medium text-textSubPc">{article.publishedAt}</div>
            <div className="mt-8 space-y-4 text-[15px] leading-8 text-textSubPc">
              {paragraphs.map((text, index) => {
                const isHeading = headingIndices.has(index);
                return isHeading ? (
                  <h2 key={`${text}-${index}`} className="pt-2 text-[20px] font-semibold text-text">
                    {text}
                  </h2>
                ) : (
                  <p key={`${text}-${index}`}>{text}</p>
                );
              })}
            </div>
            {article.image && (
              <img
                src={article.image}
                alt=""
                className="mt-6 block w-full rounded-md object-cover"
              />
            )}
          </article>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-12 md:bg-[#3c3c3c] md:py-6">
      <article className="mx-auto min-h-screen w-full max-w-md bg-bg">
        <PageHeader title={t('support.detail')} fallbackPath="/support" />
        <div className="px-4 pb-8 pt-7">
          <h1 className="fade-in-top text-[25px] font-black leading-tight text-text">{title}</h1>
          <div className="fade-in-left mt-3 text-[15px] font-medium text-[#2b6da8]">{article.publishedAt}</div>

          <div className="fade-in-bottom-small mt-5 space-y-1 text-[15px] font-medium leading-[1.75] text-[#333]">
            {paragraphs.map((text, index) => {
              const isHeading = headingIndices.has(index);
              return isHeading ? (
                <h2 key={`${text}-${index}`} className="pt-1 font-black text-text">
                  {text}
                </h2>
              ) : (
                <p key={`${text}-${index}`}>{text}</p>
              );
            })}
          </div>

          {article.image && (
            <img
              src={article.image}
              alt=""
              className="fade-in-bottom-small mt-3 block w-full rounded-sm object-cover"
            />
          )}
        </div>
      </article>
    </div>
  );
}
