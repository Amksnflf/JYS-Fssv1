import type { ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatLegalLabel, getAgreementCopy, getLegalPath } from '@/data/legalDocuments';
import { useAuthPageTranslation } from './authI18n';

interface Props {
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}

function AgreementLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="font-semibold text-[#14945a] underline decoration-[#14945a]/40 underline-offset-4 hover:text-[#0d7b49]"
    >
      {label}
    </Link>
  );
}

export default function AuthAgreement({ checked, onChange, className = '' }: Props) {
  const { t } = useAuthPageTranslation();
  const { i18n } = useTranslation();
  const currentLang = i18n.resolvedLanguage ?? i18n.language ?? 'en';
  const copy = getAgreementCopy(currentLang);
  const termsLabel = formatLegalLabel(t('home.terms'), currentLang);
  const privacyLabel = formatLegalLabel(t('home.privacy'), currentLang);
  const amlLabel = formatLegalLabel(t('home.aml'), currentLang);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    onChange(event.target.checked);
  };

  return (
    <div className={`flex items-start gap-2 text-[12px] font-medium leading-5 text-[#667085] ${className}`.trim()}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        className="mt-0.5 h-4 w-4 shrink-0 rounded border-line accent-primary"
      />
      <p className="flex-1">
        {copy.prefix}
        {copy.afterPrefix}
        <AgreementLink to={getLegalPath('terms')} label={termsLabel} />
        {copy.betweenTermsAndPrivacy}
        <AgreementLink to={getLegalPath('privacy')} label={privacyLabel} />
        {copy.betweenPrivacyAndAml}
        <AgreementLink to={getLegalPath('aml')} label={amlLabel} />
        {copy.suffix}
      </p>
    </div>
  );
}
