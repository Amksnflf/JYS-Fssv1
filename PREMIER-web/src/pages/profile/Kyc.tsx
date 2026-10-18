import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { myKyc, submitKyc, type KycRecord } from '@/api/kyc';
import { useUserStore } from '@/store/userStore';
import { toast } from '@/components/Toast';

const ID_TYPES = [
  { v: 'ID', labelKey: 'kyc.idCard' },
  { v: 'PASSPORT', labelKey: 'kyc.passport' },
  { v: 'DRIVER', labelKey: 'kyc.driver' },
];

export default function KycPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [params] = useSearchParams();
  const level = Number(params.get('level') || 1) as 1 | 2;
  const refreshUser = useUserStore((s) => s.refresh);

  const [records, setRecords] = useState<KycRecord[]>([]);
  const [country, setCountry] = useState(t('kyc.defaultCountry'));
  const [realName, setRealName] = useState('');
  const [idType, setIdType] = useState('ID');
  const [idNo, setIdNo] = useState('');
  const [idFrontUrl, setIdFrontUrl] = useState('');
  const [idBackUrl, setIdBackUrl] = useState('');
  const [faceUrl, setFaceUrl] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    myKyc().then(setRecords).catch(() => undefined);
  }, []);

  const currentRecord = records.find((r) => r.level === level);
  const passed = currentRecord && currentRecord.auditStatus === 1;
  const pending = currentRecord && currentRecord.auditStatus === 0;
  const rejected = currentRecord && currentRecord.auditStatus === 2;

  const submit = async () => {
    if (!realName || !idNo) return toast.error(t('kyc.fillNameId'));
    if (level === 2 && (!idFrontUrl || !idBackUrl || !faceUrl)) {
      return toast.error(t('kyc.advancedNeedPhotos'));
    }
    setLoading(true);
    try {
      await submitKyc({
        level,
        country,
        realName,
        idType,
        idNo,
        idFrontUrl: idFrontUrl || undefined,
        idBackUrl: idBackUrl || undefined,
        faceUrl: faceUrl || undefined,
      });
      toast.success(t('kyc.submitSuccess'));
      await refreshUser();
      const list = await myKyc();
      setRecords(list);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('kyc.submitFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 pb-8 pt-0 md:px-0">
      <div className="sticky top-0 z-30 -mx-4 mb-4 flex h-12 items-center border-b border-line bg-bg/95 px-4 backdrop-blur md:static md:mx-0 md:border-b-0 md:bg-transparent md:px-0 md:backdrop-blur-0">
        <button onClick={() => nav(-1)} className="w-9 h-9 -ml-2 flex items-center justify-center">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1 text-center text-base font-medium">
          {level === 1 ? t('security.primaryKyc') : t('security.advancedKyc')}
        </div>
        <div className="w-9" />
      </div>

      {passed && (
        <div className="bg-up/10 text-up rounded-lg p-4 text-sm">
          {t('kyc.passed', { level: level === 1 ? t('kyc.primary') : t('kyc.advanced') })}
        </div>
      )}
      {pending && (
        <div className="bg-bgSoft text-textSub rounded-lg p-4 text-sm">
          {t('kyc.pending')}
        </div>
      )}
      {rejected && (
        <div className="bg-down/10 text-down rounded-lg p-4 text-sm">
          {t('kyc.rejected', { reason: currentRecord?.auditRemark || t('kyc.resubmit') })}
        </div>
      )}

      {!passed && (
        <div className="mt-4 space-y-4">
          <Field label={t('kyc.country')}>
            <input className="input-base" value={country} onChange={(e) => setCountry(e.target.value)} />
          </Field>

          <Field label={t('kyc.realName')}>
            <input
              className="input-base"
              placeholder={t('kyc.sameAsId')}
              value={realName}
              onChange={(e) => setRealName(e.target.value)}
            />
          </Field>

          <Field label={t('kyc.idType')}>
            <div className="flex gap-2">
              {ID_TYPES.map((item) => (
                <button
                  key={item.v}
                  onClick={() => setIdType(item.v)}
                  className={`flex-1 h-10 rounded text-sm ${
                    idType === item.v ? 'bg-text text-white' : 'bg-bgSoft text-textSub'
                  }`}
                >
                  {t(item.labelKey)}
                </button>
              ))}
            </div>
          </Field>

          <Field label={t('kyc.idNo')}>
            <input className="input-base" value={idNo} onChange={(e) => setIdNo(e.target.value)} />
          </Field>

          {level === 2 && (
            <>
              <Field label={t('kyc.idFrontUrl')}>
                <input
                  className="input-base"
                  placeholder="https://..."
                  value={idFrontUrl}
                  onChange={(e) => setIdFrontUrl(e.target.value)}
                />
              </Field>
              <Field label={t('kyc.idBackUrl')}>
                <input
                  className="input-base"
                  placeholder="https://..."
                  value={idBackUrl}
                  onChange={(e) => setIdBackUrl(e.target.value)}
                />
              </Field>
              <Field label={t('kyc.faceUrl')}>
                <input
                  className="input-base"
                  placeholder="https://..."
                  value={faceUrl}
                  onChange={(e) => setFaceUrl(e.target.value)}
                />
              </Field>
              <div className="text-xs text-textSub">
                {t('kyc.uploadTip')}
              </div>
            </>
          )}

          <button className="btn-primary w-full" disabled={loading} onClick={submit}>
            {loading ? t('kyc.submitting') : t('kyc.submitReview')}
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-sm text-text mb-2">{label}</div>
      {children}
    </div>
  );
}
