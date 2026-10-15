import type { ReactNode } from 'react';
import { Mascot } from '@/brand/Mascot';
import { Screen } from '@/ui';

/** Branded full-screen message with actions at the bottom. */
export function MessageScreen({ title, body, actions }: { title: string; body?: ReactNode; actions?: ReactNode }) {
  return (
    <Screen tone="soft" footer={actions ? <div className="grid gap-2">{actions}</div> : undefined}>
      <div className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center">
        <div className="size-44 overflow-hidden rounded-full bg-white">
          <Mascot pose="matcha" className="size-full object-cover" sizes="176px" priority />
        </div>
        <div>
          <h1 className="text-[2rem] leading-tight font-semibold">{title}</h1>
          {body && <p className="mx-auto mt-2 max-w-xs text-brand-muted">{body}</p>}
        </div>
      </div>
    </Screen>
  );
}
