import { cn } from '@/lib/utils';

export function Logo({
  dark = false,
  size = 'md',
  withText = true
}: {
  dark?: boolean;
  size?: 'sm' | 'md' | 'lg';
  withText?: boolean;
}) {
  const dims = { sm: 'h-7 w-7', md: 'h-9 w-9', lg: 'h-11 w-11' };
  const text = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' };
  return (
    <div className="flex items-center gap-2.5">
      <div className={cn('relative', dims[size])}>
        <div className={cn('absolute inset-0 rounded-2xl logo-mark animate-spin-slow opacity-80')} />
        <div className="absolute inset-[26%] rounded-lg bg-gradient-to-br from-brand-400 to-accent-500" />
        <div className="absolute inset-[40%] rounded-full bg-white" />
      </div>
      {withText && (
        <span
          className={cn(
            'font-extrabold tracking-tight',
            text[size],
            dark ? 'text-white' : 'text-slate-800'
          )}
        >
          Wassil
          <span
            className={cn(
              'ml-0.5 font-black',
              'bg-gradient-to-r from-brand-500 to-accent-500 bg-clip-text text-transparent'
            )}
          >
            .
          </span>
        </span>
      )}
    </div>
  );
}