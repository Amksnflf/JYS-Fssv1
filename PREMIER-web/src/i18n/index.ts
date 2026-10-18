import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import zhTW from './locales/zh-TW';
import zhCNBase from './locales/zh-CN';
import enBase from './locales/en';
import de from './locales/de';
import ru from './locales/ru';
import ar from './locales/ar';
import ptBR from './locales/pt-BR';
import fr from './locales/fr';
import es from './locales/es';
import tr from './locales/tr';
import ja from './locales/ja';
import ko from './locales/ko';
import vi from './locales/vi';
import id from './locales/id';
import th from './locales/th';
import { preloadLanguageFlags } from '@/components/LanguageFlag';

const lockEarnLocalePatch = {
  records: 'Records',
  lockHeroTitle: 'Lock Earn Strategy',
  lockHeroDesc: 'A global leading intelligent wealth platform',
  lockSearchPlaceholder: 'Search investment products',
  recommendedInvestments: 'Recommended investments',
  hotTag: 'Hot',
  purchaseRecords: 'Purchase Records',
  purchaseAmount: 'Purchase Amount',
  purchaseAmountPlaceholder: 'Enter amount',
  chooseDuration: 'Choose Duration',
  availableBalance: 'Available Balance',
  serviceFee: 'Service Fee',
  tierYieldRate: 'Tier Yield Rate',
  interestDistribution: 'Interest Distribution',
  trustPrincipal: 'Principal Return',
  singleLimit: 'Single Limit',
  estimatedIncome: 'Estimated Income',
  estimatedDailyHint: 'Estimated daily income {{amount}} {{coin}}',
  dailyPayout: 'Daily Payout',
  returnOnMaturity: 'Return On Maturity',
  amountMinError: 'Amount must not be less than {{amount}} {{coin}}',
  amountMaxError: 'Amount must not exceed {{amount}} {{coin}}',
  recordCoin: 'Coin',
  recordDuration: 'Duration',
  recordYieldRate: 'Yield Rate',
  recordMaturedProfit: 'Matured Profit',
  recordRedeemedAmount: 'Redeemed Amount',
} as const;

const zhCN = {
  ...zhCNBase,
  finance: {
    ...zhCNBase.finance,
    records: '记录',
    lockHeroTitle: '锁仓赚币策略',
    lockHeroDesc: '全球领先的智能理财平台',
    lockSearchPlaceholder: '搜索投资产品',
    recommendedInvestments: '推荐投资',
    hotTag: '热门',
    purchaseRecords: '申购记录',
    purchaseAmount: '申购金额',
    purchaseAmountPlaceholder: '请输入金额',
    chooseDuration: '选择期限',
    availableBalance: '可用余额',
    serviceFee: '服务费',
    tierYieldRate: '阶梯收益率',
    interestDistribution: '收益发放',
    trustPrincipal: '到期返本',
    singleLimit: '单笔上限',
    estimatedIncome: '预计收益',
    estimatedDailyHint: '预计每日收益 {{amount}} {{coin}}',
    dailyPayout: '每日发放',
    returnOnMaturity: '到期返还',
    amountMinError: '金额不得低于 {{amount}} {{coin}}',
    amountMaxError: '金额不得超过 {{amount}} {{coin}}',
    recordCoin: '币种',
    recordDuration: '期限',
    recordYieldRate: '收益率',
    recordMaturedProfit: '到期收益',
    recordRedeemedAmount: '赎回金额',
  },
};

const en = {
  ...enBase,
  finance: {
    ...enBase.finance,
    ...lockEarnLocalePatch,
  },
};

const STORAGE_KEY = 'aster_lang';
const defaultLang = (typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEY)) || 'en';

export type SupportedLanguage = {
  code: string;
  label: string;
  subLabel: string;
  flag: string;
};

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
  { code: 'zh-CN', label: '简体中文', subLabel: 'Simplified Chinese', flag: 'cn' },
  { code: 'en', label: 'English', subLabel: 'English', flag: 'en' },
  { code: 'zh-TW', label: '繁體中文', subLabel: 'Traditional Chinese', flag: 'tw' },
  { code: 'ja', label: '日本語', subLabel: 'Japanese', flag: 'jp' },
  { code: 'ko', label: '한국어', subLabel: 'Korean', flag: 'kr' },
  { code: 'vi', label: 'Tiếng Việt', subLabel: 'Vietnamese', flag: 'vn' },
  { code: 'id', label: 'Indonesia', subLabel: 'Indonesian', flag: 'id' },
  { code: 'th', label: 'ไทย', subLabel: 'Thai', flag: 'th' },
  { code: 'es', label: 'Español', subLabel: 'Spanish', flag: 'es' },
  { code: 'pt-BR', label: 'Português', subLabel: 'Portuguese', flag: 'br' },
  { code: 'fr', label: 'Français', subLabel: 'French', flag: 'fr' },
  { code: 'de', label: 'Deutsch', subLabel: 'German', flag: 'de' },
  { code: 'ru', label: 'Русский', subLabel: 'Russian', flag: 'ru' },
  { code: 'tr', label: 'Türkçe', subLabel: 'Turkish', flag: 'tr' },
  { code: 'ar', label: 'عربي', subLabel: 'Arabic', flag: 'ar' },
];

preloadLanguageFlags(SUPPORTED_LANGUAGES.map((item) => item.flag));

const applyDocumentDirection = (lang: string) => {
  if (typeof document === 'undefined') return;
  document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
};

i18n.use(initReactI18next).init({
  resources: {
    'zh-TW': { translation: zhTW },
    'zh-CN': { translation: zhCN },
    en: { translation: en },
    de: { translation: de },
    ru: { translation: ru },
    ar: { translation: ar },
    'pt-BR': { translation: ptBR },
    fr: { translation: fr },
    es: { translation: es },
    tr: { translation: tr },
    ja: { translation: ja },
    ko: { translation: ko },
    vi: { translation: vi },
    id: { translation: id },
    th: { translation: th },
  },
  lng: defaultLang,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

applyDocumentDirection(defaultLang);

export const setLang = (lang: string) => {
  i18n.changeLanguage(lang);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, lang);
  }
  applyDocumentDirection(lang);
};

export default i18n;
