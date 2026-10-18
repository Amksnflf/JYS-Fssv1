import { useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import AuthLayout from './AuthLayout';
import AuthAgreement from './AuthAgreement';
import { useAuthPageTranslation } from './authI18n';
import { register, sendCode, type RegisterPayload, type RegisterType } from '@/api/auth';
import { useUserStore } from '@/store/userStore';
import { toast } from '@/components/Toast';
import { getSafeRedirect, withRedirect } from './authRedirect';
import CountryCodeModal from '@/components/CountryCodeModal';
import { findCountryByCode } from '@/data/countryCodes';

const TABS: RegisterType[] = ['phone', 'email', 'account'];

export default function RegisterPage() {
  const { t } = useAuthPageTranslation();
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const loginSuccess = useUserStore((s) => s.loginSuccess);

  const [tab, setTab] = useState<RegisterType>('phone');
  const [showInvite, setShowInvite] = useState(true);
  const [showPwd, setShowPwd] = useState(false);
  const [agree, setAgree] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(false);

  const [countryCode, setCountryCode] = useState('86');
  const [countryPickerOpen, setCountryPickerOpen] = useState(false);
  const currentCountry = useMemo(() => findCountryByCode(countryCode), [countryCode]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [countdown, setCountdown] = useState(0);

  const tabLabel = (k: RegisterType) =>
    k === 'phone' ? t('auth.tabPhoneRegister') : k === 'email' ? t('auth.tabEmailRegister') : t('auth.tabAccountRegister');

  const targetForCode = () =>
    tab === 'phone' ? `${countryCode}${phone}` : email;

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
    if (tab === 'phone' && !countryCode) return toast.error(t('authError.countryCodeRequired'));
    if (tab === 'phone' && !phone) return toast.error(t('auth.phonePlaceholder'));
    if (tab === 'email' && !email) return toast.error(t('auth.emailPlaceholder'));
    try {
      await sendCode({
        targetType: tab === 'phone' ? 'phone' : 'email',
        target: tab === 'phone' ? phone : email,
        countryCode: tab === 'phone' ? countryCode : undefined,
        scene: 'register',
      });
      startCountdown();
      toast.success(t('authError.codeSent'));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('authError.sendFailed'));
    }
  };

  const goNext = () => {
    if (!agree) return toast.error(t('authError.agreeFirst'));
    if (tab === 'phone' && !countryCode) return toast.error(t('authError.countryCodeRequired'));
    if (tab === 'phone' && !phone) return toast.error(t('auth.phonePlaceholder'));
    if (tab === 'email' && !email) return toast.error(t('auth.emailPlaceholder'));
    if (tab === 'account' && (!account || account.length < 4)) return toast.error(t('authError.accountMin'));
    if (tab === 'account' && account.includes('@')) return toast.error(t('authError.accountInvalid'));
    setStep(2);
  };

  const onSubmit = async () => {
    if (!password || password.length < 8) return toast.error(t('authError.pwdMin'));
    if (password !== confirmPassword) return toast.error(t('authError.pwdMismatch'));
    if (tab !== 'account' && !code) return toast.error(t('authError.codeRequired'));

    const payload: RegisterPayload = {
      type: tab,
      password,
      inviteCode: inviteCode || undefined,
    };
    if (tab === 'phone') {
      payload.countryCode = countryCode;
      payload.phone = phone;
      payload.code = code;
    } else if (tab === 'email') {
      payload.email = email;
      payload.code = code;
    } else {
      payload.account = account;
    }

    setLoading(true);
    try {
      const vo = await register(payload);
      await loginSuccess(vo.token);
      toast.success(t('authError.registerSuccess'));
      nav(getSafeRedirect(redirect), { replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : t('authError.registerFailed'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout title={t('auth.welcome')}>
      <div className="flex gap-6 border-b border-line">
        {TABS.map((k) => (
          <button
            key={k}
            onClick={() => {
              setTab(k);
              setStep(1);
            }}
            className={`pb-3 text-base ${tab === k ? 'border-b-2 border-text font-medium' : 'text-textSub'}`}
          >
            {tabLabel(k)}
          </button>
        ))}
      </div>

      {step === 1 ? (
        <div className="mt-6 space-y-4">
          <div>
            <div className="text-sm text-text mb-2">
              {tab === 'phone' ? t('authError.phone') : tab === 'email' ? t('authError.email') : t('authError.account')}
            </div>
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
            ) : tab === 'email' ? (
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-base"
                placeholder={t('auth.emailPlaceholder')}
              />
            ) : (
              <input
                value={account}
                onChange={(e) => setAccount(e.target.value)}
                className="input-base"
                placeholder={t('auth.accountPlaceholder')}
              />
            )}
          </div>

          <div>
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="text-sm text-text mb-2 flex items-center gap-1"
              type="button"
            >
              {t('auth.inviteOptional')} <span className="text-textMute text-xs">{showInvite ? '▴' : '▾'}</span>
            </button>
            {showInvite && (
              <input
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                className="input-base"
                placeholder={t('auth.invitePlaceholder')}
              />
            )}
          </div>

          <AuthAgreement checked={agree} onChange={setAgree} className="mt-2" />

          <button className="btn-primary w-full mt-1 disabled:opacity-50" disabled={!agree} onClick={goNext}>
            {t('common.next')}
          </button>

          <div className="text-center text-sm text-textSub">
            <Link to={withRedirect('/auth/login', redirect)} className="text-text font-medium">
              {t('auth.haveAccount')}
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-4">
          <div>
            <div className="text-sm text-text mb-2">{t('authError.setPassword')}</div>
            <div className="input-base flex items-center">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type={showPwd ? 'text' : 'password'}
                className="flex-1 bg-transparent outline-none"
                placeholder={t('authError.pwdHint')}
              />
              <button onClick={() => setShowPwd(!showPwd)} className="text-textSub" type="button">
                {showPwd ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          <div>
            <div className="text-sm text-text mb-2">{t('authError.confirmPassword')}</div>
            <div className="input-base flex items-center">
              <input
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                type={showPwd ? 'text' : 'password'}
                className="flex-1 bg-transparent outline-none"
                placeholder={t('authError.confirmPasswordHint')}
              />
            </div>
          </div>

          {tab !== 'account' && (
            <div>
              <div className="text-sm text-text mb-2">{t('authError.code')}</div>
              <div className="flex gap-3">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="input-base flex-1"
                  placeholder={t('authError.codeHint')}
                  inputMode="numeric"
                  maxLength={6}
                />
                <button
                  onClick={onSendCode}
                  disabled={countdown > 0}
                  className="h-11 px-4 rounded-lg border border-line text-sm whitespace-nowrap disabled:text-textMute"
                  type="button"
                >
                  {countdown > 0 ? `${countdown}s` : t('authError.getCode')}
                </button>
              </div>
              <div className="text-xs text-textSub mt-1">
                {t('authError.target', { target: targetForCode() })}
              </div>
            </div>
          )}

          <button className="btn-primary w-full mt-2 disabled:opacity-50" disabled={loading} onClick={onSubmit}>
            {loading ? t('common.loading') : t('auth.register')}
          </button>

          <button onClick={() => setStep(1)} className="text-sm text-textSub w-full text-center" type="button">
            {t('common.back')}
          </button>
        </div>
      )}

      <CountryCodeModal
        open={countryPickerOpen}
        onClose={() => setCountryPickerOpen(false)}
        value={countryCode}
        onSelect={(item) => setCountryCode(item.code)}
      />
    </AuthLayout>
  );
}
