import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Camera, CheckCircle2, Loader2, UploadCloud } from 'lucide-react';
import { myKyc, submitKyc, uploadKycImage, type KycRecord } from '@/api/kyc';
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
  const [uploadingField, setUploadingField] = useState<'front' | 'back' | 'face' | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    myKyc()
      .then((list) => {
        const rows = list ?? [];
        setRecords(rows);
        const existing = rows.find((r) => r.level === level) || rows.find((r) => r.level === 1);
        if (existing) {
          if (existing.country) setCountry(existing.country);
          if (existing.realName) setRealName(existing.realName);
          if (existing.idType) setIdType(existing.idType);
          if (existing.idNo) setIdNo(existing.idNo);
          if (existing.idFrontUrl) setIdFrontUrl(existing.idFrontUrl);
          if (existing.idBackUrl) setIdBackUrl(existing.idBackUrl);
          if (existing.faceUrl) setFaceUrl(existing.faceUrl);
        }
      })
      .catch(() => undefined);
  }, [level]);

  const currentRecord = records.find((r) => r.level === level);
  const passed = currentRecord && currentRecord.auditStatus === 1;
  const pending = currentRecord && currentRecord.auditStatus === 0;
  const rejected = currentRecord && currentRecord.auditStatus === 2;

  const handlePhotoSelect = async (field: 'front' | 'back' | 'face', file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error(t('kyc.invalidImage', '请选择有效的图片文件'));
      return;
    }
    setUploadingField(field);
    try {
      const url = await uploadKycImage(file);
      if (field === 'front') setIdFrontUrl(url);
      else if (field === 'back') setIdBackUrl(url);
      else setFaceUrl(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('kyc.uploadFailed', '图片上传失败，请重试'));
    } finally {
      setUploadingField(null);
    }
  };

  const submit = async () => {
    if (!realName.trim() || !idNo.trim()) return toast.error(t('kyc.fillNameId'));
    if (level === 2 && (!idFrontUrl || !idBackUrl || !faceUrl)) {
      return toast.error(t('kyc.advancedNeedPhotos'));
    }
    setLoading(true);
    try {
      await submitKyc({
        level,
        country: country.trim(),
        realName: realName.trim(),
        idType,
        idNo: idNo.trim(),
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
                  type="button"
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
              <KycPhotoUploadCard
                label={t('kyc.idFrontUrl')}
                value={idFrontUrl}
                uploading={uploadingField === 'front'}
                onSelect={(file) => handlePhotoSelect('front', file)}
              />
              <KycPhotoUploadCard
                label={t('kyc.idBackUrl')}
                value={idBackUrl}
                uploading={uploadingField === 'back'}
                onSelect={(file) => handlePhotoSelect('back', file)}
              />
              <KycPhotoUploadCard
                label={t('kyc.faceUrl')}
                value={faceUrl}
                uploading={uploadingField === 'face'}
                onSelect={(file) => handlePhotoSelect('face', file)}
              />
              <div className="text-xs text-textSub">
                {t('kyc.uploadTip')}
              </div>
            </>
          )}

          <button className="btn-primary w-full" disabled={loading || uploadingField !== null} onClick={submit}>
            {loading ? t('kyc.submitting') : t('kyc.submitReview')}
          </button>
        </div>
      )}
    </div>
  );
}

function KycPhotoUploadCard({
  label,
  value,
  uploading,
  onSelect,
}: {
  label: string;
  value: string;
  uploading: boolean;
  onSelect: (file?: File | null) => void;
}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Field label={label}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          onSelect(f);
          e.target.value = '';
        }}
      />
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="group relative flex h-40 w-full flex-col items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-bgSoft/60 transition hover:border-primary/60 hover:bg-bgSoft"
      >
        {value ? (
          <>
            <img src={value} alt={label} className="h-full w-full object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition group-hover:opacity-100">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-900 shadow">
                <Camera size={14} />
                {t('kyc.reupload', '重新上传')}
              </span>
            </div>
            <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-0.5 text-[11px] font-semibold text-white shadow">
              <CheckCircle2 size={12} />
              {t('kyc.uploaded', '已上传')}
            </span>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-2 text-primary">
            <Loader2 size={26} className="animate-spin" />
            <span className="text-xs font-medium">{t('common.loading', '极速压缩上传中...')}</span>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 px-4 text-center text-textSub">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <UploadCloud size={22} />
            </div>
            <span className="text-xs font-semibold text-text">{t('kyc.clickToUpload', '点击拍摄或选择证件照片')}</span>
            <span className="text-[11px] text-textSub/80">JPG / PNG / WEBP · {t('kyc.fastCompressHint', '自动极速智能压缩')}</span>
          </div>
        )}
      </button>
    </Field>
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
