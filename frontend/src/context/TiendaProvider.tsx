/* =========================================================================
   Estado global de la tienda (Context API)
   -------------------------------------------------------------------------
   Guarda los datos, la sesión y el carrito, y los comparte con todas las
   páginas mediante el hook useTienda(). Cada acción:
     1. llama a su endpoint del backend (Spring Boot), que aplica las reglas,
     2. si responde bien, se vuelve a pedir GET /api/estado,
     3. React redibuja con los datos nuevos.
   Si el backend rechaza la acción, su mensaje se muestra tal cual.
   La sesión (token JWT) y el carrito viven en el navegador (localStorage).
   ========================================================================= */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate } from 'react-router';
import { usuarioPorId } from '../logica/consultas';
import { api, avisarNoAutorizado, cargarEstado, ErrorApi, type DatosRegistro, type RespuestaIngreso } from '../services/datos';
import { borrarSesion, guardarCarrito as persistirCarrito, guardarSesion, leerCarrito, leerSesion } from '../services/sesion';
import type { Estado, ItemCarrito, Resultado, Sesion } from '../types';
import { useAvisos } from '../hooks/useAvisos';
import { TiendaContext, type TiendaValor } from './tiendaContext';

const MS_RENOVAR = 30000;      // la sesión se renueva como máximo cada 30 s de actividad
const MS_REVISAR = 15000;      // cada 15 s se revisa si la sesión venció

const mensajeDe = (error: unknown): string =>
  error instanceof ErrorApi ? error.message : 'No pudimos completar la operación. Inténtalo de nuevo.';

