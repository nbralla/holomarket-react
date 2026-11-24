import { useState } from 'react';
import { EstadoChip } from '../../components/Chips';
import MarcoModal from '../../components/MarcoModal';
import Tabla from '../../components/Tabla';
import { Tiempo } from '../../components/TablaMovimientos';
import type { CerrarModal } from '../../context/modalContext';
import { cuentaTexto, detalleRetiro, ESTADOS_RETIRO, usuarioPorId } from '../../logica/consultas';
import { pagarRetiro, rechazarRetiro } from '../../logica/retiros';
import { useAvisos } from '../../hooks/useAvisos';
import { useModal } from '../../hooks/useModal';
import { useTienda } from '../../hooks/useTienda';
import type { Retiro, Usuario } from '../../types';
import { clp, plural, suma } from '../../utils/formato';

const MOTIVOS_RECHAZO = ['La cuenta no está a nombre del vendedor', 'La cuenta indicada no existe o está cerrada',
  'Revisión de seguridad pendiente', 'Otro motivo'];
const CODIGO = /^[A-Za-z0-9-]{4,30}$/;

function VentanaPago({ retiro, vendedor, cerrar }: { retiro: Retiro; vendedor?: Usuario; cerrar: CerrarModal<string> }) {
  const [comprobante, setComprobante] = useState('');
  const [error, setError] = useState('');
  const confirmar = () => {
    const v = comprobante.trim();
    if (v && !CODIGO.test(v)) {
      setError('Usa letras, números o guiones (4 a 30 caracteres).');
      document.getElementById('m-comprobante')?.focus();
      return;
    }
    cerrar(v.toUpperCase());
  };
  return (
    <MarcoModal titulo={`Transferir retiro ${retiro.id}`} confirmar="Marcar como transferido" alConfirmar={confirmar} alCancelar={() => cerrar(null)}>
      <p>
        Transfiere <strong>{clp(retiro.monto)}</strong> a {vendedor ? vendedor.nombre : 'el vendedor'}: {cuentaTexto(retiro.cuenta)}, RUT {retiro.cuenta.rut}.
        Después registra el comprobante.
      </p>
      <div className={`campo${error ? ' con-error' : ''}`}>
        <label htmlFor="m-comprobante">Número de comprobante <span className="campo__opcional">(opcional)</span></label>
        <input id="m-comprobante" name="comprobante" maxLength={30} autoComplete="off" placeholder="Ej.: TRF-883201" value={comprobante}
          aria-describedby="m-comprobante-error" aria-invalid={error ? true : undefined} onChange={(ev) => setComprobante(ev.target.value)} />
        <p className="campo__error" id="m-comprobante-error">{error}</p>
      </div>
    </MarcoModal>
  );
}

