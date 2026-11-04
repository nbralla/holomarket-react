import { useEffect, useRef, useState, type ChangeEvent, type FormEvent, type KeyboardEvent } from 'react';
import Campo from '../components/Campo';
import Carta from '../components/Carta';
import { CondicionChip } from '../components/Chips';
import { ACABADOS, CONDICIONES, IDIOMAS, IDS_JUEGOS, JUEGOS, esJuego, rarezasDe } from '../data/catalogo';
import { publicacionesVisibles } from '../logica/consultas';
import { descuento } from '../logica/ofertas';
import { crearPublicacion, editarPublicacion, pubPropia, type DatosPublicacion } from '../logica/publicaciones';
import { buscarSugerencias, explicarFalla, IMAGENES_ACTIVAS, rarezaDesde, sugerenciasEnCache, urlSegura, type Sugerencia } from '../services/apiTcg';
import { useAvisos } from '../hooks/useAvisos';
import { useDebounce } from '../hooks/useDebounce';
import { useFormulario } from '../hooks/useFormulario';
import { useLegal } from '../hooks/useLegal';
import { useTienda } from '../hooks/useTienda';
import type { CondicionId, Usuario } from '../types';
import { clp, plural, sinParentesis } from '../utils/formato';
import { comprimirImagen, fotoValida } from '../utils/imagen';
import { useNavegar } from '../hooks/useRuta';
import { entero, imagenError, largoEntre, normalizar, numeroCartaValido, precioError, stockError } from '../utils/validaciones';
import { Link } from 'react-router';

type Valores = {
  juego: string;
  nombre: string;
  edicion: string;
  numero: string;
  rareza: string;
  acabado: string;
  idioma: string;
  condicion: string;
  precio: string;
  precioAnterior: string;
  stock: string;
  descripcion: string;
};

