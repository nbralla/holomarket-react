import { useEffect, useRef, useState } from 'react';
import Carta from '../components/Carta';
import { CondicionChip } from '../components/Chips';
import { calcularCompra, revisarCarrito, type LineaCarrito } from '../logica/compras';
import { useAvisos } from '../hooks/useAvisos';
import { useTienda } from '../hooks/useTienda';
import type { Usuario } from '../types';
import { clp, nombreCorto, plural } from '../utils/formato';

import { Link } from 'react-router';
export default function Carrito({ usuario }: { usuario: Usuario }) {
  const { estado, carrito, guardarCarrito } = useTienda();
  const { avisar } = useAvisos();
  const titulo = useRef<HTMLHeadingElement>(null);
  const revision = revisarCarrito(estado, usuario.id, carrito);
  const [avisos, setAvisos] = useState<string[]>([]);

  // Si el stock cambió desde que se agregaron las cartas, se ajusta el carrito y se avisa.
  const hayCambios = revision.avisos.length > 0;
  useEffect(() => {
    if (!hayCambios) return;
    setAvisos(revision.avisos);
    guardarCarrito(revision.items);
  }, [hayCambios, revision.avisos, revision.items, guardarCarrito]);

  const cambiarCantidad = (pubId: string, delta: number) => {
    const linea = revision.lineas.find((l) => l.pub.id === pubId);
    if (!linea) return;
    const nueva = linea.item.cantidad + delta;
    if (nueva < 1) return;
    if (nueva > linea.pub.stock) {
      avisar(`Solo hay ${linea.pub.stock} ${plural(linea.pub.stock, 'unidad disponible', 'unidades disponibles')} de ${linea.pub.nombre}.`, 'error');
      return;
    }
    guardarCarrito(carrito.map((i) => (i.pubId === pubId ? { ...i, cantidad: nueva } : i)));
  };

  const quitar = (l: LineaCarrito) => {
    guardarCarrito(carrito.filter((i) => i.pubId !== l.pub.id));
    avisar(`Quitaste ${l.pub.nombre} del carrito.`, 'info');
    titulo.current?.focus();
  };

  const avisosHTML = avisos.length > 0 && (
    <div className="alerta alerta--aviso" role="status">{avisos.map((a) => <p key={a}>{a}</p>)}</div>
  );

  if (!revision.lineas.length) {
    return (
      <section className="vista contenedor" id="vista-carrito" data-vista="carrito" aria-labelledby="carrito-titulo">
        <h1 className="titulo-vista" id="carrito-titulo" ref={titulo} tabIndex={-1}>Carrito</h1>
        <div id="carrito">
          {avisosHTML}
          <div className="vacio vacio--caja">
            <h2>Tu carrito está vacío</h2>
            <p>Busca la carta que te falta y agrégala desde el catálogo.</p>
            <Link className="btn btn--primario" to="/catalogo">Ir al catálogo</Link>
          </div>
        </div>
      </section>
    );
  }

  const compra = calcularCompra(estado, revision.lineas, 'despacho', usuario.region);

  return (
    <section className="vista contenedor" id="vista-carrito" data-vista="carrito" aria-labelledby="carrito-titulo">
      <h1 className="titulo-vista" id="carrito-titulo" ref={titulo} tabIndex={-1}>Carrito</h1>
      <div id="carrito">
        {avisosHTML}
        <div className="carrito row g-4">
          <div className="carrito__paquetes col-lg-8">
            {compra.paquetes.map((g, i) => (
              <section key={g.vendedor.id} className="paquete" aria-labelledby={`paquete-${i}`}>
                <div className="paquete__cabeza">
                  <h2 className="paquete__titulo" id={`paquete-${i}`}>Paquete {i + 1}: vende {nombreCorto(g.vendedor)}</h2>
                  <span>Envía desde {g.vendedor.comuna}</span>
                </div>
                {g.items.map((l) => (
                  <div key={l.pub.id} className="linea-carrito">
                    <Carta carta={l.pub} clase="carta--mini" />
                    <div className="linea-carrito__info">
                      <Link className="linea-carrito__nombre" to={`/carta/${l.pub.id}`}>{l.pub.nombre}</Link>
                      <p className="celda-sub">{l.pub.edicion}{l.pub.numero ? `, ${l.pub.numero}` : ''}</p>
                      <p className="ficha__etiquetas"><CondicionChip id={l.pub.condicion} /><span className="etiqueta">{l.pub.idioma}</span></p>
                      <p className="celda-sub">{clp(l.pub.precio)} por unidad. {l.pub.stock} {plural(l.pub.stock, 'disponible', 'disponibles')}.</p>
                    </div>
                    <div className="cantidad" role="group" aria-label={`Cantidad de ${l.pub.nombre}`}>
                      <button type="button" data-accion="carrito-menos" aria-label={`Quitar una unidad de ${l.pub.nombre}`}
                        disabled={l.item.cantidad <= 1} onClick={() => cambiarCantidad(l.pub.id, -1)}>−</button>
                      <output aria-live="polite">{l.item.cantidad}</output>
                      <button type="button" data-accion="carrito-mas" aria-label={`Agregar una unidad de ${l.pub.nombre}`}
                        disabled={l.item.cantidad >= l.pub.stock} onClick={() => cambiarCantidad(l.pub.id, 1)}>+</button>
                    </div>
                    <div className="linea-carrito__total">
                      <strong>{clp(l.pub.precio * l.item.cantidad)}</strong>
                      <button type="button" className="enlace-boton" data-accion="carrito-quitar" aria-label={`Quitar ${l.pub.nombre} del carrito`}
                        onClick={() => quitar(l)}>Quitar</button>
                    </div>
                  </div>
                ))}
              </section>
            ))}
            <p className="nota">Cada vendedor despacha su propio paquete; por eso el envío se calcula por vendedor.</p>
          </div>
          <div className="col-lg-4">
          <aside className="resumen" aria-labelledby="carrito-resumen-titulo">
            <h2 id="carrito-resumen-titulo">Resumen</h2>
            <div className="resumen__fila"><span>Cartas ({compra.unidades})</span><span>{clp(compra.subtotal)}</span></div>
            <div className="resumen__fila"><span>Envío estimado a {usuario.region}</span><span>{clp(compra.envio)}</span></div>
            <div className="resumen__fila resumen__total"><span>Total estimado</span><span>{clp(compra.total)}</span></div>
            <Link className="btn btn--primario btn--grande btn--bloque" to="/checkout">Continuar con la compra</Link>
            <p className="nota">En el siguiente paso puedes elegir entrega en persona sin costo.</p>
          </aside>
          </div>
        </div>
      </div>
    </section>
  );
}
