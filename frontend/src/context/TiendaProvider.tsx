/* =========================================================================
   Estado global de la tienda (Context API)
   -------------------------------------------------------------------------
   Guarda los datos, la sesión y el carrito, y los comparte con todas las
   páginas mediante el hook useTienda(). Cada cambio:
     1. se aplica sobre una copia ("borrador") con una función de logica/,
     2. React vuelve a dibujar con la copia (la pantalla responde al tiro),
     3. se envía a json-server solo lo que cambió (POST, PUT o DELETE).
   Si la API falla, se avisa y se vuelven a cargar los datos de db.json.
   La sesión y el carrito siguen en el navegador (localStorage).
   ========================================================================= */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { usuarioPorId } from '../logica/consultas';
import { registrarActividad } from '../logica/estado';
import { useNavigate } from 'react-router';
import { cambiosEntre, cargarEstado, enviarCambios, hayCambiosPendientes, restablecerDatosDemo } from '../services/datos';
import {
  borrarSesion, guardarCarrito as persistirCarrito, guardarSesion, leerCarrito, leerSesion, verificarCredenciales,
} from '../services/sesion';
import type { Estado, ItemCarrito, Sesion, Usuario } from '../types';
import { useAvisos } from '../hooks/useAvisos';
import { TiendaContext, type TiendaValor } from './tiendaContext';

const MS_RENOVAR = 30000;      // la sesión se renueva como máximo cada 30 s de actividad
const MS_REVISAR = 15000;      // cada 15 s se revisa si la sesión venció

export function TiendaProvider({ estadoInicial, children }: { estadoInicial: Estado; children: ReactNode }) {
  const { avisar } = useAvisos();
  const navigate = useNavigate();
  const [estado, setEstado] = useState<Estado>(estadoInicial);
  const [sesion, setSesion] = useState<Sesion | null>(leerSesion);
  const [ahora, setAhora] = useState(() => Date.now());
  const estadoRef = useRef(estado);
  const ultimaRenovacion = useRef(0);

  /* ---------- Usuario actual: sesión vigente y cuenta activa ---------- */
  const usuario = useMemo(() => {
    if (!sesion || sesion.expira <= ahora) return null;
    const u = usuarioPorId(estado, sesion.uid);
    return u && u.estado === 'activo' ? u : null;
  }, [estado, sesion, ahora]);
  const uid = usuario?.id ?? null;

  const [carrito, setCarrito] = useState<ItemCarrito[]>(() => (sesion ? leerCarrito(sesion.uid) : []));
  useEffect(() => {
    setCarrito(uid ? leerCarrito(uid) : []);
  }, [uid]);

  /* ---------- Cambios sobre los datos ---------- */
  /* Vuelve a leer db.json (si un cambio falló o si otra pestaña cambió los datos). */
  const recargar = useCallback(async () => {
    try {
      const nuevo = await cargarEstado();
      estadoRef.current = nuevo;
      setEstado(nuevo);
    } catch {
      avisar('No hay conexión con la API. ¿Está corriendo "npm run api"?', 'error');
    }
  }, [avisar]);

  const actualizar = useCallback(<R,>(cambio: (borrador: Estado) => R): R | null => {
    const base = estadoRef.current;
    const borrador = structuredClone(base);
    let resultado: R;
    try {
      resultado = cambio(borrador);
    } catch (error) {
      console.error(error);
      avisar('No pudimos completar la operación. Recarga la página e inténtalo de nuevo.', 'error');
      return null;
    }
    estadoRef.current = borrador;
    setEstado(borrador);
    enviarCambios(cambiosEntre(base, borrador)).catch((error) => {
      console.error(error);
      avisar('No pudimos guardar el cambio en el servidor. ¿Está corriendo "npm run api"? Volvimos a cargar los datos.', 'error');
      recargar();
    });
    return resultado;
  }, [avisar, recargar]);

  const guardarCarrito = useCallback((items: ItemCarrito[]) => {
    if (!uid) return;
    persistirCarrito(uid, items);
    setCarrito(items);
  }, [uid]);

  /* ---------- Sesión ---------- */
  const iniciarSesion = useCallback((u: Usuario) => {
    ultimaRenovacion.current = Date.now();
    setAhora(Date.now());
    setSesion(guardarSesion(u.id, estadoRef.current.config.sesionMinutos));
  }, []);

  const ingresar = useCallback((email: string, clave: string) => {
    const r = verificarCredenciales(estadoRef.current, email, clave);
    if (r.ok) {
      actualizar((e) => registrarActividad(e, 'Inicio de sesión', `Rol ${r.usuario.rol}`, r.usuario.id));
      iniciarSesion(r.usuario);
    } else if (!r.bloqueado) {
      actualizar((e) => registrarActividad(e, 'Inicio de sesión fallido', email.trim().toLowerCase(), r.usuario?.id));
    }
    return r;
  }, [actualizar, iniciarSesion]);

  const cerrarSesion = useCallback((mensaje?: string) => {
    if (uid) actualizar((e) => registrarActividad(e, 'Cierre de sesión', '', uid));
    borrarSesion();
    setSesion(null);
    avisar(mensaje ?? 'Cerraste sesión.', 'info');
    navigate('/');
  }, [actualizar, avisar, navigate, uid]);

  const restablecerDemo = useCallback(async () => {
    const s = leerSesion();
    try {
      const nuevo = await restablecerDatosDemo(estadoRef.current);
      estadoRef.current = nuevo;
      setEstado(nuevo);
    } catch (error) {
      console.error(error);
      avisar('La API no respondió y no se restablecieron los datos. ¿Está corriendo "npm run api"?', 'error');
      await recargar();
      return false;
    }
    if (s) setSesion(guardarSesion(s.uid, estadoRef.current.config.sesionMinutos));
    actualizar((e) => registrarActividad(e, 'Datos de demostración restablecidos', '', s?.uid));
    return true;
  }, [actualizar, avisar, recargar]);

  /* Si la sesión venció (o el usuario fue bloqueado), se cierra. */
  useEffect(() => {
    if (!sesion || usuario) return;
    borrarSesion();
    setSesion(null);
    if (sesion.expira <= ahora) avisar('Tu sesión se cerró por inactividad. Vuelve a ingresar para continuar.', 'info');
  }, [sesion, usuario, ahora, avisar]);

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
      setSesion(guardarSesion(s.uid, estadoRef.current.config.sesionMinutos));
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
    };
    window.addEventListener('storage', alCambiar);
    return () => window.removeEventListener('storage', alCambiar);
  }, []);

  /* Al volver a esta pestaña se releen los datos de db.json (otra pestaña u otro navegador pudo cambiarlos).
     Si hay cambios enviándose, se espera a la próxima vez para no pisarlos. */
  useEffect(() => {
    const alVolver = () => {
      if (document.visibilityState === 'visible' && !hayCambiosPendientes()) recargar();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => document.removeEventListener('visibilitychange', alVolver);
  }, [recargar]);

  const valor = useMemo<TiendaValor>(() => ({
    estado, usuario, carrito, actualizar, guardarCarrito, ingresar, iniciarSesion, cerrarSesion, restablecerDemo,
  }), [estado, usuario, carrito, actualizar, guardarCarrito, ingresar, iniciarSesion, cerrarSesion, restablecerDemo]);

  return <TiendaContext.Provider value={valor}>{children}</TiendaContext.Provider>;
}
