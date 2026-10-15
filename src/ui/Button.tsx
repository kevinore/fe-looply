import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from './cn';
import { Spinner } from './Spinner';

export type ButtonVariant = 'primary' | 'dark' | 'secondary' | 'ghost' | 'danger' | 'success' | 'light';
export type ButtonSize = 'md' | 'lg';

const VARIANTS: Record<ButtonVariant, string> = {
  // Ink on pink: white text on the brand pink fails WCAG AA.
  primary: 'bg-brand-primary text-brand-ink active:brightness-95',
  dark: 'bg-brand-ink text-white active:bg-brand-ink/85',
  secondary: 'bg-white text-brand-ink ring-1 ring-brand-line ring-inset active:bg-brand-field',
  ghost: 'bg-transparent text-brand-ink active:bg-brand-ink/5',
  danger: 'bg-[#B42318] text-white active:bg-[#912018]',
  success: 'bg-brand-secondary text-brand-ink active:brightness-95',
  light: 'bg-white/90 text-brand-ink active:bg-white',
};

const SIZES: Record<ButtonSize, string> = {
  md: 'min-h-12 px-5 text-[0.9375rem]',
  lg: 'min-h-14 px-6 text-base',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'lg', block = true) {
  return cn(
    'relative inline-flex select-none items-center justify-center gap-2 rounded-2xl font-semibold',
    'transition-[transform,background-color,filter] duration-100 active:scale-[0.98]',
    'disabled:pointer-events-none disabled:opacity-45',
    VARIANTS[variant],
    SIZES[size],
    block && 'w-full',
  );
}

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
  loading?: boolean;
  children: ReactNode;
};

export function Button({
  variant = 'primary',
  size = 'lg',
  block = true,
  loading = false,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: Props) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClass(variant, size, block), className)}
      {...rest}
    >
      {loading && <Spinner className="absolute" label="Cargando" />}
      <span className={cn('inline-flex items-center gap-2', loading && 'invisible')}>{children}</span>
    </button>
  );
}

export function ButtonLink({
  variant = 'primary',
  size = 'lg',
  block = true,
  className,
  ...rest
}: LinkProps & { variant?: ButtonVariant; size?: ButtonSize; block?: boolean }) {
  return <Link className={cn(buttonClass(variant, size, block), className)} {...rest} />;
}

/** Small text-style link button (e.g. "Anular venta", "Volver al carrito"). */
export function TextButton({ className, ...rest }: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={cn(
        'mx-auto flex min-h-12 items-center justify-center px-4 text-sm font-semibold underline-offset-4 active:opacity-60',
        className,
      )}
      {...rest}
    />
  );
}
