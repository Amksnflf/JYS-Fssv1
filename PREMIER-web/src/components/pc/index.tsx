import {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { useTranslation } from 'react-i18next';

function cx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}

/* ─────────── Container / Section ─────────── */

export function PcContainer({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cx('pc-container', className)} {...rest}>
      {children}
    </div>
  );
}

interface PcSectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  title?: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  containerClassName?: string;
  contentClassName?: string;
  align?: 'left' | 'center';
}

export function PcSection({
  title,
  description,
  right,
  className,
  containerClassName,
  contentClassName,
  align = 'left',
  children,
  ...rest
}: PcSectionProps) {
  return (
    <section className={cx('w-full', className)} {...rest}>
      <div className={cx('mx-auto w-[1300px]', containerClassName)}>
        {(title || right) && (
          <div className={cx('flex items-end justify-between', align === 'center' && 'flex-col items-center gap-3')}>
            {title ? (
              <div className={cx(align === 'center' && 'text-center')}>
                {typeof title === 'string' ? <h2 className="pc-h2 m-0">{title}</h2> : title}
                {description ? <p className="mt-3 text-[18px] leading-[26px] text-textMute">{description}</p> : null}
              </div>
            ) : null}
            {right ? <div className="flex items-center gap-2">{right}</div> : null}
          </div>
        )}
        <div className={cx(title || right ? 'mt-8' : '', contentClassName)}>{children}</div>
      </div>
    </section>
  );
}

/* ─────────── Card ─────────── */

interface PcCardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'plain' | 'soft' | 'border';
  hover?: boolean;
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export function PcCard({
  variant = 'border',
  hover = false,
  padding = 'md',
  className,
  children,
  ...rest
}: PcCardProps) {
  const padCls =
    padding === 'none' ? '' : padding === 'sm' ? 'p-4' : padding === 'lg' ? 'p-8' : 'p-6';
  const variantCls =
    variant === 'soft' ? 'pc-card-soft' : variant === 'plain' ? 'rounded-lg bg-white' : 'pc-card';
  return (
    <div className={cx(variantCls, padCls, hover && 'pc-card-hover', className)} {...rest}>
      {children}
    </div>
  );
}

/* ─────────── Tabs ─────────── */

export interface PcTabItem<T extends string = string> {
  key: T;
  label: ReactNode;
  badge?: ReactNode;
}

interface PcTabsProps<T extends string> {
  items: ReadonlyArray<PcTabItem<T>>;
  value: T;
  onChange: (key: T) => void;
  variant?: 'underline' | 'pill';
  className?: string;
}

export function PcTabs<T extends string>({
  items,
  value,
  onChange,
  variant = 'underline',
  className,
}: PcTabsProps<T>) {
  if (variant === 'pill') {
    return (
      <div className={cx('flex items-center gap-2', className)}>
        {items.map((it) => (
          <button
            key={it.key}
            type="button"
            onClick={() => onChange(it.key)}
            className={cx('pc-chip', value === it.key && 'pc-chip-active')}
          >
            {it.label}
            {it.badge ? <span className="ml-1">{it.badge}</span> : null}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className={cx('flex items-center gap-8 border-b border-line', className)}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          className={cx('pc-tab-underline', value === it.key && 'pc-tab-underline-active')}
        >
          {it.label}
          {it.badge ? <span className="ml-1">{it.badge}</span> : null}
        </button>
      ))}
    </div>
  );
}

/* ─────────── Table ─────────── */

export interface PcTableColumn<R> {
  key: string;
  title: ReactNode;
  width?: number | string;
  align?: 'left' | 'right' | 'center';
  render: (row: R, index: number) => ReactNode;
  thClassName?: string;
  tdClassName?: string;
}

interface PcTableProps<R> {
  columns: ReadonlyArray<PcTableColumn<R>>;
  rows: ReadonlyArray<R>;
  rowKey: (row: R, index: number) => string | number;
  onRowClick?: (row: R, index: number) => void;
  empty?: ReactNode;
  className?: string;
  rowClassName?: (row: R, index: number) => string | undefined;
}

export function PcTable<R>({
  columns,
  rows,
  rowKey,
  onRowClick,
  empty,
  className,
  rowClassName,
}: PcTableProps<R>) {
  const { t } = useTranslation();
  return (
    <table className={cx('pc-table', className)}>
      <thead>
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              style={{ width: c.width, textAlign: c.align ?? 'left' }}
              className={c.thClassName}
            >
              {c.title}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} className="!h-[280px] text-center text-textMute">
              {empty ?? t('common.noData')}
            </td>
          </tr>
        ) : (
          rows.map((row, i) => (
            <tr
              key={rowKey(row, i)}
              onClick={onRowClick ? () => onRowClick(row, i) : undefined}
              className={cx(onRowClick && 'cursor-pointer', rowClassName?.(row, i))}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{ textAlign: c.align ?? 'left' }}
                  className={c.tdClassName}
                >
                  {c.render(row, i)}
                </td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  );
}

/* ─────────── Form ─────────── */

interface PcInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  prefix?: ReactNode;
  suffix?: ReactNode;
  wrapperClassName?: string;
}

export const PcInput = forwardRef<HTMLInputElement, PcInputProps>(function PcInput(
  { prefix, suffix, wrapperClassName, className, ...rest },
  ref,
) {
  if (prefix || suffix) {
    return (
      <div className={cx('pc-input gap-2', rest.disabled && 'disabled', wrapperClassName)}>
        {prefix ? <span className="shrink-0 text-textSubPc">{prefix}</span> : null}
        <input
          ref={ref}
          {...rest}
          className={cx('h-full flex-1 bg-transparent text-text placeholder:text-textMute outline-none', className)}
        />
        {suffix ? <span className="shrink-0">{suffix}</span> : null}
      </div>
    );
  }
  return <input ref={ref} {...rest} className={cx('pc-input', className)} />;
});

