import { useState, type FormEvent } from 'react';
import Campo from '../../components/Campo';
import { CAMPOS_CONFIGURACION, CONFIGURACION_INICIAL } from '../../data/catalogo';
import { PUBLICACIONES_DEMO } from '../../data/demo';
import { pubPorId } from '../../logica/consultas';
import { registrarActividad } from '../../logica/estado';
import { guardarConfiguracion } from '../../logica/usuarios';
import {
  buscarImagen, consultaDe, DIAS_CACHE, IMAGENES_ACTIVAS, imagenesGuardadas, reiniciarImagenes, ultimoError,
} from '../../services/apiTcg';
import { useAvisos } from '../../hooks/useAvisos';
import { enfocarCampo } from '../../hooks/useFormulario';
import { useModal } from '../../hooks/useModal';
import { useTienda } from '../../hooks/useTienda';
import type { Configuracion, Usuario } from '../../types';
import { plural } from '../../utils/formato';
import { entero } from '../../utils/validaciones';

type Prueba = { tipo: 'cargando' } | { tipo: 'ok'; url: string; nombre: string } | { tipo: 'error'; mensaje: string } | { tipo: 'vacio'; nombre: string } | null;

/* Estado de la API de imágenes, con un botón para probar la conexión. */
function PanelImagenes({ admin }: { admin: Usuario }) {
  const { estado, actualizar } = useTienda();
  const { avisar } = useAvisos();
  const [prueba, setPrueba] = useState<Prueba>(null);
  const [, setVersion] = useState(0);
  const guardadas = imagenesGuardadas();
  const error = ultimoError();

  const probar = async () => {
    const carta = pubPorId(estado, 'P001') ?? PUBLICACIONES_DEMO[0];
    const c = consultaDe(carta);
    setPrueba({ tipo: 'cargando' });
    const r = await buscarImagen(c, true);
    if (r.url) setPrueba({ tipo: 'ok', url: r.url, nombre: c.nombreBase });
    else if (r.error) setPrueba({ tipo: 'error', mensaje: r.error });
    else setPrueba({ tipo: 'vacio', nombre: c.nombreBase });
    setVersion((v) => v + 1);
  };

  const volverAPedir = () => {
    reiniciarImagenes();
    actualizar((e) => registrarActividad(e, 'Caché de imágenes borrada', 'Se volverán a pedir las imágenes a la API', admin.id));
    avisar('Borramos las imágenes guardadas. Se volverán a pedir a la API al abrir el catálogo.', 'exito', { href: '/catalogo', texto: 'Ir al catálogo' });
    setPrueba(null);
    setVersion((v) => v + 1);
  };

  return (
    <section className="bloque" aria-labelledby="adm-imagenes">
      <h2 id="adm-imagenes" className="titulo-chico">Imágenes de cartas (API TCG)</h2>
      <dl className="datos datos--compacto">
        <dt>Estado</dt>
        <dd>
          {IMAGENES_ACTIVAS
            ? 'Activa a través del servidor de desarrollo de Vite: la clave se queda en .env.local y el navegador no la ve.'
            : 'Desactivada: falta APITCG_KEY en .env.local o el sitio no se está ejecutando con npm run dev. Mientras tanto se muestran las cartas dibujadas.'}
        </dd>
        <dt>En caché</dt>
        <dd>{guardadas} {plural(guardadas, 'imagen guardada', 'imágenes guardadas')} en este navegador ({DIAS_CACHE} días)</dd>
        {error && <><dt>Último error</dt><dd className="texto-peligro">{error}</dd></>}
      </dl>
      <div className="acciones-fila acciones-fila--compacta">
        <button type="button" className="btn btn--suave" data-accion="probar-imagenes" disabled={!IMAGENES_ACTIVAS || prueba?.tipo === 'cargando'} onClick={probar}>Probar conexión</button>
        <button type="button" className="btn btn--fantasma" data-accion="recargar-imagenes" disabled={!IMAGENES_ACTIVAS} onClick={volverAPedir}>Volver a pedir las imágenes</button>
      </div>
      <div id="adm-prueba-imagenes" className="prueba-imagenes" role="status">
        {prueba?.tipo === 'cargando' && <p className="nota">Consultando la API con “Charizard ex”…</p>}
        {prueba?.tipo === 'ok' && (
          <div className="alerta alerta--exito prueba-imagenes__ok">
            <img src={prueba.url} alt={`Imagen de ${prueba.nombre} entregada por la API`} referrerPolicy="no-referrer" />
            <p><strong>La conexión funciona.</strong> La API entregó la imagen de {prueba.nombre}. Pulsa “Volver a pedir las imágenes” y abre el catálogo.</p>
          </div>
        )}
        {prueba?.tipo === 'error' && <p className="alerta alerta--error"><strong>No funcionó:</strong> {prueba.mensaje}</p>}
        {prueba?.tipo === 'vacio' && <p className="alerta alerta--aviso">La API respondió, pero no encontró imagen para {prueba.nombre}.</p>}
      </div>
    </section>
  );
}