export default function Vender({ id, usuario }: { id: string; usuario: Usuario }) {
  const { estado, actualizar } = useTienda();
  const { navegar } = useNavegar();
  const { avisar } = useAvisos();
  const verLegal = useLegal();
  const editando = id ? pubPropia(estado, usuario.id, id) : undefined;
  const [editandoId] = useState(() => editando?.id ?? '');

  const f = useFormulario<Valores>('v-', () => ({
    juego: editando?.juego ?? '', nombre: editando?.nombre ?? '', edicion: editando?.edicion ?? '', numero: editando?.numero ?? '',
    rareza: editando?.rareza ?? '', acabado: editando?.acabado ?? 'Normal', idioma: editando?.idioma ?? 'ES',
    condicion: editando?.condicion ?? '', precio: editando ? String(editando.precio) : '',
    precioAnterior: editando?.precioAnterior ? String(editando.precioAnterior) : '', stock: editando ? String(editando.stock) : '1',
    descripcion: editando?.descripcion ?? '',
  }), (v) => ({
    juego: esJuego(v.juego) ? '' : 'Elige el juego de la carta.',
    nombre: largoEntre(v.nombre, 2, 60) ? '' : 'Escribe el nombre de la carta (2 a 60 caracteres).',
    edicion: largoEntre(v.edicion, 2, 60) ? '' : 'Indica la edición o set (2 a 60 caracteres).',
    numero: numeroCartaValido(v.numero) ? '' : 'Usa solo letras, números, guion o barra (hasta 15), por ejemplo 125/197.',
    rareza: rarezasDe(v.juego).includes(v.rareza) ? '' : esJuego(v.juego) ? 'Elige la rareza.' : 'Elige primero el juego.',
    acabado: ACABADOS.includes(v.acabado) ? '' : 'Elige el acabado.',
    idioma: IDIOMAS[v.idioma] ? '' : 'Elige el idioma.',
    condicion: v.condicion ? '' : 'Elige la condición de la carta.',
    precio: precioError(v.precio),
    // Opcional: si se escribe, debe ser mayor que el precio actual (así la carta aparece en Ofertas).
    precioAnterior: !v.precioAnterior.trim() ? ''
      : Number.isNaN(entero(v.precioAnterior)) || entero(v.precioAnterior) > 50000000 ? 'Ingresa un precio en pesos, sin puntos.'
        : entero(v.precioAnterior) <= entero(v.precio) ? 'Para mostrar una oferta, el precio anterior debe ser mayor que el precio actual.' : '',
    stock: stockError(v.stock, editandoId ? 0 : 1),
    descripcion: v.descripcion.length <= 300 ? '' : 'La descripción admite hasta 300 caracteres.',
  }));
  const v = f.valores;

  /* Foto propia: undefined = sin cambios, null = quitar, texto = foto nueva (data URL reducida). */
  const [foto, setFoto] = useState<string | null | undefined>(undefined);
  const [fotoError, setFotoError] = useState('');
  const campoFoto = useRef<HTMLInputElement>(null);
  /* Imagen elegida de API TCG: mismas reglas que la foto. */
  const [imagenApi, setImagenApi] = useState<string | null | undefined>(undefined);
  const [nombreElegido, setNombreElegido] = useState(() => (editando && urlSegura(editando.imagenApi) ? editando.nombre : ''));

  const fotoActual = foto !== undefined ? foto : editando && fotoValida(editando.imagen) ? editando.imagen : null;
  const imagenApiActual = imagenApi !== undefined ? imagenApi : editando ? urlSegura(editando.imagenApi) : null;

  // Solo se puede editar una publicación propia y no eliminada.
  const noPermitida = Boolean(id) && !editandoId;
  useEffect(() => {
    if (!noPermitida) return;
    avisar('Solo puedes editar tus propias publicaciones.', 'error');
    navegar('/inventario');
  }, [noPermitida, avisar, navegar]);

  /* ---------- Sugerencias de API TCG al escribir el nombre ---------- */
  const [sugerencias, setSugerencias] = useState<Sugerencia[]>([]);
  const [activa, setActiva] = useState(-1);
  const [abierta, setAbierta] = useState(false);
  const [estadoBusqueda, setEstadoBusqueda] = useState('');
  const nombreActual = v.nombre.trim();
  const nombreRetrasado = useDebounce(nombreActual, 400);

  useEffect(() => {
    if (!IMAGENES_ACTIVAS) return;
    // Se busca 400 ms después de la última tecla; al elegir una sugerencia el nombre cambia y no se vuelve a buscar.
    if (nombreRetrasado !== nombreActual) return;
    if (nombreRetrasado.length < 3 || nombreRetrasado === nombreElegido) {
      setAbierta(false);
      if (nombreRetrasado.length < 3) setEstadoBusqueda('');
      return;
    }
    if (!esJuego(v.juego)) {
      setAbierta(false);
      setEstadoBusqueda('Elige el juego para ver las cartas de API TCG con ese nombre.');
      return;
    }
    const juego = v.juego;
    const control = new AbortController();
    if (!sugerenciasEnCache(juego, nombreRetrasado)) setEstadoBusqueda('Buscando en API TCG…');
    buscarSugerencias(juego, nombreRetrasado, control.signal).then((lista) => {
      if (control.signal.aborted) return;
      setSugerencias(lista);
      setActiva(-1);
      setAbierta(lista.length > 0);
      setEstadoBusqueda(lista.length
        ? `${lista.length} ${plural(lista.length, 'carta encontrada', 'cartas encontradas')} en API TCG. Elige una con un clic o con las flechas y Enter.`
        : 'No encontramos cartas con ese nombre en API TCG. Puedes escribir los datos a mano.');
    }).catch((e: unknown) => {
      if (control.signal.aborted) return;
      setAbierta(false);
      setEstadoBusqueda(`No pudimos buscar en API TCG: ${explicarFalla(e)} Puedes escribir los datos a mano.`);
    });
    return () => control.abort();
  }, [nombreRetrasado, nombreActual, v.juego, nombreElegido]);

  const elegirSugerencia = (s: Sugerencia) => {
    f.cambiar('nombre', s.nombre);
    if (s.edicion) f.cambiar('edicion', s.edicion);
    if (s.numero) f.cambiar('numero', s.numero);
    const rareza = esJuego(v.juego) ? rarezaDesde(v.juego, s.rareza) : '';
    if (rareza) f.cambiar('rareza', rareza);
    (['nombre', 'edicion', 'numero', 'rareza'] as const).forEach((c) => f.mostrar(c, ''));
    setNombreElegido(s.nombre);
    setImagenApi(s.imagen || null);
    setAbierta(false);
    setEstadoBusqueda(`Elegiste ${s.nombre}${s.edicion ? ` de ${s.edicion}` : ''}. Revisa los datos y completa condición, precio y stock.`);
    document.getElementById('v-nombre')?.focus();
  };

  const teclaNombre = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (!abierta || !sugerencias.length) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const n = sugerencias.length;
      setActiva((a) => (ev.key === 'ArrowDown' ? (a + 1) % n : (a - 1 + n) % n));
    } else if (ev.key === 'Enter' && activa >= 0) {
      ev.preventDefault();
      elegirSugerencia(sugerencias[activa]);
    } else if (ev.key === 'Escape') {
      ev.preventDefault();
      ev.stopPropagation();
      setAbierta(false);
    }
  };

  useEffect(() => {
    if (activa >= 0) document.getElementById(`v-sug-${activa}`)?.scrollIntoView({ block: 'nearest' });
  }, [activa]);

  const cambiarNombre = (ev: ChangeEvent<HTMLInputElement>) => {
    f.cambiar('nombre', ev.target.value);
    // Si cambia el nombre después de elegir una sugerencia, la imagen ya no corresponde.
    if (nombreElegido && ev.target.value.trim() !== nombreElegido) {
      setNombreElegido('');
      if (imagenApiActual) setImagenApi(null);
    }
  };

  const cambiarJuego = (ev: ChangeEvent<HTMLSelectElement>) => {
    f.cambiar('juego', ev.target.value, true);
    // Cada juego tiene sus propias rarezas: si la elegida no existe en el nuevo juego, se limpia.
    if (v.rareza && !rarezasDe(ev.target.value).includes(v.rareza)) f.cambiar('rareza', '');
    if (imagenApiActual) {
      setImagenApi(null);
      setNombreElegido('');
    }
  };

  /* ---------- Foto ---------- */
  const elegirFoto = async (ev: ChangeEvent<HTMLInputElement>) => {
    const archivo = ev.target.files?.[0];
    let error = imagenError(archivo, 3);
    if (archivo && !error) {
      try {
        setFoto(await comprimirImagen(archivo));
      } catch (e) {
        error = e instanceof Error ? e.message : 'No pudimos leer la imagen.';
      }
    }
    setFotoError(error);
    if (error && campoFoto.current) campoFoto.current.value = '';
  };

  const quitarFoto = () => {
    setFoto(null);
    setFotoError('');
    if (campoFoto.current) campoFoto.current.value = '';
    campoFoto.current?.focus();
  };

  /* ---------- Vista previa, monto neto y precio de referencia ---------- */
  const precio = Number.isNaN(entero(v.precio)) ? 0 : entero(v.precio);
  const descuentoVista = descuento({ precio, precioAnterior: Number.isNaN(entero(v.precioAnterior)) ? null : entero(v.precioAnterior) });
  const stock = Number.isNaN(entero(v.stock)) ? 0 : entero(v.stock);
  const previa = {
    juego: esJuego(v.juego) ? v.juego : 'pokemon' as const, nombre: v.nombre.trim() || 'Nombre de la carta', edicion: v.edicion.trim() || 'Edición',
    numero: v.numero, idioma: v.idioma || 'ES', acabado: v.acabado || 'Normal', imagen: fotoActual, imagenApi: imagenApiActual,
  };
  const comision = Math.round(precio * estado.config.comision / 100);
  const iva = Math.round(comision * estado.config.iva / 100);
  const base = normalizar(sinParentesis(v.nombre));
  const edicion = normalizar(v.edicion);
  const similares = base.length >= 3
    ? publicacionesVisibles(estado).filter((x) => x.id !== editandoId && x.juego === previa.juego && x.stock > 0 &&
      normalizar(sinParentesis(x.nombre)) === base && (!edicion || normalizar(x.edicion) === edicion))
    : [];
  let referencia = 'Escribe el nombre de la carta para ver a cuánto la venden otras personas.';
  if (base.length >= 3 && !similares.length) referencia = 'Nadie más vende esta carta en HoloMarket: tu precio será la referencia.';
  if (similares.length) {
    const precios = similares.map((x) => x.precio);
    referencia = `${similares.length} ${plural(similares.length, 'oferta', 'ofertas')} de esta carta en HoloMarket: desde ${clp(Math.min(...precios))} hasta ${clp(Math.max(...precios))}.`;
  }

  /* ---------- Publicar o guardar cambios ---------- */
  const enviar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const ok = f.validarTodo();
    if (!ok || fotoError) {
      if (ok) campoFoto.current?.focus();
      avisar('Revisa los campos marcados antes de publicar.', 'error');
      return;
    }
    const datos: DatosPublicacion = {
      juego: esJuego(v.juego) ? v.juego : 'pokemon', nombre: v.nombre, edicion: v.edicion, numero: v.numero, rareza: v.rareza,
      acabado: v.acabado, idioma: v.idioma, condicion: v.condicion as CondicionId, precio: entero(v.precio),
      precioAnterior: v.precioAnterior.trim() ? entero(v.precioAnterior) : null, stock: entero(v.stock),
      descripcion: v.descripcion,
    };
    const imagenes = { imagen: foto, imagenApi };
    if (editandoId) {
      const r = actualizar((e) => editarPublicacion(e, usuario.id, editandoId, datos, imagenes));
      if (!r) return;
      if (!r.ok) {
        avisar(r.error, 'error');
        return;
      }
      avisar(`Guardaste los cambios de ${r.valor.nombre}.`, 'exito', { href: `/carta/${r.valor.id}`, texto: 'Ver publicación' });
    } else {
      const pub = actualizar((e) => crearPublicacion(e, usuario, datos, { imagen: foto ?? null, imagenApi: imagenApi ?? null }));
      if (!pub) return;
      avisar(`Publicaste ${pub.nombre}. Ya aparece en el catálogo.`, 'exito', { href: `/carta/${pub.id}`, texto: 'Ver publicación' });
    }
    navegar('/inventario');
  };

  if (noPermitida) return null;
  const juegoElegido = esJuego(v.juego) ? JUEGOS[v.juego] : null;

  return (
    <section className="vista contenedor" id="vista-vender" data-vista="vender" aria-labelledby="vender-titulo">
      <div className="vista__cabeza">
        <div>
          <h1 className="titulo-vista" id="vender-titulo">{editandoId ? 'Editar publicación' : 'Publicar una carta'}</h1>
          <p className="bajada">Publicar es gratis. Cobramos {estado.config.comision} % + IVA solo cuando vendes.</p>
        </div>
      </div>
      <div className="vender">
        <form className="formulario" id="form-vender" noValidate onSubmit={enviar}>
          <section className="bloque" aria-labelledby="v-carta-titulo">
            <h2 className="titulo-chico" id="v-carta-titulo">La carta</h2>
            <div className="rejilla-campos row row-cols-1 row-cols-sm-2 g-3">
              <Campo id="v-juego" etiqueta="Juego" error={f.errores.juego}>
                <select {...f.campo('juego')} onChange={cambiarJuego}>
                  <option value="">Elige un juego</option>
                  {IDS_JUEGOS.map((j) => <option key={j} value={j}>{JUEGOS[j].nombre}</option>)}
                </select>
              </Campo>
              <Campo id="v-nombre" etiqueta="Nombre de la carta" error={f.errores.nombre}>
                <div className="autocompletar">
                  <input {...f.campo('nombre')} maxLength={60} autoComplete="off" onChange={cambiarNombre} onKeyDown={teclaNombre}
                    onBlur={() => { f.tocar('nombre'); setTimeout(() => setAbierta(false), 150); }}
                    placeholder={IMAGENES_ACTIVAS ? 'Escribe 3 letras para buscar en API TCG' : 'Ej.: Charizard ex'}
                    aria-describedby="v-sugerencias-estado v-nombre-error"
                    {...(IMAGENES_ACTIVAS ? {
                      role: 'combobox', 'aria-autocomplete': 'list' as const, 'aria-expanded': abierta, 'aria-controls': 'v-sugerencias',
                      'aria-activedescendant': abierta && activa >= 0 ? `v-sug-${activa}` : undefined,
                    } : {})} />
                  {abierta && (
                    <ul className="sugerencias" id="v-sugerencias" role="listbox" aria-label="Cartas encontradas en API TCG">
                      {sugerencias.map((s, i) => (
                        <li key={`${s.nombre}-${s.numero}-${i}`} role="option" id={`v-sug-${i}`} aria-selected={i === activa}
                          className={`sugerencia${i === activa ? ' sugerencia--activa' : ''}`} data-indice={i}
                          onMouseDown={(ev) => { ev.preventDefault(); elegirSugerencia(s); }}>
                          {s.miniatura ? <img src={s.miniatura} alt="" loading="lazy" referrerPolicy="no-referrer" /> : <span className="sugerencia__sin-imagen" aria-hidden="true" />}
                          <span className="sugerencia__texto">
                            <strong>{s.nombre}</strong>
                            <span>{[s.edicion, s.numero].filter(Boolean).join(' · ') || 'Sin datos de edición'}</span>
                            {s.rareza && <span className="sugerencia__rareza">{s.rareza}</span>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <p className="campo__ayuda" id="v-sugerencias-estado" aria-live="polite">{estadoBusqueda}</p>
              </Campo>
              <Campo id="v-edicion" etiqueta="Edición o set" error={f.errores.edicion}>
                <input {...f.campo('edicion')} maxLength={60} autoComplete="off" list="v-ediciones" placeholder="Ej.: Obsidian Flames" />
                <datalist id="v-ediciones">{juegoElegido?.ediciones.map((e) => <option key={e} value={e} />)}</datalist>
              </Campo>
              <Campo id="v-numero" etiqueta="Número" opcional error={f.errores.numero}>
                <input {...f.campo('numero')} maxLength={15} autoComplete="off" placeholder="Ej.: 125/197" />
              </Campo>
              <Campo id="v-rareza" etiqueta="Rareza" error={f.errores.rareza}>
                <select {...f.campo('rareza', { validarAlCambiar: true })}>
                  <option value="">{esJuego(v.juego) ? 'Elige la rareza' : 'Elige primero el juego'}</option>
                  {rarezasDe(v.juego).map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
              </Campo>
              <Campo id="v-acabado" etiqueta="Acabado" error={f.errores.acabado}>
                <select {...f.campo('acabado', { validarAlCambiar: true })}>
                  {ACABADOS.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
              </Campo>
              <Campo id="v-idioma" etiqueta="Idioma" error={f.errores.idioma}>
                <select {...f.campo('idioma', { validarAlCambiar: true })}>
                  {Object.entries(IDIOMAS).map(([clave, nombre]) => <option key={clave} value={clave}>{nombre}</option>)}
                </select>
              </Campo>
            </div>
          </section>

          <fieldset className={`bloque${f.errores.condicion ? ' con-error' : ''}`} id="v-condicion" aria-describedby="v-condicion-error">
            <legend className="titulo-chico">Condición</legend>
            <p className="nota">Si dudas entre dos, elige la más baja. <button type="button" className="enlace-boton" data-accion="ver-condiciones" onClick={verLegal('condiciones')}>Ver guía de condiciones</button></p>
            <div className="opciones opciones--condicion" id="v-condiciones">
              {CONDICIONES.map((c) => (
                <label key={c.id} className="opcion">
                  <input type="radio" name="condicion" value={c.id} checked={v.condicion === c.id} aria-invalid={f.errores.condicion ? true : undefined}
                    onChange={() => f.cambiar('condicion', c.id, true)} />
                  <span className="opcion__titulo"><CondicionChip id={c.id} /> {c.nombre}</span>
                  <span className="opcion__detalle">{c.detalle}</span>
                </label>
              ))}
            </div>
            <p className="campo__error" id="v-condicion-error">{f.errores.condicion}</p>
          </fieldset>

          <section className="bloque" aria-labelledby="v-precio-titulo">
            <h2 className="titulo-chico" id="v-precio-titulo">Precio y stock</h2>
            <div className="rejilla-campos row row-cols-1 row-cols-sm-2 g-3">
              <div className={`campo${f.errores.precio ? ' con-error' : ''}`}>
                <label htmlFor="v-precio">Precio por unidad (CLP, IVA incluido)</label>
                <input {...f.campo('precio')} type="number" min={100} max={50000000} step={10} inputMode="numeric" placeholder="Ej.: 5990"
                  aria-describedby="v-neto v-precio-error" />
                <p className="campo__ayuda" id="v-neto">
                  {precio >= 100
                    ? `Por cada unidad vendida recibes ${clp(precio - comision - iva)}: comisión de ${estado.config.comision} % (${clp(comision)}) más IVA (${clp(iva)}).`
                    : `Publicar es gratis. Cuando vendes, HoloMarket descuenta ${estado.config.comision} % más IVA.`}
                </p>
                <p className="campo__error" id="v-precio-error">{f.errores.precio}</p>
              </div>
              <Campo id="v-stock" etiqueta="Unidades disponibles" error={f.errores.stock}
                ayuda={editandoId ? 'Si cambias el stock, el ajuste queda registrado en el historial.' : 'Entre 1 y 999 unidades. Se descuentan solas con cada venta.'}>
                <input {...f.campo('stock', { ayuda: true })} type="number" min={editandoId ? 0 : 1} max={999} step={1} inputMode="numeric" />
              </Campo>
              <Campo id="v-precioAnterior" etiqueta="Precio antes de la oferta" opcional error={f.errores.precioAnterior}
                ayuda={descuentoVista ? `Se mostrará con ${descuentoVista} % de descuento en Ofertas.` : 'Si lo completas con un precio mayor, tu carta aparece en Ofertas con el precio tachado.'}>
                <input {...f.campo('precioAnterior', { ayuda: true })} type="number" min={100} max={50000000} step={10} inputMode="numeric" placeholder="Ej.: 7490" />
              </Campo>
            </div>
            <p className="referencia" id="v-referencia">{referencia}</p>
          </section>

          <section className="bloque" aria-labelledby="v-foto-titulo">
            <h2 className="titulo-chico" id="v-foto-titulo">Foto y descripción</h2>
            <div className={`campo${fotoError ? ' con-error' : ''}`}>
              <label htmlFor="v-foto">Foto de la carta <span className="campo__opcional">(opcional)</span></label>
              <input id="v-foto" ref={campoFoto} name="foto" type="file" accept="image/jpeg,image/png,image/webp"
                aria-describedby="v-foto-ayuda v-foto-error" aria-invalid={fotoError ? true : undefined} onChange={elegirFoto} />
              <p className="campo__ayuda" id="v-foto-ayuda">JPG, PNG o WEBP de hasta 3 MB. La reducimos para que cargue rápido. Sin foto mostramos una ilustración.</p>
              {IMAGENES_ACTIVAS && <p className="campo__ayuda" id="v-foto-api">La API de imágenes está activa: si no subes una foto, mostraremos la imagen de referencia de la carta.</p>}
              <p className="campo__error" id="v-foto-error">{fotoError}</p>
              {fotoActual && (
                <>
                  <div className="foto-actual" id="v-foto-actual"><img src={fotoActual} alt="Foto que se publicará" /><span>Foto lista para publicar.</span></div>
                  <button type="button" className="enlace-boton texto-peligro" id="v-quitar-foto" onClick={quitarFoto}>Quitar foto</button>
                </>
              )}
              {imagenApiActual && (
                <div className="imagen-api" id="v-imagen-api">
                  <img src={imagenApiActual} alt="" referrerPolicy="no-referrer" />
                  <span>Imagen de API TCG elegida.{fotoActual ? ' Tu foto tiene prioridad: esta se usará si la quitas.' : ' Se mostrará en el catálogo si no subes una foto.'}</span>
                  <button type="button" className="enlace-boton texto-peligro" data-accion="quitar-imagen-api"
                    onClick={() => { setImagenApi(null); setNombreElegido(''); document.getElementById('v-nombre')?.focus(); }}>Quitar imagen</button>
                </div>
              )}
            </div>
            <Campo id="v-descripcion" etiqueta="Descripción" opcional error={f.errores.descripcion} ayuda={`${v.descripcion.length} de 300 caracteres`}>
              <textarea {...f.campo('descripcion')} rows={3} maxLength={300} placeholder="Estado real, si viene con protector, detalles del envío…"
                aria-describedby="v-descripcion-ayuda v-descripcion-error" />
            </Campo>
          </section>

          <div className="acciones-fila">
            <button type="submit" className="btn btn--primario btn--grande" id="vender-enviar">{editandoId ? 'Guardar cambios' : 'Publicar carta'}</button>
            <Link className="btn btn--fantasma btn--grande" to="/inventario">Cancelar</Link>
          </div>
        </form>

        <aside className="vista-previa" aria-labelledby="v-previa-titulo">
          <h2 className="titulo-chico" id="v-previa-titulo">Así se verá en el catálogo</h2>
          <div className="ficha ficha--previa" id="v-vista-previa">
            <Carta carta={previa} alt="Vista previa de la foto" buscarImagen={false} />
            <p className="ficha__nombre">{previa.nombre}</p>
            <p className="ficha__edicion">{previa.edicion}{previa.numero ? `, ${previa.numero}` : ''}</p>
            <p className="ficha__etiquetas">
              <CondicionChip id={v.condicion || 'NM'} /><span className="etiqueta">{previa.idioma}</span>
              {previa.acabado !== 'Normal' && <span className="etiqueta">{previa.acabado}</span>}
            </p>
            <div className="ficha__compra"><p className="ficha__precio">{precio ? clp(precio) : '$0'}</p><p className="ficha__stock">{stock} {plural(stock, 'unidad', 'unidades')}</p></div>
          </div>
        </aside>
      </div>
    </section>
  );
}
