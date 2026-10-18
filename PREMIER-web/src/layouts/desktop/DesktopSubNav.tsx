import { NavLink } from 'react-router-dom';
import type { ReactNode } from 'react';

export interface SubNavItem {
  to: string;
  label: ReactNode;
  end?: boolean;
}

interface DesktopSubNavProps {
  items: ReadonlyArray<SubNavItem>;
  right?: ReactNode;
  className?: string;
}

export default function DesktopSubNav({ items, right, className }: DesktopSubNavProps) {
  return (
    <div
      className={`sticky top-[70px] z-30 flex h-[60px] w-full items-center justify-between border-b border-line bg-bg px-4 sm:px-6 ${className ?? ''}`}
    >
      <nav className="flex items-center gap-[36px] text-[14px] font-medium text-textSubPc">
        {items.map((it) => (
          <NavLink
            key={typeof it.label === 'string' ? `${it.to}-${it.label}` : it.to}
            to={it.to}
            end={it.end}
            className={({ isActive }) =>
              `flex h-[60px] items-center transition hover:text-text ${
                isActive ? 'font-semibold text-text' : ''
              }`
            }
          >
            {it.label}
          </NavLink>
        ))}
      </nav>
      {right ? <div className="flex items-center gap-3">{right}</div> : null}
    </div>
  );
}
