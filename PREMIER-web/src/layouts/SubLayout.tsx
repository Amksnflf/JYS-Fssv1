import { Outlet } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import DesktopHeader from './desktop/DesktopHeader';
import DesktopFooter from './desktop/DesktopFooter';

export default function SubLayout() {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="flex min-h-screen flex-col bg-bg">
        <main className="page-motion flex-1">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg pc-page">
      <DesktopHeader />
      <main className="page-motion flex-1 w-full overflow-x-auto">
        <Outlet />
      </main>
      <DesktopFooter />
    </div>
  );
}
