import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import AuthLayout from './AuthLayout';
import { forgotPassword, sendCode } from '@/api/auth';
import { toast } from '@/components/Toast';
import CountryCodeModal from '@/components/CountryCodeModal';
import { findCountryByCode } from '@/data/countryCodes';

type Tab = 'phone' | 'email';

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>('phone');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);

  const [countryCode, setCountryCode] = useState('86');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const currentCountry = useMemo(() => findCountryByCode(countryCode), [countryCode]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [confirmPwd, setConfirmPwd] = useState('');
  const [countdown, setCountdown] = useState(0);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const onSendCode = async () => {
    if (tab === 'phone' && (!countryCode || !phone)) return toast.error(t('auth.phonePlaceholder'));
    if (tab === 'email' && !email) return toast.error(t('auth.emailPlaceholder'));
    try {
      await sendCode({
        targetType: tab,
        target: tab === 'phone' ? phone : email,
        countryCode: tab === 'phone' ? countryCode : undefined,
        scene: 'reset_pwd',
      });
      startCountdown();
      toast.success(t('authError.codeSent'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('authError.sendFailed'));
    }
  };

  const submit = async () => {
    if (tab === 'phone' && (!countryCode || !phone)) return toast.error(t('auth.phonePlaceholder'));
    if (tab === 'email' && !email) return toast.error(t('auth.emailPlaceholder'));
    if (!code) return toast.error(t('authError.codeHint'));
    if (!newPwd || newPwd.length < 8) return toast.error(t('auth.pwdRule'));
    if (newPwd !== confirmPwd) return toast.error(t('auth.pwdMismatch'));

    setLoading(true);
    try {
      await forgotPassword({
        type: tab,
        countryCode: tab === 'phone' ? countryCode : undefined,
        identifier: tab === 'phone' ? phone : email,
        code,
        newPassword: newPwd,
      });
      toast.success(t('auth.resetSuccess'));
      nav('/auth/login', { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('auth.resetFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.forgotPwd')}>
      <div className="flex gap-8 border-b border-line">
        <button
          onClick={() => setTab('phone')}
          className={`pb-3 text-base ${tab === 'phone' ? 'border-b-2 border-text font-medium' : 'text-textSub'}`}
        >
          {t('auth.tabPhone')}
        </button>
        <button
          onClick={() => setTab('email')}
          className={`pb-3 text-base ${tab === 'email' ? 'border-b-2 border-text font-medium' : 'text-textSub'}`}
        >
          {t('auth.tabEmail')}
        </button>
      </div>

      <div className="mt-6 space-y-3">
        {tab === 'phone' ? (
          <div className="input-base flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => setCountryPickerOpen(true)}
              className="flex items-center gap-1.5 py-1 text-slate-800 font-bold hover:text-cyan-600 transition cursor-pointer select-none shrink-0"
              title={t('auth.selectCountry', '选择国家或地区')}
            >
              <span className="text-base leading-none select-none">{currentCountry?.flag || '🌐'}</span>
              <span className="text-sm font-bold num tabular-nums text-slate-900 leading-none">+{countryCode}</span>
              <ChevronDown size={14} className="text-slate-400 hover:text-cyan-600 transition" />
            </button>
            <div className="h-4 w-px bg-slate-200 shrink-0" />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-textMute"
              placeholder={t('auth.phonePlaceholder')}
              inputMode="numeric"
            />
          </div>
        ) : (
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-base"
            placeholder={t('auth.emailPlaceholder')}
          />
        )}

        <div className="input-base flex items-center gap-2">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-transparent outline-none"
            placeholder={t('authError.codeHint')}
            inputMode="numeric"
            maxLength={6}
          />
          <button
            onClick={onSendCode}
            disabled={countdown > 0}
            className="text-sm text-primary disabled:text-textMute"
            type="button"
          >
            {countdown > 0 ? `${countdown}s` : t('authError.getCode')}
          </button>
        </div>

        <div className="input-base flex items-center">
          <input
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            type={showPwd ? 'text' : 'password'}
            className="flex-1 bg-transparent outline-none"
            placeholder={t('auth.newPwdPlaceholder')}
            maxLength={32}
          />
          <button onClick={() => setShowPwd(!showPwd)} className="text-textSub" type="button">
            {showPwd ? <Eye size={16} /> : <EyeOff size={16} />}
          </button>
        </div>

        <input
          value={confirmPwd}
          onChange={(e) => setConfirmPwd(e.target.value)}
          type={showPwd ? 'text' : 'password'}
          className="input-base"
          placeholder={t('auth.confirmPwdPlaceholder')}
          maxLength={32}
        />

        <button className="btn-primary w-full mt-2 disabled:opacity-50" disabled={loading} onClick={submit}>
          {loading ? t('common.loading') : t('common.confirm')}
        </button>
      </div>

      <CountryCodeModal
        open={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        value={countryCode}
        onSelect={(item) => setCountryCode(item.code)}
      />
    </AuthLayout>
  );
}
