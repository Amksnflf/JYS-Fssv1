import { Outlet } from 'react-router-dom';
import { useResponsive } from '@/hooks/useResponsive';
import MobileTabBar from './mobile/MobileTabBar';
import DesktopHeader from './desktop/DesktopHeader';
import DesktopFooter from './desktop/DesktopFooter';

export default function AppLayout() {
  const { isMobile } = useResponsive();

  if (isMobile) {
    return (
      <div className="flex flex-col min-h-screen bg-bg">
        <main className="page-motion flex-1 pb-20">
          <Outlet />
        </main>
        <MobileTabBar />
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
