import { useEffect, useState } from 'react';

const MOBILE_BREAKPOINT = 768;

export interface Responsive {
  isMobile: boolean;
  isDesktop: boolean;
  isPc: boolean;
  width: number;
}

function read(): Responsive {
  if (typeof window === 'undefined') {
    return { isMobile: true, isDesktop: false, isPc: false, width: 375 };
  }
  const w = window.innerWidth;
  const isDesktop = w >= MOBILE_BREAKPOINT;
  return { isMobile: !isDesktop, isDesktop, isPc: isDesktop, width: w };
}

export function useResponsive(): Responsive {
  const [state, setState] = useState<Responsive>(read);
  useEffect(() => {
    const onResize = () => setState(read());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return state;
}
