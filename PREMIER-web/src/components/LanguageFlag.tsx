type LanguageFlagProps = {
  flag: string;
  className?: string;
};

const FLAG_SRC = (flag: string) => `/assets/flags/${flag}.png`;
const preloadedFlags = new Set<string>();

export function preloadLanguageFlags(flags: string[]) {
  if (typeof window === 'undefined') return;
  flags.forEach((flag) => {
    if (preloadedFlags.has(flag)) return;
    preloadedFlags.add(flag);
    const img = new Image();
    img.src = FLAG_SRC(flag);
  });
}

export default function LanguageFlag({ flag, className = '' }: LanguageFlagProps) {
  return (
    <img
      src={FLAG_SRC(flag)}
      alt=""
      className={`h-[18px] w-[24px] shrink-0 rounded-[2px] object-cover ${className}`}
      decoding="async"
    />
  );
}
