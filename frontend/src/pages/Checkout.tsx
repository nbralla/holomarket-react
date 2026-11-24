import { useEffect, useRef, type ChangeEvent, type FormEvent } from 'react';
import Campo from '../components/Campo';
import { REGIONES, comunasDe } from '../data/catalogo';
import { calcularCompra, procesarCompra, revisarCarrito } from '../logica/compras';
import { usuarioPorId } from '../logica/consultas';
import { registrarActividad } from '../logica/estado';
import { motivoRechazo, TEXTO_RECHAZO } from '../logica/ofertas';
import { useAvisos } from '../hooks/useAvisos';
import { useFormulario } from '../hooks/useFormulario';
import { useLegal } from '../hooks/useLegal';
import { useTienda } from '../hooks/useTienda';
import type { MetodoEntrega, MetodoPago, Usuario } from '../types';
import { clp, nombreCorto } from '../utils/formato';
import { useNavegar } from '../hooks/useRuta';
import { cvvValido, largoEntre, luhn, nombreValido, telefonoValido, vencimientoValido } from '../utils/validaciones';

import { Link } from 'react-router';
type Valores = {
  entrega: MetodoEntrega;
  pago: MetodoPago;
  receptor: string;
  telefono: string;
  region: string;
  comuna: string;
  direccion: string;
  numero: string;
  titular: string;
  vence: string;
  cvv: string;
};

const formatearTarjeta = (v: string) => v.replace(/\D/g, '').slice(0, 19).replace(/(\d{4})(?=\d)/g, '$1 ');
function formatearVencimiento(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
}

