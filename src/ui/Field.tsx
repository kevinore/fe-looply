import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { cn } from './cn';

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
  prefix?: ReactNode;
  hint?: ReactNode;
};

/** Labeled input with optional fixed prefix (e.g. +57) and inline error. */
export const Field = forwardRef<HTMLInputElement, Props>(function Field(
  { label, error, prefix, hint, id, className, ...rest },
  ref,
) {
  const inputId = id ?? rest.name;
  const errId = error ? `${inputId}-error` : undefined;
  return (
    <div className={className}>
      <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-brand-muted">
        {label}
      </label>
      <div
        className={cn(
          'flex min-h-14 items-center rounded-2xl bg-brand-field px-4 ring-inset transition-shadow',
          'focus-within:bg-white focus-within:ring-2 focus-within:ring-brand-ink',
          error && 'bg-white ring-2 ring-[#B42318]',
        )}
      >
        {prefix && <span className="mr-3 border-r border-brand-line pr-3 text-brand-muted tabular">{prefix}</span>}
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errId}
          className="h-full min-w-0 flex-1 bg-transparent py-3 text-[1.0625rem] font-semibold outline-none placeholder:font-normal placeholder:text-brand-muted/70"
          {...rest}
        />
      </div>
      {error ? (
        <p id={errId} className="mt-1.5 text-sm font-medium text-[#B42318]">
          {error}
        </p>
      ) : (
        hint && <p className="mt-1.5 text-sm text-brand-muted">{hint}</p>
      )}
    </div>
  );
});
