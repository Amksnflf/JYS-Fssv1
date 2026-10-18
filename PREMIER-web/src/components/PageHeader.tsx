import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ReactNode } from 'react';

interface Props {
  title: string;
  right?: ReactNode;
  fallbackPath?: string;
}

export default function PageHeader({ title, right, fallbackPath = '/' }: Props) {
  const nav = useNavigate();
  const goBack = () => {
    if (window.history.length > 1) nav(-1);
    else nav(fallbackPath, { replace: true });
  };

  return (
    <div className="sticky top-0 z-30 flex h-12 items-center justify-between border-b border-line bg-bg/95 px-2 backdrop-blur md:static md:bg-bg md:backdrop-blur-0">
      <button
        onClick={goBack}
        className="w-9 h-9 flex items-center justify-center"
        aria-label="back"
      >
        <ChevronLeft size={20} />
      </button>
      <div className="text-sm font-medium">{title}</div>
      <div className="min-w-9 h-9 flex items-center justify-end pr-2 text-xs text-textSub">
        {right}
      </div>
    </div>
  );
}
