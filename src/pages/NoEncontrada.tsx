import { Link } from 'react-router';

export default function NoEncontrada() {
  return (
    <section className="vista contenedor" id="vista-no-encontrada" data-vista="no-encontrada">
      <div className="vacio vacio--grande">
        <h1 className="titulo-vista">No encontramos esta página</h1>
        <p>Puede que el enlace esté incompleto. Vuelve al catálogo para seguir buscando cartas.</p>
        <Link className="btn btn--primario" to="/catalogo">Ir al catálogo</Link>
      </div>
    </section>
  );
}
