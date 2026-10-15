import { useState } from 'react';
import { Logo, Mascot } from '@/brand/Mascot';
import {
  Avatar,
  BottomSheet,
  Button,
  Card,
  DigitBoxes,
  EmptyState,
  ErrorState,
  Eyebrow,
  Field,
  Keypad,
  LiveDot,
  LoadingState,
  Money,
  Pill,
  ProductTile,
  ProgressSegments,
  Screen,
  Tabs,
  toast,
} from '@/ui';
import { ApiError } from '@/api/errors';

/** Development-only gallery of every base component (plan §4, verification). */
export default function UiGallery() {
  const [sheet, setSheet] = useState(false);
  const [digits, setDigits] = useState('45');
  const [qty, setQty] = useState(2);
  const [tab, setTab] = useState<'a' | 'b' | 'c'>('a');
  const [phone, setPhone] = useState('');

  return (
    <Screen className="gap-8 py-6">
      <header className="flex items-center gap-3">
        <Logo size={56} />
        <div>
          <h1 className="text-3xl font-semibold">UI</h1>
          <p className="text-sm text-brand-muted">Componentes base</p>
        </div>
      </header>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">Button</h2>
        <Button>Girar la ruleta</Button>
        <Button variant="dark">Cobrar y mostrar QR</Button>
        <Button variant="secondary">Guardar para otra visita</Button>
        <Button variant="success">Sí, soy yo</Button>
        <Button variant="ghost">Ahora no</Button>
        <Button variant="danger">Anular venta</Button>
        <Button loading>Cargando</Button>
        <Button disabled>Desactivado</Button>
      </section>

      <section className="flex flex-wrap gap-2">
        <Pill tone="primary">Cliente</Pill>
        <Pill tone="secondary">Operador</Pill>
        <Pill tone="dark">Sin señal</Pill>
        <Pill tone="light">
          <LiveDot /> Esperando escaneo…
        </Pill>
        <Pill>vinculada</Pill>
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">ProgressSegments</h2>
        <Card className="grid gap-3">
          <ProgressSegments total={5} progress={3} highlightLast />
          <div className="rounded-card bg-brand-primary p-4">
            <Eyebrow>Tarjeta</Eyebrow>
            <p className="my-2 font-display text-5xl">
              4 <span className="font-sans text-base">de 5 compras</span>
            </p>
            <ProgressSegments total={5} progress={4} variant="boxes" />
          </div>
        </Card>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <ProductTile name="Matcha latte" price={14000} photoUrl={null} qty={qty} onAdd={() => setQty(qty + 1)} onRemove={() => setQty(Math.max(0, qty - 1))} />
        <ProductTile name="Cold brew" price={12000} photoUrl={null} qty={0} onAdd={() => {}} onRemove={() => {}} />
      </section>

      <section className="grid gap-3">
        <h2 className="text-xl font-semibold">DigitBoxes + Keypad</h2>
        <DigitBoxes value={digits} />
        <Keypad
          className="rounded-2xl"
          onDigit={(d) => setDigits((v) => (v.length < 4 ? v + d : v))}
          onDelete={() => setDigits((v) => v.slice(0, -1))}
        />
      </section>

      <section className="grid gap-3">
        <Field label="Celular" prefix="+57" inputMode="numeric" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Field label="¿Cómo te llamas?" error="Escribe entre 2 y 30 caracteres." defaultValue="A" />
      </section>

      <section className="grid gap-3">
        <Tabs value={tab} onChange={setTab} label="Filtro" options={[{ value: 'a', label: 'Vencen en 7 días' }, { value: 'b', label: 'Gratis' }, { value: 'c', label: 'Todos' }]} />
        <div className="flex items-center gap-3">
          <Avatar name="Ana" />
          <Money value={42000} className="font-display text-3xl" />
          <Money value={14000} strike className="text-brand-muted" />
        </div>
      </section>

      <section className="grid gap-3">
        <Button variant="secondary" onClick={() => setSheet(true)}>
          Abrir BottomSheet
        </Button>
        <Button variant="secondary" onClick={() => toast.success('Premio entregado')}>
          Toast
        </Button>
        <BottomSheet open={sheet} onClose={() => setSheet(false)} title="Cobrar">
          <p className="mb-4 text-brand-muted">Contenido de la hoja.</p>
          <Button variant="dark" onClick={() => setSheet(false)}>
            Cerrar
          </Button>
        </BottomSheet>
      </section>

      <section className="grid gap-3">
        <Card>
          <LoadingState />
        </Card>
        <Card>
          <ErrorState error={new ApiError('network_error')} onRetry={() => {}} />
        </Card>
        <Card>
          <EmptyState title="Todavía no tienes compras." />
        </Card>
      </section>

      <section className="grid grid-cols-3 gap-2">
        <Mascot pose="drink" />
        <Mascot pose="matcha" />
        <Mascot pose="counter" />
      </section>
    </Screen>
  );
}