/* Parámetros del negocio, imágenes y restablecimiento de los datos de prueba. */
export default function AdminConfiguracion({ admin }: { admin: Usuario }) {
  const { estado, actualizar, restablecerDemo } = useTienda();
  const { avisar } = useAvisos();
  const modal = useModal();
  const [valores, setValores] = useState<Record<string, string>>(() =>
    Object.fromEntries(CAMPOS_CONFIGURACION.map(([id]) => [id, String(estado.config[id])])));
  const [errores, setErrores] = useState<Record<string, string>>({});

  const error = (id: string, valor: string): string => {
    const def = CAMPOS_CONFIGURACION.find(([c]) => c === id);
    if (!def) return '';
    const [, , min, max] = def;
    const n = entero(valor);
    return Number.isNaN(n) || n < min || n > max ? `Ingresa un número entero entre ${min} y ${max}.` : '';
  };

  const guardar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const nuevos = Object.fromEntries(CAMPOS_CONFIGURACION.map(([id]) => [id, error(id, valores[id])]));
    setErrores(nuevos);
    const primero = CAMPOS_CONFIGURACION.find(([id]) => nuevos[id]);
    if (primero) {
      enfocarCampo(`cfg-${primero[0]}`);
      return;
    }
    const config = { ...estado.config } as Configuracion;
    CAMPOS_CONFIGURACION.forEach(([id]) => { config[id] = entero(valores[id]); });
    const cambios = actualizar((e) => guardarConfiguracion(e, admin, config));
    if (!cambios) return;
    if (!cambios.length) avisar('No hay cambios que guardar.', 'info');
    else avisar(`Guardaste la configuración (${cambios.join('; ')}). Se aplica a las compras nuevas.`, 'exito');
  };

  const restablecer = async () => {
    const ok = await modal.confirmar({
      titulo: 'Restablecer datos de demostración',
      mensaje: 'Se borrarán las cuentas registradas, las publicaciones y pedidos nuevos, los carritos y todo el historial. No se puede deshacer.',
      confirmar: 'Restablecer datos',
      peligro: true,
    });
    if (!ok) return;
    if (!(await restablecerDemo())) return;
    setValores(Object.fromEntries(CAMPOS_CONFIGURACION.map(([id]) => [id, String(CONFIGURACION_INICIAL[id])])));
    setErrores({});
    avisar('Restablecimos los datos de demostración en db.json.', 'exito');
  };

  return (
    <>
      <form id="form-config" className="bloque formulario" noValidate onSubmit={guardar}>
        <h2 className="titulo-chico">Parámetros del negocio</h2>
        <p className="nota">Los cambios se aplican a las compras nuevas. Los pedidos existentes conservan sus valores.</p>
        <div className="rejilla-campos row row-cols-1 row-cols-sm-2 g-3">
          {CAMPOS_CONFIGURACION.map(([id, etiqueta, min, max, ayuda]) => (
            <Campo key={id} id={`cfg-${id}`} etiqueta={etiqueta} ayuda={ayuda} error={errores[id]}>
              <input id={`cfg-${id}`} name={id} type="number" inputMode="numeric" min={min} max={max} step={1} value={valores[id]}
                aria-describedby={`cfg-${id}-ayuda cfg-${id}-error`} aria-invalid={errores[id] ? true : undefined}
                onChange={(ev) => {
                  const v = ev.target.value;
                  setValores((x) => ({ ...x, [id]: v }));
                  if (errores[id]) setErrores((x) => ({ ...x, [id]: error(id, v) }));
                }} />
            </Campo>
          ))}
        </div>
        <div><button type="submit" className="btn btn--primario">Guardar configuración</button></div>
      </form>
      <PanelImagenes admin={admin} />
      <section className="bloque zona-peligro" aria-labelledby="adm-demo">
        <h2 id="adm-demo" className="titulo-chico">Datos de demostración</h2>
        <p className="bajada">
          Vuelve a cargar los usuarios, publicaciones y pedidos de ejemplo. Se borran las cuentas registradas, las publicaciones y pedidos nuevos,
          los carritos y el historial. Úsalo antes de presentar el proyecto.
        </p>
        <button type="button" className="btn btn--peligro" data-accion="restablecer-demo" onClick={restablecer}>Restablecer datos de demostración</button>
      </section>
    </>
  );
}
