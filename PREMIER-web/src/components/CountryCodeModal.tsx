import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, X, Check } from 'lucide-react';
import { BottomSheet } from './AsterUI';
import {
  COUNTRY_LIST,
  POPULAR_COUNTRY_CODES,
  searchCountries,
  type CountryCodeItem,
} from '@/data/countryCodes';

export interface CountryCodeModalProps {
  open: boolean;
  onClose: () => void;
  value: string;
  onSelect: (item: CountryCodeItem) => void;
}

export default function CountryCodeModal({
  open,
  onClose,
  value,
  onSelect,
}: CountryCodeModalProps) {
  const { t } = useTranslation();
  const [keyword, setKeyword] = useState('');

  const filteredList = useMemo(() => {
    return searchCountries(keyword);
  }, [keyword]);

  const popularCountries = useMemo(() => {
    return POPULAR_COUNTRY_CODES.map((code) =>
      COUNTRY_LIST.find((c) => c.code === code)
    ).filter(Boolean) as CountryCodeItem[];
  }, []);

  const cleanCurrentCode = value.replace(/\D/g, '');

  const handlePick = (item: CountryCodeItem) => {
    onSelect(item);
    onClose();
    setKeyword('');
  };

  const handleClose = () => {
    onClose();
    setKeyword('');
  };

  return (
    <BottomSheet open={open} onClose={handleClose} className="max-h-[85vh] flex flex-col">
      {/* 头部标题与关闭 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <span className="text-base font-bold text-slate-900">
          {t('auth.selectCountry', '选择国家或地区')}
        </span>
        <button
          type="button"
          onClick={handleClose}
          className="p-1 text-slate-400 hover:text-slate-600 transition rounded-full hover:bg-slate-100 cursor-pointer"
          aria-label="close"
        >
          <X size={20} />
        </button>
      </div>

      {/* 搜索框 */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-slate-100/90 rounded-xl px-3 h-10 text-sm focus-within:bg-white focus-within:border focus-within:border-cyan-500 focus-within:ring-2 focus-within:ring-cyan-500/10 transition">
          <Search size={16} className="text-slate-400 shrink-0" />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t('auth.searchCountryPlaceholder', '搜索国家/地区名称或区号')}
            className="flex-1 bg-transparent outline-none text-slate-900 placeholder:text-slate-400 text-sm"
            autoFocus
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

      {/* 常用国家/地区推荐（未搜索时展示） */}
      {!keyword && (
        <div className="px-4 py-2 border-b border-slate-50">
          <div className="text-xs font-semibold text-slate-400 mb-2">
            {t('auth.popularCountries', '常用国家与地区')}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {popularCountries.slice(0, 10).map((c) => {
              const active = c.code === cleanCurrentCode;
              return (
                <button
                  key={c.nameZh + c.code}
                  type="button"
                  onClick={() => handlePick(c)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition cursor-pointer active:scale-95 ${
                    active
                      ? 'bg-cyan-50 border-cyan-300 text-cyan-600 font-bold shadow-2xs'
                      : 'bg-slate-50 border-slate-200/70 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{c.flag}</span>
                  <span>{c.nameZh}</span>
                  <span className="text-slate-400 num font-normal tabular-nums">+{c.code}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 国家/地区列表 */}
      <div className="flex-1 overflow-y-auto px-2 py-1 divide-y divide-slate-50 scrollbar-none">
        {filteredList.length === 0 ? (
          <div className="py-12 text-center text-slate-400 text-sm">
            {t('auth.noCountryMatch', '未找到相关国家或地区')}
          </div>
        ) : (
          filteredList.map((item) => {
            const active = item.code === cleanCurrentCode;
            return (
              <button
                key={item.nameZh + item.code + item.iso2}
                type="button"
                onClick={() => handlePick(item)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition cursor-pointer text-left ${
                  active
                    ? 'bg-cyan-50/70 text-cyan-700 font-semibold'
                    : 'hover:bg-slate-50 text-slate-800 active:bg-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span className="text-xl leading-none select-none">{item.flag}</span>
                  <div className="min-w-0 flex items-baseline gap-1.5">
                    <span className="text-sm font-medium truncate text-slate-900">
                      {item.nameZh}
                    </span>
                    <span className="text-xs text-slate-400 truncate">
                      {item.nameEn}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-sm font-semibold text-slate-500 num tabular-nums">
                    +{item.code}
                  </span>
                  {active && <Check size={16} className="text-cyan-600" />}
                </div>
              </button>
            );
          })
        )}
      </div>
    </BottomSheet>
  );
}
