/* =========================================================================
   Hook personalizado para formularios con validación en pantalla
   -------------------------------------------------------------------------
   - Guarda los valores de los campos y sus mensajes de error.
   - Valida un campo al salir de él (blur) y, si ya mostraba un error,
     mientras se corrige.
   - validarTodo() muestra todos los errores y deja el foco en el primero.
   Los ids de los campos son prefijo + nombre (ej.: "reg-" + "rut" = "reg-rut"),
   y el texto del error va en un <p id="reg-rut-error"> que leen los lectores
   de pantalla gracias a aria-describedby.
   ========================================================================= */
import { useCallback, useRef, useState, type ChangeEvent } from 'react';

type Valores = Record<string, string | boolean>;
type Errores<V> = Partial<Record<keyof V & string, string>>;
type Elemento = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

export function enfocarCampo(id: string): void {
  const el = document.getElementById(id);
  const foco = el instanceof HTMLFieldSetElement ? el.querySelector<HTMLElement>('input') : el;
  if (foco && !(foco as HTMLInputElement).disabled) foco.focus();
}

export function useFormulario<V extends Valores>(prefijo: string, inicial: V | (() => V), reglas: (v: V) => Errores<V>) {
  const [valores, setValores] = useState<V>(inicial);
  const [errores, setErrores] = useState<Errores<V>>({});
  const valoresRef = useRef(valores);
  valoresRef.current = valores;
  const reglasRef = useRef(reglas);
  reglasRef.current = reglas;
  const erroresRef = useRef(errores);
  erroresRef.current = errores;

  const mostrar = useCallback((campo: keyof V & string, mensaje: string) => {
    setErrores((prev) => (prev[campo] === mensaje ? prev : { ...prev, [campo]: mensaje }));
  }, []);

  const revisar = useCallback((campo: keyof V & string, v: V) => mostrar(campo, reglasRef.current(v)[campo] ?? ''), [mostrar]);

  /* validarAhora = true para selects, casillas y opciones (se validan apenas cambian). */
  const cambiar = useCallback(<K extends keyof V & string>(campo: K, valor: V[K], validarAhora = false) => {
    const nuevos = { ...valoresRef.current, [campo]: valor };
    valoresRef.current = nuevos;
    setValores(nuevos);
    if (validarAhora || erroresRef.current[campo]) revisar(campo, nuevos);
  }, [revisar]);

  const tocar = useCallback((campo: keyof V & string) => {
    const v = valoresRef.current;
    const valor = v[campo];
    if ((typeof valor === 'string' && valor.trim() !== '') || erroresRef.current[campo]) revisar(campo, v);
  }, [revisar]);

  /* Valida los campos indicados (o todos los que tienen regla). Devuelve true si no hay errores. */
  const validarTodo = useCallback((campos?: (keyof V & string)[]) => {
    const todos = reglasRef.current(valoresRef.current);
    const lista = campos ?? (Object.keys(todos) as (keyof V & string)[]);
    const nuevos: Errores<V> = {};
    let primero = '';
    for (const c of lista) {
      const m = todos[c] ?? '';
      nuevos[c] = m;
      if (m && !primero) primero = c;
    }
    setErrores((prev) => ({ ...prev, ...nuevos }));
    if (primero) enfocarCampo(`${prefijo}${primero}`);
    return !primero;
  }, [prefijo]);

  const reiniciar = useCallback((nuevos: V) => {
    valoresRef.current = nuevos;
    setValores(nuevos);
    setErrores({});
  }, []);

  /* Propiedades listas para un <input>, <select> o <textarea> de texto. */
  const campo = (nombre: keyof V & string, opciones: { ayuda?: boolean; validarAlCambiar?: boolean } = {}) => ({
    id: `${prefijo}${nombre}`,
    name: nombre,
    value: String(valores[nombre] ?? ''),
    onChange: (ev: ChangeEvent<Elemento>) => cambiar(nombre, ev.target.value as V[typeof nombre], opciones.validarAlCambiar),
    onBlur: () => tocar(nombre),
    'aria-invalid': errores[nombre] ? true : undefined,
    'aria-describedby': `${opciones.ayuda ? `${prefijo}${nombre}-ayuda ` : ''}${prefijo}${nombre}-error`,
  });

  return { valores, errores, cambiar, tocar, mostrar, validarTodo, reiniciar, campo };
}
