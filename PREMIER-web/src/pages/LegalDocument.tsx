import { Navigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '@/components/PageHeader';
import { PcContainer } from '@/components/pc';
import { useResponsive } from '@/hooks/useResponsive';
import { getLegalDocument, getLegalDocumentKey } from '@/data/legalDocuments';

export default function LegalDocumentPage() {
  const { type } = useParams();
  const { i18n } = useTranslation();
  const { isPc } = useResponsive();
  const legalKey = getLegalDocumentKey(type);

  if (!legalKey) {
    return <Navigate to="/" replace />;
  }

  const document = getLegalDocument(i18n.language, legalKey);

  if (isPc) {
    return (
      <div className="bg-bg py-10 text-text">
        <PcContainer>
          <article className="mx-auto w-[920px] rounded-2xl border border-line bg-bg px-10 py-9 shadow-card">
            <h1 className="text-[30px] font-semibold leading-tight text-text">{document.title}</h1>
            <p className="mt-4 text-[16px] leading-7 text-textSubPc">{document.intro}</p>
            <div className="mt-4 text-[14px] font-medium text-[#0f9d58]">{document.updatedAt}</div>
            <div className="mt-8 space-y-8">
              {document.sections.map((section) => (
                <section key={section.title} className="space-y-4">
                  <h2 className="text-[21px] font-semibold leading-8 text-text">{section.title}</h2>
                  <div className="space-y-3 text-[15px] leading-8 text-textSubPc">
                    {section.paragraphs.map((paragraph) => (
                      <p key={paragraph}>{paragraph}</p>
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </article>
        </PcContainer>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg pb-12 md:bg-[#3c3c3c] md:py-6">
      <article className="mx-auto min-h-screen w-full max-w-md bg-bg">
        <PageHeader title={document.title} fallbackPath="/" />
        <div className="px-5 pb-10 pt-7">
          <h1 className="text-[26px] font-black leading-tight text-text">{document.title}</h1>
          <p className="mt-4 text-[15px] leading-7 text-[#333]">{document.intro}</p>
          <div className="mt-3 text-[14px] font-semibold text-[#0f9d58]">{document.updatedAt}</div>
          <div className="mt-7 space-y-7">
            {document.sections.map((section) => (
              <section key={section.title} className="space-y-3">
                <h2 className="text-[18px] font-black leading-7 text-text">{section.title}</h2>
                <div className="space-y-3 text-[15px] leading-7 text-[#333]">
                  {section.paragraphs.map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
}
