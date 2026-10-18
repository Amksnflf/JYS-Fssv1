import { useMemo, useState } from 'react';
import { ChevronLeft, Check, Search, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import LanguageFlag from '@/components/LanguageFlag';
import { setLang, SUPPORTED_LANGUAGES, type SupportedLanguage } from '@/i18n';
import { toast } from '@/components/Toast';

export default function LanguagePage() {
  const nav = useNavigate();
  const { t, i18n } = useTranslation();
  const [keyword, setKeyword] = useState('');

  const current =
    SUPPORTED_LANGUAGES.find((item) => item.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  const filteredLanguages = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    if (!q) return SUPPORTED_LANGUAGES;
    return SUPPORTED_LANGUAGES.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.subLabel.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q)
    );
  }, [keyword]);

  const chooseLanguage = (item: SupportedLanguage) => {
    if (item.code === i18n.language) {
      nav(-1);
      return;
    }
    setLang(item.code);
    toast.success(item.label);
    nav(-1);
  };

  return (
    <div className="mx-auto min-h-screen max-w-md bg-slate-50/60 pb-12 text-slate-900">
      {/* 顶部导航栏 */}
      <header className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-slate-100 bg-white/95 px-4 backdrop-blur shadow-2xs">
        <button
          type="button"
          onClick={() => nav(-1)}
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 transition active:scale-95 cursor-pointer -ml-1"
          aria-label="back"
        >
          <ChevronLeft size={22} strokeWidth={2.2} />
        </button>
        <h1 className="text-base font-bold text-slate-900 tracking-tight">
          {t('profile.languageSettings', '语言设置')}
        </h1>
        <div className="w-8" />
      </header>

      {/* 搜索框 */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-white rounded-xl px-3 h-10 border border-slate-200/80 shadow-2xs focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/10 transition">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('profile.searchLanguage', '搜索语言 / Search language')}
            className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400 text-sm"
          />
          {keyword && (
            <button
              type="button"
              onClick={() => setKeyword('')}
              className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-2 space-y-4">
        {/* 当前生效语言卡片（仅在未搜索时展示） */}
        {!keyword && (
          <div>
            <div className="text-xs font-semibold text-slate-400 mb-2 px-1">
              {t('profile.currentLanguage', '当前语言')}
            </div>
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
              <div className="flex items-center gap-3">
                <LanguageFlag flag={current.flag} className="h-[22px] w-[30px] rounded-[3px] shadow-2xs shrink-0" />
                <div>
                  <div className="text-[15px] font-bold text-slate-900 leading-tight">
                    {current.label}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {current.subLabel}
                  </div>
                </div>
              </div>
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#E6F9F0] text-[#00B578] border border-emerald-200/50 text-xs font-bold shadow-2xs">
                <Check size={13} strokeWidth={3} />
                <span>{t('profile.inUse', '使用中')}</span>
              </span>
            </div>
          </div>
        )}

        {/* 全部语言列表 */}
        <div>
          <div className="text-xs font-semibold text-slate-400 mb-2 px-1">
            {keyword ? t('profile.searchResults', '搜索结果') : t('profile.allLanguages', '选择语言')}
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white overflow-hidden divide-y divide-slate-100 shadow-2xs">
            {filteredLanguages.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-sm">
                {t('profile.noLanguageMatch', '未找到匹配的语言')}
              </div>
            ) : (
              filteredLanguages.map((item) => {
                const active = item.code === i18n.language;
                return (
                  <button
                    key={item.code}
                    type="button"
                    onClick={() => chooseLanguage(item)}
                    className={`flex h-[58px] w-full items-center justify-between px-4 text-left transition cursor-pointer active:bg-slate-50 ${
                      active ? 'bg-emerald-50/20' : 'hover:bg-slate-50/70'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <LanguageFlag flag={item.flag} className="h-[20px] w-[28px] rounded-[3px] shadow-2xs shrink-0" />
                      <div className="min-w-0">
                        <div className={`text-[15px] leading-tight ${active ? 'font-bold text-slate-900' : 'font-medium text-slate-800'}`}>
                          {item.label}
                        </div>
                        <div className="text-xs text-slate-400 leading-tight mt-0.5">
                          {item.subLabel}
                        </div>
                      </div>
                    </div>
                    {active && (
                      <div className="flex items-center justify-center h-6 w-6 rounded-full bg-[#E6F9F0] text-[#00B578] shadow-2xs shrink-0">
                        <Check size={14} strokeWidth={3} />
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