export function TiendaProvider({ estadoInicial, children }: { estadoInicial: Estado; children: ReactNode }) {
  const { avisar } = useAvisos();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);
  const [ahora, setAhora] = useState(() => Date.now());
  /* Token con que se pidieron los datos que hay en pantalla (Arranque los pidió con la sesión guardada).
     Sirve para no juzgar una sesión con datos pedidos con otra: por ejemplo, cuando se ingresa en
     otra pestaña y esta todavía tiene los datos de visitante. */
  const [tokenDelEstado, setTokenDelEstado] = useState<string | null>(() => leerSesion()?.token ?? null);
  const estadoRef = useRef(estado);
  const ultimaRenovacion = useRef(0);

  /* ---------- Usuario actual: sesión vigente y cuenta activa ---------- */
  const usuario = useMemo(() => {
    if (!sesion || sesion.expira <= ahora || sesion.token !== tokenDelEstado) return null;
    // Con un token válido el backend entrega los datos completos del propio usuario (con su correo).
    // Si solo llega la ficha pública, el token ya no sirve y la sesión se cierra.
    const u = usuarioPorId(estado, sesion.uid);
    return u && u.estado === 'activo' && u.email ? u : null;
  }, [estado, sesion, ahora, tokenDelEstado]);
  const uid = usuario?.id ?? null;

  const [carrito, setCarrito] = useState<ItemCarrito[]>(() => (sesion ? leerCarrito(sesion.uid) : []));
  useEffect(() => {
    setCarrito(uid ? leerCarrito(uid) : []);
  }, [uid]);

  /* ---------- Datos ---------- */
  /* Vuelve a pedir GET /api/estado (después de cada acción, o si otra pestaña cambió los datos). */
  const recargar = useCallback(async () => {
    try {
      const token = leerSesion()?.token ?? null;
      const nuevo = await cargarEstado();
      estadoRef.current = nuevo;
      setEstado(nuevo);
      setTokenDelEstado(token);
    } catch (error) {
      avisar(mensajeDe(error), 'error');
    }
  }, [avisar]);

  const ejecutar = useCallback(async <R,>(llamada: () => Promise<R>): Promise<Resultado<R>> => {
    try {
      const valor = await llamada();
      await recargar();
      return { ok: true, valor };
    } catch (error) {
      if (!(error instanceof ErrorApi)) console.error(error);
      // Si el stock o un estado cambió en el servidor, se traen los datos frescos para que la pantalla calce.
      if (error instanceof ErrorApi && error.status === 409) await recargar();
      return { ok: false, error: mensajeDe(error) };
    }
  }, [recargar]);

  const guardarCarrito = useCallback((items: ItemCarrito[]) => {
    if (!uid) return;
    persistirCarrito(uid, items);
    setCarrito(items);
  }, [uid]);

  /* ---------- Sesión ---------- */
  /* Guarda el token, trae los datos que ese usuario puede ver y recién ahí lo da por ingresado. */
  const abrirSesion = useCallback(async ({ token, usuario: u }: RespuestaIngreso) => {
    const s = guardarSesion(u.id, estadoRef.current.config.sesionMinutos, token);
    ultimaRenovacion.current = Date.now();
    await recargar();
    setAhora(Date.now());
    setSesion(s);
    return u;
  }, [recargar]);

  const ingresar = useCallback(async (email: string, clave: string) => {
    try {
      return { ok: true as const, usuario: await abrirSesion(await api.ingresar(email, clave)) };
    } catch (error) {
      return { ok: false as const, error: mensajeDe(error) };
    }
  }, [abrirSesion]);

  const registrar = useCallback(async (datos: DatosRegistro) => {
    try {
      return { ok: true as const, usuario: await abrirSesion(await api.registrar(datos)) };
    } catch (error) {
      return { ok: false as const, error: mensajeDe(error) };
    }
  }, [abrirSesion]);

  const cerrarSesion = useCallback((mensaje?: string) => {
    if (uid) api.salir().catch(() => undefined);
    borrarSesion();
    setSesion(null);
    avisar(mensaje ?? 'Cerraste sesión.', 'info');
    navigate('/');
    recargar();
  }, [avisar, navigate, recargar, uid]);

  const restablecerDemo = useCallback(async () => {
    const r = await ejecutar(() => api.restablecerDemo());
    if (!r.ok) avisar(r.error, 'error');
    return r.ok;
  }, [avisar, ejecutar]);

  /* Si el backend dice que el token ya no sirve (venció o bloquearon la cuenta), se cierra la sesión. */
  useEffect(() => {
    avisarNoAutorizado(() => {
      borrarSesion();
      setSesion(null);
      avisar('Tu sesión expiró. Vuelve a ingresar para continuar.', 'info');
    });
    return () => avisarNoAutorizado(null);
  }, [avisar]);

  /* Si la sesión venció por inactividad (o el usuario fue bloqueado), se cierra. */
  useEffect(() => {
    if (!sesion || usuario) return;
    // Datos pedidos con otro token (la sesión cambió en otra pestaña): se esperan los datos nuevos.
    if (sesion.expira > ahora && sesion.token !== tokenDelEstado) return;
    borrarSesion();
    setSesion(null);
    if (sesion.expira <= ahora) avisar('Tu sesión se cerró por inactividad. Vuelve a ingresar para continuar.', 'info');
    recargar();
  }, [sesion, usuario, ahora, tokenDelEstado, avisar, recargar]);

  useEffect(() => {
    const t = setInterval(() => setAhora(Date.now()), MS_REVISAR);
    return () => clearInterval(t);
  }, []);

  /* Cada clic o tecla renueva la sesión (como máximo cada 30 s). */
  const sesionRef = useRef(sesion);
  useEffect(() => { sesionRef.current = sesion; }, [sesion]);
  useEffect(() => {
    const renovar = () => {
      const s = sesionRef.current;
      if (!s || Date.now() - ultimaRenovacion.current < MS_RENOVAR) return;
      ultimaRenovacion.current = Date.now();
      setSesion(guardarSesion(s.uid, estadoRef.current.config.sesionMinutos, s.token));
    };
    document.addEventListener('click', renovar);
    document.addEventListener('keydown', renovar);
    return () => {
      document.removeEventListener('click', renovar);
      document.removeEventListener('keydown', renovar);
    };
  }, []);

  /* Si la sesión o el carrito cambian en otra pestaña del navegador, se actualizan aquí. */
  const uidRef = useRef(uid);
  useEffect(() => { uidRef.current = uid; }, [uid]);
  useEffect(() => {
    const alCambiar = (ev: StorageEvent) => {
      if (ev.key && !ev.key.startsWith('hm_')) return;
      setSesion(leerSesion());
      if (uidRef.current) setCarrito(leerCarrito(uidRef.current));
      if (ev.key === 'hm_sesion') recargar();
    };
    window.addEventListener('storage', alCambiar);
    return () => window.removeEventListener('storage', alCambiar);
  }, [recargar]);

  /* Al volver a esta pestaña se vuelven a pedir los datos (otra persona pudo comprar o cambiar algo). */
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible') recargar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [recargar]);

  const valor = useMemo<TiendaValor>(() => ({
    estado, usuario, carrito, ejecutar, guardarCarrito, ingresar, registrar, cerrarSesion, restablecerDemo,
  }), [estado, usuario, carrito, ejecutar, guardarCarrito, ingresar, registrar, cerrarSesion, restablecerDemo]);

  return <TiendaContext.Provider value={valor}>{children}</TiendaContext.Provider>;
}