function VentanaRechazo({ retiro, vendedor, cerrar }: { retiro: Retiro; vendedor?: Usuario; cerrar: CerrarModal<string> }) {
  const [motivo, setMotivo] = useState(MOTIVOS_RECHAZO[0]);
  const [detalle, setDetalle] = useState('');
  const [error, setError] = useState('');
  const confirmar = () => {
    const d = detalle.trim();
    if (motivo === 'Otro motivo' && d.length < 5) {
      setError('Explica el motivo en al menos 5 caracteres.');
      document.getElementById('m-detalle-ret')?.focus();
      return;
    }
    cerrar(motivo === 'Otro motivo' ? d : `${motivo}${d ? `. ${d}` : ''}`);
  };
  return (
    <MarcoModal titulo={`Rechazar retiro ${retiro.id}`} confirmar="Rechazar retiro" peligro alConfirmar={confirmar} alCancelar={() => cerrar(null)}>
      <p>El monto de {clp(retiro.monto)} volverá al saldo de {vendedor ? vendedor.nombre : 'el vendedor'}, que verá el motivo.</p>
      <div className="campo">
        <label htmlFor="m-motivo-ret">Motivo</label>
        <select id="m-motivo-ret" name="motivo" value={motivo} onChange={(ev) => setMotivo(ev.target.value)}>
          {MOTIVOS_RECHAZO.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      </div>
      <div className={`campo${error ? ' con-error' : ''}`}>
        <label htmlFor="m-detalle-ret">Detalle para el vendedor <span className="campo__opcional">(obligatorio si eliges "Otro motivo")</span></label>
        <textarea id="m-detalle-ret" name="detalle" rows={2} maxLength={160} value={detalle} aria-describedby="m-detalle-ret-error"
          aria-invalid={error ? true : undefined} onChange={(ev) => setDetalle(ev.target.value)} />
        <p className="campo__error" id="m-detalle-ret-error">{error}</p>
      </div>
    </MarcoModal>
  );
}

/* Solicitudes de retiro de los vendedores: el administrador transfiere o rechaza. */
export default function AdminRetiros({ admin }: { admin: Usuario }) {
  const { estado, actualizar } = useTienda();
  const { avisar } = useAvisos();
  const modal = useModal();
  const [filtro, setFiltro] = useState('');

  const lista = estado.retiros.filter((r) => !filtro || r.estado === filtro)
    .sort((a, b) => (Number(b.estado === 'solicitado') - Number(a.estado === 'solicitado')) || b.fecha - a.fecha);
  const porPagar = estado.retiros.filter((r) => r.estado === 'solicitado');

  const pagar = async (r: Retiro) => {
    const v = usuarioPorId(estado, r.uid);
    const comprobante = await modal.abrir<string>((cerrar) => <VentanaPago retiro={r} vendedor={v} cerrar={cerrar} />);
    if (comprobante === null) return;
    const res = actualizar((e) => pagarRetiro(e, admin, r.id, comprobante));
    if (!res) return;
    if (!res.ok) avisar(res.error, 'error');
    else avisar(`Marcaste el retiro ${r.id} como transferido.`, 'exito');
  };

  const rechazar = async (r: Retiro) => {
    const v = usuarioPorId(estado, r.uid);
    const motivo = await modal.abrir<string>((cerrar) => <VentanaRechazo retiro={r} vendedor={v} cerrar={cerrar} />);
    if (motivo === null) return;
    const res = actualizar((e) => rechazarRetiro(e, admin, r.id, motivo));
    if (!res) return;
    if (!res.ok) avisar(res.error, 'error');
    else avisar(`Rechazaste el retiro ${r.id}. El monto volvió al saldo del vendedor.`, 'exito');
  };

  const filas = lista.map((r) => {
    const v = usuarioPorId(estado, r.uid);
    return {
      clave: r.id,
      celdas: [
        <><strong>{r.id}</strong><span className="celda-sub"><Tiempo t={r.fecha} /></span></>,
        <>{v ? v.nombre : 'Usuario eliminado'}<span className="celda-sub">{v ? v.email : ''}</span></>,
        <>{cuentaTexto(r.cuenta)}<span className="celda-sub">{r.cuenta.titular}, RUT {r.cuenta.rut}</span></>,
        <strong>{clp(r.monto)}</strong>,
        <EstadoChip clave={`ret-${r.estado}`} texto={ESTADOS_RETIRO[r.estado]} />,
        detalleRetiro(r),
        r.estado === 'solicitado' ? (
          <div className="acciones">
            <button type="button" className="btn btn--chico btn--primario" data-accion="pagar-retiro" data-id={r.id}
              aria-label={`Marcar como transferido el retiro ${r.id}`} onClick={() => pagar(r)}>Marcar transferido</button>
            <button type="button" className="btn btn--chico btn--texto-peligro" data-accion="rechazar-retiro" data-id={r.id}
              aria-label={`Rechazar el retiro ${r.id}`} onClick={() => rechazar(r)}>Rechazar</button>
          </div>
        ) : <span className="nota">Sin acciones</span>,
      ],
    };
  });

  return (
    <>
      <div className="barra-herramientas">
        <div className="campo">
          <label htmlFor="adm-ret-estado">Estado</label>
          <select id="adm-ret-estado" name="retEstado" value={filtro} onChange={(ev) => setFiltro(ev.target.value)}>
            <option value="">Todos</option>
            {Object.entries(ESTADOS_RETIRO).map(([id, t]) => <option key={id} value={id}>{t}</option>)}
          </select>
        </div>
      </div>
      <p className="bajada">Transfiere cada solicitud desde la cuenta de la empresa y márcala como transferida con su comprobante. Si la rechazas, el monto vuelve al saldo del vendedor.</p>
      <div id="adm-resultados">
        <p className="nota">{lista.length} {plural(lista.length, 'solicitud', 'solicitudes')}. Por transferir: {clp(suma(porPagar, (r) => r.monto))}.</p>
        <Tabla columnas={[{ t: 'Solicitud' }, { t: 'Vendedor' }, { t: 'Cuenta' }, { t: 'Monto', num: true }, { t: 'Estado' }, { t: 'Detalle' }, { t: 'Acciones' }]}
          filas={filas} vacio="No hay solicitudes de retiro con ese estado." leyenda="Solicitudes de retiro" />
      </div>
    </>
  );
}