export default function Checkout({ usuario }: { usuario: Usuario }) {
  const { estado, carrito, guardarCarrito, actualizar } = useTienda();
  const { navegar } = useNavegar();
  const { avisar } = useAvisos();
  const verLegal = useLegal();
  const revision = revisarCarrito(estado, usuario.id, carrito);

  const f = useFormulario<Valores>('co-', () => ({
    entrega: 'despacho', pago: 'tarjeta', receptor: usuario.nombre, telefono: usuario.telefono || '', region: usuario.region,
    comuna: usuario.comuna, direccion: usuario.direccion || '', numero: '', titular: '', vence: '', cvv: '',
  }), (v) => ({
    receptor: nombreValido(v.receptor) ? '' : 'Escribe el nombre de quien recibe, solo con letras.',
    telefono: telefonoValido(v.telefono) ? '' : 'Ingresa un teléfono válido, por ejemplo +56 9 1234 5678.',
    region: v.region ? '' : 'Elige la región de despacho.',
    comuna: v.comuna ? '' : 'Elige la comuna de despacho.',
    direccion: largoEntre(v.direccion, 5, 120) ? '' : 'Escribe calle, número y depto. si corresponde (5 a 120 caracteres).',
    numero: !v.numero.trim() ? 'Ingresa el número de la tarjeta.' : luhn(v.numero) ? '' : 'El número de tarjeta no es válido. Revisa los dígitos.',
    titular: nombreValido(v.titular) ? '' : 'Escribe el nombre tal como aparece en la tarjeta.',
    vence: vencimientoValido(v.vence) ? '' : 'Usa el formato MM/AA con una fecha que no haya pasado.',
    cvv: cvvValido(v.cvv) ? '' : 'El código de seguridad tiene 3 o 4 dígitos.',
  }));
  const v = f.valores;

  // Si el carrito está vacío (o se vació por falta de stock), se vuelve al carrito.
  // Tras pagar también queda vacío: en ese caso se va a la confirmación, no al carrito.
  const pagado = useRef(false);
  const sinLineas = revision.lineas.length === 0;
  useEffect(() => {
    if (sinLineas && !pagado.current) navegar('/carrito');
  }, [sinLineas, navegar]);
  if (sinLineas) return null;

  const despacho = v.entrega === 'despacho';
  const compra = calcularCompra(estado, revision.lineas, v.entrega, (despacho && v.region) || usuario.region);

  const pagar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const campos: (keyof Valores)[] = ['receptor', 'telefono'];
    if (despacho) campos.push('region', 'comuna', 'direccion');
    if (v.pago === 'tarjeta') campos.push('numero', 'titular', 'vence', 'cvv');
    if (!f.validarTodo(campos)) {
      avisar('Revisa los datos marcados antes de pagar.', 'error');
      return;
    }
    // Pago simulado: algunas tarjetas de prueba son rechazadas por el "banco". No se cobra ni se toca el stock.
    const motivo = v.pago === 'tarjeta' ? motivoRechazo(v.numero) : null;
    if (motivo) {
      actualizar((e) => registrarActividad(e, 'Pago rechazado', `${clp(compra.total)}: ${TEXTO_RECHAZO[motivo]}`, usuario.id));
      navegar(`/pago-rechazado?motivo=${motivo}`);
      return;
    }
    const r = actualizar((e) => {
      const comprador = usuarioPorId(e, usuario.id) ?? usuario;
      return procesarCompra(e, comprador, carrito, {
        entrega: v.entrega, pago: v.pago, receptor: v.receptor, telefono: v.telefono, region: v.region,
        comuna: v.comuna, direccion: v.direccion, numeroTarjeta: v.numero,
      });
    });
    if (!r) return;
    if (!r.ok) {
      avisar(r.error, 'error');
      return;
    }
    pagado.current = true;
    guardarCarrito([]);
    navegar(`/confirmacion/${r.valor.map((o) => o.id).join(',')}`);
  };

  const opcion = (nombre: string, valor: string, marcada: boolean, elegir: () => void, titulo: string, detalle: string) => (
    <label className="opcion">
      <input type="radio" name={nombre} value={valor} checked={marcada} onChange={elegir} />
      <span className="opcion__titulo">{titulo}</span>
      <span className="opcion__detalle">{detalle}</span>
    </label>
  );

  return (
    <section className="vista contenedor" id="vista-checkout" data-vista="checkout" aria-labelledby="checkout-titulo">
      <nav className="migas" aria-label="Pasos de la compra">
        <ol><li><Link to="/carrito">Carrito</Link></li><li aria-current="page">Entrega y pago</li></ol>
      </nav>
      <h1 className="titulo-vista" id="checkout-titulo">Entrega y pago</h1>
      <form className="checkout row g-4" id="form-checkout" noValidate onSubmit={pagar}>
        <div className="checkout__pasos col-lg-8">
          <section className="bloque" aria-labelledby="co-entrega-titulo">
            <h2 className="titulo-chico" id="co-entrega-titulo">1. Entrega</h2>
            <fieldset className="opciones">
              <legend className="solo-lector">Forma de entrega</legend>
              {opcion('entrega', 'despacho', despacho, () => f.cambiar('entrega', 'despacho'), 'Despacho a domicilio', 'Cada vendedor envía su paquete. El costo depende de tu región.')}
              {opcion('entrega', 'retiro', !despacho, () => f.cambiar('entrega', 'retiro'), 'Entrega en persona', 'Sin costo. Coordinas el punto de encuentro con quien vende.')}
            </fieldset>
            <div className="rejilla-campos row row-cols-1 row-cols-sm-2 g-3">
              <Campo id="co-receptor" etiqueta="Nombre de quien recibe" error={f.errores.receptor}>
                <input {...f.campo('receptor')} autoComplete="name" maxLength={60} />
              </Campo>
              <Campo id="co-telefono" etiqueta="Teléfono de contacto" error={f.errores.telefono}>
                <input {...f.campo('telefono')} type="tel" autoComplete="tel" maxLength={16} placeholder="+56 9 1234 5678" />
              </Campo>
            </div>
            {despacho && (
              <div className="rejilla-campos row row-cols-1 row-cols-sm-2 g-3" id="co-direccion-campos">
                <Campo id="co-region" etiqueta="Región" error={f.errores.region}>
                  <select {...f.campo('region')} autoComplete="address-level1"
                    onChange={(ev: ChangeEvent<HTMLSelectElement>) => { f.cambiar('region', ev.target.value, true); f.cambiar('comuna', ''); }}>
                    <option value="">Elige una región</option>
                    {REGIONES.map((r) => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
                  </select>
                </Campo>
                <Campo id="co-comuna" etiqueta="Comuna" error={f.errores.comuna}>
                  <select {...f.campo('comuna', { validarAlCambiar: true })} autoComplete="address-level2" disabled={!v.region}>
                    <option value="">{v.region ? 'Elige una comuna' : 'Primero elige una región'}</option>
                    {comunasDe(v.region).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </Campo>
                <Campo id="co-direccion" etiqueta="Dirección" error={f.errores.direccion} clase="col-sm-12">
                  <input {...f.campo('direccion')} autoComplete="street-address" maxLength={120} placeholder="Calle, número y depto." />
                </Campo>
              </div>
            )}
          </section>

          <section className="bloque" aria-labelledby="co-pago-titulo">
            <h2 className="titulo-chico" id="co-pago-titulo">2. Pago</h2>
            <fieldset className="opciones">
              <legend className="solo-lector">Medio de pago</legend>
              {opcion('pago', 'tarjeta', v.pago === 'tarjeta', () => f.cambiar('pago', 'tarjeta'), 'Tarjeta de crédito o débito', 'Revisamos que el número sea válido antes de pagar.')}
              {opcion('pago', 'transferencia', v.pago === 'transferencia', () => f.cambiar('pago', 'transferencia'), 'Transferencia', 'Se confirma al instante.')}
            </fieldset>
            {v.pago === 'tarjeta' ? (
              <div id="co-tarjeta-campos">
                <div className="rejilla-campos row row-cols-1 row-cols-sm-2 g-3">
                  <Campo id="co-numero" etiqueta="Número de tarjeta" error={f.errores.numero} clase="col-sm-12">
                    <input {...f.campo('numero')} inputMode="numeric" autoComplete="cc-number" maxLength={23} placeholder="0000 0000 0000 0000"
                      onChange={(ev) => f.cambiar('numero', formatearTarjeta(ev.target.value))} />
                  </Campo>
                  <Campo id="co-titular" etiqueta="Nombre en la tarjeta" error={f.errores.titular} clase="col-sm-12">
                    <input {...f.campo('titular')} autoComplete="cc-name" maxLength={60} />
                  </Campo>
                  <Campo id="co-vence" etiqueta="Vencimiento" error={f.errores.vence}>
                    <input {...f.campo('vence')} inputMode="numeric" autoComplete="cc-exp" maxLength={5} placeholder="MM/AA"
                      onChange={(ev) => f.cambiar('vence', formatearVencimiento(ev.target.value))} />
                  </Campo>
                  <Campo id="co-cvv" etiqueta="Código de seguridad" error={f.errores.cvv}>
                    <input {...f.campo('cvv')} inputMode="numeric" autoComplete="cc-csc" maxLength={4} placeholder="123" />
                  </Campo>
                </div>
              </div>
            ) : (
              <div id="co-transferencia-campos">
                <p className="nota">Tu pedido queda confirmado al instante y te enviamos los datos de la transferencia por correo.</p>
              </div>
            )}
          </section>
        </div>

        <div className="col-lg-4">
        <aside className="resumen checkout__resumen" aria-labelledby="co-resumen-titulo">
          <h2 id="co-resumen-titulo">Tu compra</h2>
          <div id="checkout-resumen">
            {compra.paquetes.map((g, i) => (
              <div key={g.vendedor.id} className="paquete-resumen">
                <h3>Paquete {i + 1} de {compra.paquetes.length}: vende {nombreCorto(g.vendedor)}</h3>
                <ul>
                  {g.items.map((l) => (
                    <li key={l.pub.id}><span>{l.item.cantidad} × {l.pub.nombre} <small>{l.pub.condicion}</small></span><span>{clp(l.pub.precio * l.item.cantidad)}</span></li>
                  ))}
                </ul>
                <p className="paquete-resumen__envio">
                  <span>{despacho ? `Envío desde ${g.vendedor.comuna}` : 'Entrega en persona'}</span><span>{g.envio ? clp(g.envio) : 'Sin costo'}</span>
                </p>
              </div>
            ))}
            <div className="resumen__fila"><span>Cartas ({compra.unidades})</span><span>{clp(compra.subtotal)}</span></div>
            <div className="resumen__fila"><span>Envío</span><span>{compra.envio ? clp(compra.envio) : 'Sin costo'}</span></div>
            <div className="resumen__fila resumen__total"><span>Total</span><span>{clp(compra.total)}</span></div>
          </div>
          <button type="submit" className="btn btn--primario btn--grande btn--bloque" id="checkout-pagar">Pagar {clp(compra.total)}</button>
          <p className="nota">Al pagar aceptas los <a href="#" data-accion="ver-terminos" onClick={verLegal('terminos')}>términos y condiciones</a>. Precios en CLP con IVA incluido.</p>
        </aside>
        </div>
      </form>
    </section>
  );
}
