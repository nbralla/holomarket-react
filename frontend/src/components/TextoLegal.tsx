import { CONDICIONES } from '../data/catalogo';
import type { TipoLegal } from '../data/legal';
import { useTienda } from '../hooks/useTienda';
import { clp } from '../utils/formato';
import { CondicionChip } from './Chips';
import Tabla from './Tabla';

/* Textos legales que se muestran en una ventana modal (Ley 19.496, Ley 19.628 y Ley 21.719). */
export default function TextoLegal({ tipo }: { tipo: TipoLegal }) {
  const { estado } = useTienda();
  if (tipo === 'condiciones') {
    return (
      <div className="legal">
        <p>Usamos la escala habitual del mercado de cartas. Si dudas entre dos, elige la más baja.</p>
        <Tabla columnas={[{ t: 'Clasificación' }, { t: 'Condición' }, { t: 'Estado' }, { t: 'Equivalente en EE. UU.' }]} leyenda="Escala de condición"
          filas={CONDICIONES.map((c) => ({ clave: c.id, celdas: [<CondicionChip id={c.id} />, <strong>{c.nombre}</strong>, c.detalle, c.equivalente] }))} />
      </div>
    );
  }
  if (tipo === 'privacidad') {
    return (
      <div className="legal">
        <p>Tratamos tus datos personales conforme a la Ley 19.628 sobre protección de la vida privada y a la Ley 21.719, que la moderniza.</p>
        <h3>Qué datos pedimos</h3>
        <p>RUT, nombre, correo, teléfono, región y comuna. Al comprar, la dirección de despacho. No guardamos el número completo de tu tarjeta ni su código de seguridad. Si vendes, la cuenta bancaria donde transferimos tus retiros, que siempre mostramos enmascarada.</p>
        <h3>Para qué los usamos</h3>
        <p>Para crear tu cuenta, procesar compras y ventas, y coordinar entregas. Quien te vende solo ve los datos necesarios para enviar tu pedido. No vendemos ni cedemos tus datos.</p>
        <h3>Cómo los protegemos</h3>
        <p>Las contraseñas se guardan como hash SHA-256 con sal, nunca en texto plano. Registramos la fecha en que aceptas esta política.</p>
        <h3>Tus derechos</h3>
        <p>Puedes pedir acceso, rectificación, eliminación u oposición al tratamiento de tus datos escribiendo a privacidad@holomarket.cl.</p>
        <p className="nota">Tus datos de cuenta, publicaciones y pedidos se guardan en nuestros servidores; la sesión y el carrito quedan en tu navegador.</p>
      </div>
    );
  }
  return (
    <div className="legal">
      <p>HoloMarket conecta a personas que compran y venden cartas sueltas de juegos de cartas coleccionables en Chile.</p>
      <h3>Publicaciones</h3>
      <p>Cada vendedor describe la carta, su condición e idioma, y mantiene su stock al día. HoloMarket puede pausar o eliminar publicaciones que no cumplan estas reglas.</p>
      <h3>Precios y comisión</h3>
      <p>Los precios se publican en pesos chilenos con IVA incluido. Publicar es gratis: cuando se concreta una venta, HoloMarket descuenta al vendedor una comisión de {estado.config.comision} % del valor de las cartas, más IVA sobre esa comisión.</p>
      <h3>Envíos y entregas</h3>
      <p>El vendedor despacha o deja lista la entrega dentro de 3 días hábiles. El costo de envío se informa antes de pagar y se calcula por vendedor.</p>
      <h3>Cancelaciones y garantías</h3>
      <p>Puedes cancelar un pedido mientras no haya sido enviado: se devuelve el pago y las unidades vuelven al stock del vendedor. Se respetan los derechos de la Ley 19.496 sobre Protección de los Derechos de los Consumidores.</p>
      <h3>Pagos a vendedores y retiros</h3>
      <p>El monto de cada venta, ya descontada la comisión, se libera cuando quien compra confirma la recepción. Desde Retiros puedes transferirlo a una cuenta bancaria a tu nombre, desde {clp(estado.config.retiroMinimo)}, en un plazo de 2 días hábiles.</p>
    </div>
  );
}
