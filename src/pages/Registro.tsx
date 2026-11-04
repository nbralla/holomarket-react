import { useState, type ChangeEvent, type FormEvent } from 'react';
import Campo from '../components/Campo';
import { REGIONES, comunasDe } from '../data/catalogo';
import { emailRegistrado, registrarUsuario, rutRegistrado } from '../logica/usuarios';
import { useAvisos } from '../hooks/useAvisos';
import { useFormulario } from '../hooks/useFormulario';
import { useLegal } from '../hooks/useLegal';
import { useTienda } from '../hooks/useTienda';
import { tomarDestino } from '../utils/navegacion';
import { useNavegar } from '../hooks/useRuta';
import { claveError, emailValido, formatearRut, fuerzaClave, nombreValido, rutValido, telefonoValido } from '../utils/validaciones';
import { Link } from 'react-router';

type Valores = {
  rut: string;
  nombre: string;
  email: string;
  telefono: string;
  region: string;
  comuna: string;
  clave: string;
  clave2: string;
  terminos: boolean;
};

const INICIALES: Valores = { rut: '', nombre: '', email: '', telefono: '', region: '', comuna: '', clave: '', clave2: '', terminos: false };
const TEXTO_FUERZA = ['Usa entre 8 y 20 caracteres, con letras y números.', 'Seguridad: débil', 'Seguridad: media', 'Seguridad: fuerte'];