interface PcNumberInputProps extends InputHTMLAttributes<HTMLInputElement> {
  unit?: ReactNode;
  actions?: ReactNode;
  wrapperClassName?: string;
}

export const PcNumberInput = forwardRef<HTMLInputElement, PcNumberInputProps>(function PcNumberInput(
  { unit, actions, wrapperClassName, className, ...rest },
  ref,
) {
  return (
    <div className={cx('pc-number-input', wrapperClassName)}>
      <input ref={ref} type="number" inputMode="decimal" {...rest} className={cx('flex-1', className)} />
      {unit ? <span className="px-2 text-[14px] text-textSubPc">{unit}</span> : null}
      {actions ? <span className="flex shrink-0 items-center gap-1 pr-1">{actions}</span> : null}
    </div>
  );
});

export const PcTextarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function PcTextarea({ className, ...rest }, ref) {
    return <textarea ref={ref} {...rest} className={cx('pc-textarea', className)} />;
  },
);

interface PcSelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  options: ReadonlyArray<{ value: string; label: ReactNode }>;
}

export function PcSelect({ options, className, ...rest }: PcSelectProps) {
  return (
    <select {...rest} className={cx('pc-select bg-no-repeat', className)} style={{ backgroundImage: 'none' }}>
      {options.map((it) => (
        <option key={it.value} value={it.value}>
          {it.label}
        </option>
      ))}
    </select>
  );
}

export function PcLabel({ children, className }: { children: ReactNode; className?: string }) {
  return <label className={cx('pc-label', className)}>{children}</label>;
}

export function PcFormRow({
  label,
  required,
  hint,
  children,
  className,
}: {
  label?: ReactNode;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('pc-form-row', className)}>
      {label ? (
        <label className="pc-label">
          {label}
          {required ? <span className="ml-1 text-down">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="mt-2 text-[12px] text-textSubPc">{hint}</p> : null}
    </div>
  );
}

/* ─────────── Button ─────────── */

interface PcButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'dark' | 'ghost' | 'buy' | 'sell' | 'pill';
  size?: 'sm' | 'md' | 'lg';
  block?: boolean;
}

export function PcButton({
  variant = 'primary',
  size = 'md',
  block,
  className,
  children,
  ...rest
}: PcButtonProps) {
  const variantCls =
    variant === 'pill'
      ? 'pc-btn-pill'
      : variant === 'dark'
        ? 'pc-btn-dark'
        : variant === 'ghost'
          ? 'pc-btn-ghost'
          : variant === 'buy'
            ? 'pc-btn-buy'
            : variant === 'sell'
              ? 'pc-btn-sell'
              : 'pc-btn-primary';
  const sizeCls = size === 'lg' ? 'pc-btn-lg' : size === 'sm' ? 'h-8 min-w-[80px] text-[13px]' : '';
  return (
    <button {...rest} className={cx(variantCls, sizeCls, block && 'pc-btn-block', className)}>
      {children}
    </button>
  );
}

/* ─────────── Dialog ─────────── */

interface PcDialogProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  width?: number;
  children: ReactNode;
  footer?: ReactNode;
  closable?: boolean;
}

export function PcDialog({
  open,
  onClose,
  title,
  width = 500,
  children,
  footer,
  closable = true,
}: PcDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/35" onClick={onClose}>
      <div
        className="aster-modal-pop relative rounded-lg bg-white shadow-pop"
        style={{ width }}
        onClick={(e) => e.stopPropagation()}
      >
        {title ? (
          <div className="flex h-14 items-center justify-between border-b border-line px-6">
            <span className="text-[18px] font-semibold text-text">{title}</span>
            {closable ? (
              <button
                type="button"
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-full text-text hover:bg-bgSection"
                aria-label="close"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M6 6L18 18M6 18L18 6" strokeLinecap="round" />
                </svg>
              </button>
            ) : null}
          </div>
        ) : null}
        <div className="px-6 py-5">{children}</div>
        {footer ? <div className="flex items-center justify-end gap-2 border-t border-line px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

/* ─────────── Empty / Price Text ─────────── */

export function PcEmpty({ message, className }: { message?: ReactNode; className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cx('pc-empty', className)}>
      <svg width="80" height="80" viewBox="0 0 80 80" className="mb-3 text-textMute" fill="none">
        <circle cx="40" cy="40" r="32" stroke="currentColor" strokeWidth="2" />
        <path d="M28 36c0-2 2-4 4-4s4 2 4 4M44 36c0-2 2-4 4-4s4 2 4 4M28 50c4-3 8-3 12-3s8 0 12 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <span>{message ?? t('common.noData')}</span>
    </div>
  );
}

export function PcPrice({ value, className, fallback = '--' }: { value: ReactNode; className?: string; fallback?: ReactNode }) {
  return <span className={cx('pc-price', className)}>{value === null || value === undefined || value === '' ? fallback : value}</span>;
}

/* ─────────── Toolbox ─────────── */

export function PcDivider({ className }: { className?: string }) {
  return <div className={cx('h-px w-full bg-line', className)} />;
}

export function PcSubHeader({
  title,
  description,
  right,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cx('flex items-center justify-between', className)}>
      <div>
        <h3 className="text-[24px] font-semibold leading-[32px] text-text">{title}</h3>
        {description ? <p className="mt-1 text-[14px] text-textSubPc">{description}</p> : null}
      </div>
      {right ? <div className="flex items-center gap-2">{right}</div> : null}
    </div>
  );
}
