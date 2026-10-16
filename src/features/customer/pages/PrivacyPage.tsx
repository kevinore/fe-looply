import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useBrand } from '@/brand/BrandProvider';
import { parseLocalDate } from '@/lib/dates';
import { Screen, TopBar } from '@/ui';
import { businessQuery } from '../queries';

/**
 * Política de tratamiento de datos personales (Ley 1581 de 2012, Decreto 1377 de
 * 2013 compilado en el Decreto 1074 de 2015). The text is the same for every
 * business; who is responsible and how to reach them come from `branding.legal`.
 * Keep it in line with what the app actually stores (backend models).
 */
export default function PrivacyPage() {
  const { branding, name } = useBrand();
  const business = useQuery(businessQuery);
  const legal = branding.legal ?? {};
  const owner = legal.legal_name || name || 'el responsable';
  const contact = legal.email ? <a href={`mailto:${legal.email}`}>{legal.email}</a> : 'los canales indicados arriba';
  const effective = legal.effective_date
    ? new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'long', year: 'numeric' }).format(parseLocalDate(legal.effective_date))
    : null;

  return (
    <Screen tone="white">
      <TopBar backTo="/client" />
      <article className="pb-8 text-[0.9375rem] leading-relaxed text-brand-ink [&_a]:font-semibold [&_a]:underline [&_a]:underline-offset-2 [&_li]:mt-1 [&_ul]:mt-2 [&_ul]:list-disc [&_ul]:pl-5">
        <h1 className="pt-2 text-[2rem] leading-tight font-semibold">Política de tratamiento de datos personales</h1>
        <p className="mt-2 text-sm text-brand-muted">
          {name && <>Programa de compras y premios de {name}. </>}
          {business.data?.privacy_policy_version && <>Versión {business.data.privacy_policy_version}. </>}
          {effective && <>Vigente desde el {effective}.</>}
        </p>

        <Section title="1. Responsable del tratamiento">
          <ul>
            <li>
              <b>{owner}</b>
              {legal.legal_name && name && legal.legal_name !== name && <> (nombre comercial: {name})</>}
            </li>
            {legal.id_number && (
              <li>
                {legal.id_type ?? 'NIT'}: {legal.id_number}
              </li>
            )}
            {(legal.address || legal.city) && <li>Domicilio: {[legal.address, legal.city].filter(Boolean).join(', ')}</li>}
            {legal.email && (
              <li>
                Correo: <a href={`mailto:${legal.email}`}>{legal.email}</a>
              </li>
            )}
            {legal.phone && <li>Teléfono / WhatsApp: {legal.phone}</li>}
          </ul>
          <p className="mt-2">
            Esta política se rige por la Ley 1581 de 2012, el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015) y
            las demás normas colombianas de protección de datos personales.
          </p>
        </Section>

        <Section title="2. Qué datos tratamos">
          <ul>
            <li>Tu número de celular y el nombre o alias que nos das al registrarte.</li>
            <li>
              Tus compras vinculadas a tu tarjeta: fecha, productos, valor, medio de pago usado (efectivo, transferencia o
              datáfono) y premios aplicados. No recibimos ni guardamos datos de tarjetas ni de cuentas bancarias.
            </li>
            <li>Tus sellos, giros de la ruleta y premios, con sus fechas de entrega, uso y vencimiento.</li>
            <li>La fecha en que aceptaste esta política y la versión que aceptaste.</li>
            <li>
              Datos técnicos de uso de la app: tipo de navegador y dispositivo de tu sesión y eventos como pantallas vistas
              o tiempos de carga.
            </li>
          </ul>
          <p className="mt-2">No pedimos ni tratamos datos sensibles.</p>
        </Section>

        <Section title="3. Para qué los usamos">
          <ul>
            <li>Identificarte y administrar tu tarjeta de compras.</li>
            <li>Registrar tus compras, sumar sellos, darte giros de la ruleta y entregarte y redimir tus premios.</li>
            <li>Mostrarte tu tarjeta, tus premios y tu historial de compras.</li>
            <li>Elaborar estadísticas internas de ventas y de uso de la app para mejorar el servicio.</li>
            <li>Proteger el programa contra fraudes y usos indebidos.</li>
            <li>Atender tus consultas, reclamos y solicitudes.</li>
          </ul>
          <p className="mt-2">
            No vendemos ni cedemos tus datos, y no los usamos para enviarte publicidad. Si en el futuro queremos
            contactarte con fines comerciales, te pediremos una autorización aparte.
          </p>
        </Section>

        <Section title="4. Tu autorización">
          <p>
            Al registrarte marcas la casilla de aceptación. Ese acto es tu autorización previa, expresa e informada, y
            guardamos la fecha y la versión de la política que aceptaste como prueba. Puedes revocarla en cualquier
            momento (numeral 7).
          </p>
        </Section>

        <Section title="5. Tus derechos">
          <p>Como titular de los datos tienes derecho a:</p>
          <ul>
            <li>Conocer, actualizar y rectificar tus datos.</li>
            <li>Solicitar prueba de la autorización que nos diste.</li>
            <li>Ser informado sobre el uso que les hemos dado.</li>
            <li>Revocar la autorización y pedir que suprimamos tus datos.</li>
            <li>Acceder gratis a tus datos.</li>
            <li>
              Presentar quejas ante la Superintendencia de Industria y Comercio (
              <a href="https://www.sic.gov.co" target="_blank" rel="noopener noreferrer">
                www.sic.gov.co
              </a>
              ), después de haber hecho tu consulta o reclamo ante nosotros.
            </li>
          </ul>
        </Section>

        <Section title="6. Cómo hacer consultas y reclamos">
          <p>Escríbenos a {contact} indicando tu nombre, tu número de celular registrado y lo que solicitas.</p>
          <ul>
            <li>
              <b>Consultas:</b> las respondemos en máximo 10 días hábiles. Si no es posible, te avisamos el motivo y te
              respondemos dentro de los 5 días hábiles siguientes.
            </li>
            <li>
              <b>Reclamos</b> (corrección, actualización, supresión o incumplimiento): los respondemos en máximo 15 días
              hábiles, prorrogables por 8 días hábiles más avisándote el motivo. Si al reclamo le falta información, te la
              pediremos dentro de los 5 días siguientes; si no la recibimos en 2 meses, entenderemos que desististe.
            </li>
          </ul>
          <p className="mt-2">Para proteger tus datos, podemos verificar que el celular desde el que escribes es el registrado.</p>
        </Section>

        <Section title="7. Revocatoria y supresión">
          <p>
            Si revocas la autorización o pides la supresión, eliminamos o anonimizamos tu celular y tu nombre, y tu tarjeta,
            sellos y premios pendientes dejan de estar disponibles. Los registros de ventas se conservan sin datos que te
            identifiquen, porque los necesitamos para obligaciones contables y tributarias.
          </p>
        </Section>

        <Section title="8. Quién más trata los datos">
          <p>
            Para operar la app usamos proveedores de tecnología que alojan la aplicación y la base de datos (Vercel,
            Railway y Neon, este último sobre Amazon Web Services). Sus servidores están en Estados Unidos, por lo que tus
            datos se transmiten a ese país. Estos proveedores actúan como encargados: solo tratan los datos por cuenta
            nuestra, para prestar el servicio, y con obligaciones de confidencialidad y seguridad. Al aceptar esta política
            autorizas esa transmisión.
          </p>
        </Section>

        <Section title="9. Seguridad">
          <ul>
            <li>Toda la comunicación con la app va cifrada (HTTPS).</li>
            <li>Tu sesión se guarda en una cookie protegida que el código de la página no puede leer.</li>
            <li>El personal del punto de venta solo ve tu nombre y los últimos 4 dígitos de tu celular.</li>
            <li>El acceso a la información está limitado a las personas autorizadas.</li>
          </ul>
        </Section>

        <Section title="10. Cookies y almacenamiento en tu dispositivo">
          <p>
            Usamos una sola cookie, necesaria para mantener tu sesión abierta (dura hasta un año o hasta que cierres
            sesión), y guardamos en tu dispositivo una copia de tu tarjeta para que la app abra más rápido. No usamos
            cookies de publicidad ni de terceros.
          </p>
        </Section>

        <Section title="11. Menores de edad">
          <p>
            El programa está dirigido a mayores de edad. Un menor solo puede registrarse con la autorización de su
            representante legal, y sus datos se tratan respetando su interés superior y sus derechos fundamentales.
          </p>
        </Section>

        <Section title="12. Vigencia y cambios">
          <p>
            Conservamos tus datos mientras participes en el programa o hasta que pidas su supresión, y después solo el
            tiempo que exija la ley. Si cambiamos esta política, publicaremos la nueva versión en esta página y, cuando el
            cambio afecte las finalidades del tratamiento, te pediremos una nueva autorización.
          </p>
        </Section>
      </article>
    </Screen>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-1">{children}</div>
    </section>
  );
}
