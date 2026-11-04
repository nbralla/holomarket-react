import { useRef, useState, type FormEvent } from 'react';
import Campo from '../components/Campo';
import { useAvisos } from '../hooks/useAvisos';
import { useTienda } from '../hooks/useTienda';
import { tomarDestino } from '../utils/navegacion';
import { useNavegar } from '../hooks/useRuta';
import { emailValido } from '../utils/validaciones';

import { Link } from 'react-router';
export default function Ingresar() {
  const { ingresar } = useTienda();
  const { navegar } = useNavegar();
  const { avisar } = useAvisos();
  const [email, setEmail] = useState('');
  const [clave, setClave] = useState('');
  const [verClave, setVerClave] = useState(false);
  const [errores, setErrores] = useState<{ email?: string; clave?: string }>({});
  const [error, setError] = useState('');
  const campoClave = useRef<HTMLInputElement>(null);

  const entrar = (correo: string, contrasena: string) => {
    setError('');
    const nuevos = {
      email: !correo.trim() ? 'Ingresa tu correo.' : emailValido(correo) ? '' : 'Revisa el formato del correo, por ejemplo nombre@dominio.cl.',
      clave: contrasena ? '' : 'Ingresa tu contraseña.',
    };
    setErrores(nuevos);
    if (nuevos.email || nuevos.clave) {
      document.getElementById(nuevos.email ? 'login-email' : 'login-clave')?.focus();
      return;
    }
    const r = ingresar(correo, contrasena);
    if (!r.ok) {
      setError(r.error);
      setClave('');
      campoClave.current?.focus();
      return;
    }
    avisar(r.usuario.rol === 'admin' ? 'Ingresaste como administrador.' : `Hola, ${r.usuario.nombre.split(' ')[0]}. Ya puedes comprar y vender.`, 'exito');
    navegar(tomarDestino(r.usuario.rol === 'admin' ? '/admin' : '/catalogo'));
  };

  const enviar = (ev: FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    entrar(email, clave);
  };

  return (
    <section className="vista contenedor" id="vista-ingresar" data-vista="ingresar" aria-labelledby="ingresar-titulo">
      <div className="acceso">
        <div className="acceso__formulario">
          <h1 className="titulo-vista" id="ingresar-titulo">Ingresar</h1>
          <p className="bajada">¿No tienes cuenta? <Link to="/registro">Crea una en un minuto</Link>.</p>
          <form className="formulario" id="form-login" noValidate onSubmit={enviar}>
            {error && <p className="alerta alerta--error" id="login-error" role="alert">{error}</p>}
            <Campo id="login-email" etiqueta="Correo" error={errores.email}>
              <input id="login-email" name="email" type="email" autoComplete="username" maxLength={80} value={email}
                aria-describedby="login-email-error" aria-invalid={errores.email ? true : undefined} onChange={(ev) => setEmail(ev.target.value)} />
            </Campo>
            <Campo id="login-clave" etiqueta="Contraseña" error={errores.clave}>
              <div className="con-boton">
                <input id="login-clave" ref={campoClave} name="clave" type={verClave ? 'text' : 'password'} autoComplete="current-password" maxLength={40}
                  value={clave} aria-describedby="login-clave-error" aria-invalid={errores.clave ? true : undefined} onChange={(ev) => setClave(ev.target.value)} />
                <button type="button" className="ver-clave" aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'} onClick={() => setVerClave((x) => !x)}>
                  {verClave ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </Campo>
            <button type="submit" className="btn btn--primario btn--grande btn--bloque">Ingresar</button>
          </form>
        </div>

      </div>
    </section>
  );
}