export default function Registro() {
  const { estado, actualizar, iniciarSesion } = useTienda();
  const { navegar } = useNavegar();
  const { avisar } = useAvisos();
  const verLegal = useLegal();
  const [verClave, setVerClave] = useState(false);

  const f = useFormulario<Valores>('reg-', INICIALES, (v) => ({
    rut: !v.rut.trim() ? 'Ingresa tu RUT.'
      : !rutValido(v.rut) ? 'El RUT no es válido. Revisa el número y el dígito verificador.'
        : rutRegistrado(estado, v.rut) ? 'Ya existe una cuenta con este RUT.' : '',
    nombre: nombreValido(v.nombre) ? '' : 'Escribe tu nombre y apellido, solo con letras (3 a 60 caracteres).',
    email: !v.email.trim() ? 'Ingresa tu correo.'
      : !emailValido(v.email) ? 'Revisa el formato del correo, por ejemplo nombre@dominio.cl.'
        : emailRegistrado(estado, v.email) ? 'Ya existe una cuenta con este correo. Si es tuyo, ingresa con él.' : '',
    telefono: !v.telefono.trim() || telefonoValido(v.telefono) ? '' : 'Usa un número chileno, por ejemplo +56 9 1234 5678.',
    region: v.region ? '' : 'Elige tu región.',
    comuna: v.comuna ? '' : 'Elige tu comuna.',
    clave: claveError(v.clave),
    clave2: !v.clave2 ? 'Repite tu contraseña.' : v.clave2 === v.clave ? '' : 'Las contraseñas no coinciden.',
    terminos: v.terminos ? '' : 'Para crear tu cuenta debes aceptar los términos y la política de privacidad.',
  }));
  const v = f.valores;
  const nivel = fuerzaClave(v.clave);

  // Al salir del campo RUT se le da formato: 21456789k -> 21.456.789-K
  const salirDelRut = () => {
    if (rutValido(v.rut)) f.cambiar('rut', formatearRut(v.rut));
    f.tocar('rut');
  };

  const enviar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    if (rutValido(v.rut)) f.cambiar('rut', formatearRut(v.rut));
    if (!f.validarTodo()) return;
    const r = actualizar((e) => registrarUsuario(e, {
      rut: v.rut, nombre: v.nombre, email: v.email, telefono: v.telefono, region: v.region, comuna: v.comuna, clave: v.clave,
    }));
    if (!r) return;
    if (!r.ok) {
      avisar(r.error, 'error');
      return;
    }
    iniciarSesion(r.valor);
    avisar(`Tu cuenta quedó creada. Te damos la bienvenida, ${r.valor.nombre.split(' ')[0]}.`, 'exito');
    navegar(tomarDestino('/catalogo'));
  };

  return (
    <section className="vista contenedor" id="vista-registro" data-vista="registro" aria-labelledby="registro-titulo">
      <div className="registro">
        <h1 className="titulo-vista" id="registro-titulo">Crear cuenta</h1>
        <p className="bajada">Con una sola cuenta compras y vendes. ¿Ya tienes una? <Link to="/ingresar">Ingresa aquí</Link>.</p>
        <form className="formulario bloque" id="form-registro" noValidate onSubmit={enviar}>
          <div className="rejilla-campos row row-cols-1 row-cols-sm-2 g-3">
            <Campo id="reg-rut" etiqueta="RUT" error={f.errores.rut} ayuda="Con dígito verificador. Para probar: 21.456.789-K">
              <input {...f.campo('rut', { ayuda: true })} autoComplete="off" maxLength={12} placeholder="12.345.678-5" onBlur={salirDelRut} />
            </Campo>
            <Campo id="reg-nombre" etiqueta="Nombre y apellido" error={f.errores.nombre}>
              <input {...f.campo('nombre')} autoComplete="name" maxLength={60} />
            </Campo>
            <Campo id="reg-email" etiqueta="Correo" error={f.errores.email}>
              <input {...f.campo('email')} type="email" autoComplete="email" maxLength={80} />
            </Campo>
            <Campo id="reg-telefono" etiqueta="Teléfono" opcional error={f.errores.telefono}>
              <input {...f.campo('telefono')} type="tel" autoComplete="tel" maxLength={16} placeholder="+56 9 1234 5678" />
            </Campo>
            <Campo id="reg-region" etiqueta="Región" error={f.errores.region}>
              <select {...f.campo('region')} autoComplete="address-level1"
                onChange={(ev: ChangeEvent<HTMLSelectElement>) => { f.cambiar('region', ev.target.value, true); f.cambiar('comuna', ''); }}>
                <option value="">Elige una región</option>
                {REGIONES.map((r) => <option key={r.nombre} value={r.nombre}>{r.nombre}</option>)}
              </select>
            </Campo>
            <Campo id="reg-comuna" etiqueta="Comuna" error={f.errores.comuna}>
              <select {...f.campo('comuna', { validarAlCambiar: true })} autoComplete="address-level2" disabled={!v.region}>
                <option value="">{v.region ? 'Elige una comuna' : 'Primero elige una región'}</option>
                {comunasDe(v.region).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Campo>
            <div className={`campo${f.errores.clave ? ' con-error' : ''}`}>
              <label htmlFor="reg-clave">Contraseña</label>
              <div className="con-boton">
                <input {...f.campo('clave')} type={verClave ? 'text' : 'password'} autoComplete="new-password" maxLength={20}
                  aria-describedby="reg-fuerza-texto reg-clave-error" />
                <button type="button" className="ver-clave" aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVerClave((x) => !x)}>
                  {verClave ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
              <div className="fuerza" id="reg-fuerza" data-nivel={nivel} aria-hidden="true"><span /><span /><span /></div>
              <p className="campo__ayuda" id="reg-fuerza-texto">{TEXTO_FUERZA[nivel]}</p>
              <p className="campo__error" id="reg-clave-error">{f.errores.clave}</p>
            </div>
            <Campo id="reg-clave2" etiqueta="Repite la contraseña" error={f.errores.clave2}>
              <input {...f.campo('clave2')} type="password" autoComplete="new-password" maxLength={20} />
            </Campo>
          </div>
          <div className={`campo${f.errores.terminos ? ' con-error' : ''}`}>
            <label className="casilla casilla--legal">
              <input type="checkbox" id="reg-terminos" name="terminos" checked={v.terminos} aria-describedby="reg-terminos-error"
                aria-invalid={f.errores.terminos ? true : undefined} onChange={(ev) => f.cambiar('terminos', ev.target.checked, true)} />
              <span>
                Acepto los <a href="#" data-accion="ver-terminos" onClick={verLegal('terminos')}>términos y condiciones</a> y
                la <a href="#" data-accion="ver-privacidad" onClick={verLegal('privacidad')}>política de privacidad</a>, y autorizo el tratamiento de mis datos para operar mi cuenta.
              </span>
            </label>
            <p className="campo__error" id="reg-terminos-error">{f.errores.terminos}</p>
          </div>
          <button type="submit" className="btn btn--primario btn--grande">Crear cuenta</button>
        </form>
      </div>
    </section>
  );
}
