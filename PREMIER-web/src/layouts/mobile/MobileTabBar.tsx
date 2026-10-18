import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

type IconKey = 'home' | 'market' | 'trade' | 'discover' | 'assets';

const tabs = [
  { to: '/', key: 'home' },
  { to: '/market', key: 'market' },
  { to: '/trade', key: 'trade' },
  { to: '/discover', key: 'discover' },
  { to: '/assets', key: 'assets' },
] as const;

const tabItemClassName =
  'relative group flex h-[50px] w-full min-w-0 flex-col items-center justify-center text-[11px] leading-none transition-all duration-150 cursor-pointer select-none';
const tabLabelClassName = 'mt-1 block text-center leading-tight tracking-tight';

function TabIcon({ name, active = false }: { name: IconKey; active?: boolean }) {
  if (name === 'home') {
    return (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="m3 9.5 9-7 9 7v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-10z"
          stroke={active ? '#00C4DF' : '#94A3B8'}
          strokeWidth={active ? '2.2' : '1.9'}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? 'rgba(0, 196, 223, 0.12)' : 'none'}
        />
        <path
          d="M9 21.5v-6a1.5 1.5 0 0 1 1.5-1.5h3a1.5 1.5 0 0 1 1.5 1.5v6"
          stroke={active ? '#00C4DF' : '#94A3B8'}
          strokeWidth={active ? '2.2' : '1.9'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'market') {
    return (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4 20.5h16"
          stroke={active ? '#00C4DF' : '#94A3B8'}
          strokeWidth={active ? '2.2' : '1.9'}
          strokeLinecap="round"
        />
        <path
          d="M6 16.5v-4M10 16.5V7M14 16.5v-6.5M18 16.5V5"
          stroke={active ? '#00C4DF' : '#94A3B8'}
          strokeWidth={active ? '2.4' : '2'}
          strokeLinecap="round"
        />
        <path
          d="m6 12.5 4-4.5 4 2.5 4-5.5"
          stroke={active ? '#00C4DF' : '#94A3B8'}
          strokeWidth={active ? '2.2' : '1.8'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (name === 'trade') {
    return (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M4.5 8.5h13m0 0l-3.5-3.5m3.5 3.5l-3.5 3.5"
          stroke={active ? '#00C4DF' : '#94A3B8'}
          strokeWidth={active ? '2.2' : '1.9'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M19.5 15.5H6.5m0 0l3.5 3.5m-3.5-3.5l3.5-3.5"
          stroke={active ? '#00C4DF' : '#94A3B8'}
          strokeWidth={active ? '2.2' : '1.9'}
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {active && (
          <circle cx="12" cy="12" r="1.5" fill="#00C4DF" />
        )}
      </svg>
    );
  }

  if (name === 'discover') {
    return (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle
          cx="12"
          cy="12"
          r="9"
          stroke={active ? '#00C4DF' : '#94A3B8'}
          strokeWidth={active ? '2.2' : '1.9'}
          fill={active ? 'rgba(0, 196, 223, 0.08)' : 'none'}
        />
        <polygon
          points="15.8 8.2 13.8 13.8 8.2 15.8 10.2 10.2 15.8 8.2"
          stroke={active ? '#00C4DF' : '#94A3B8'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill={active ? '#00C4DF' : 'none'}
        />
        <circle cx="12" cy="12" r="1" fill={active ? 'white' : '#94A3B8'} />
      </svg>
    );
  }

  return (
    <svg width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 7.5a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1H4v-1z"
        stroke={active ? '#00C4DF' : '#94A3B8'}
        strokeWidth={active ? '2.2' : '1.9'}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill={active ? 'rgba(0, 196, 223, 0.1)' : 'none'}
      />
      <rect
        x="3"
        y="7.5"
        width="18"
        height="12"
        rx="2.5"
        stroke={active ? '#00C4DF' : '#94A3B8'}
        strokeWidth={active ? '2.2' : '1.9'}
        fill={active ? 'rgba(0, 196, 223, 0.08)' : 'none'}
      />
      <path
        d="M15.5 13.5h3.5a1.5 1.5 0 0 0 0-3H15.5v3z"
        stroke={active ? '#00C4DF' : '#94A3B8'}
        strokeWidth="1.8"
        strokeLinejoin="round"
        fill={active ? '#00C4DF' : '#94A3B8'}
      />
      <circle cx="17.2" cy="12" r="0.8" fill="white" />
    </svg>
  );
}

export default function MobileTabBar() {
  const { t } = useTranslation();
  const location = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.03)]"
      style={{ paddingBottom: 'max(6px, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto grid w-full max-w-md grid-cols-5 gap-0 px-1 pt-1">
        {tabs.map(({ to, key }) => {
          const isTradeTab = key === 'trade';
          const isTradePathActive = isTradeTab && ['/trade', '/perp', '/option', '/assets/flash', '/finance'].some((p) =>
            location.pathname.startsWith(p)
          );

          return (
            <NavLink
              key={key}
              to={to}
              end={to === '/'}
              className={({ isActive }) => {
                const active = isActive || isTradePathActive;
                return `${tabItemClassName} ${
                  active ? 'font-bold text-[#00C4DF]' : 'font-medium text-slate-400 hover:text-slate-600'
                }`;
              }}
            >
              {({ isActive }) => {
                const active = isActive || isTradePathActive;
                return (
                  <>
                    <div className="relative flex h-6 w-full shrink-0 items-center justify-center">
                      <div className="transition-transform duration-150 group-active:scale-90">
                        <TabIcon name={key} active={active} />
                      </div>
                      {active && (
                        <span className="absolute -top-1.5 h-0.5 w-4 rounded-full bg-gradient-to-r from-[#00C4DF] to-[#00B578]" />
                      )}
                    </div>
                    <span className={`${tabLabelClassName} ${active ? 'text-[#00C4DF] font-bold' : 'text-slate-400'}`}>
                      {t(`nav.${key}`)}
                    </span>
                  </>
                );
              }}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
