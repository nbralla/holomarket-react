package cl.duoc.holomarket.service;

import cl.duoc.holomarket.dto.EstadoDtos.PublicacionDto;
import cl.duoc.holomarket.dto.SolicitudDtos.AjusteStockRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.PublicacionRequest;
import cl.duoc.holomarket.entity.Publicacion;
import cl.duoc.holomarket.entity.Usuario;
import cl.duoc.holomarket.exception.ApiException;
import cl.duoc.holomarket.repository.PublicacionRepository;
import cl.duoc.holomarket.repository.UsuarioRepository;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.service.AuditoriaService.Tipo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

import static cl.duoc.holomarket.service.Formato.clp;
import static cl.duoc.holomarket.service.Formato.plural;

/** Publicar, editar y administrar el inventario. Equivale a logica/publicaciones.ts del front. */
@Service
@RequiredArgsConstructor
@Transactional
public class PublicacionService {

    private final PublicacionRepository publicacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoria;

    public PublicacionDto crear(AuthUser me, PublicacionRequest req) {
        if (me.esAdmin()) throw ApiException.forbidden("La cuenta de administración no publica cartas.");
        if (req.stock() < 1) throw ApiException.badRequest("El stock mínimo es 1.");
        validarOferta(req);
        Usuario vendedor = usuarioRepository.findById(me.id())
                .orElseThrow(() -> ApiException.unauthorized("Tu sesión cambió. Vuelve a ingresar."));
        long ahora = System.currentTimeMillis();
        Publicacion p = new Publicacion();
        p.setId(auditoria.siguienteId(Tipo.PUBLICACION));
        p.setVendedor(vendedor);
        copiarDatos(p, req);
        p.setStock(req.stock());
        p.setEstado(Publicacion.ACTIVA);
        p.setImagen(vacioANull(req.imagen()));
        p.setImagenApi(vacioANull(req.imagenApi()));
        p.setCreado(ahora);
        p.setActualizado(ahora);
        publicacionRepository.save(p);
        auditoria.movimiento(p, "alta", p.getStock(), 0, p.getStock(), "Publicación nueva", me.id());
        auditoria.actividad("Publicación creada",
                p.getNombre() + " (" + p.getId() + "), " + p.getStock() + " u. a " + clp(p.getPrecio()), me.id());
        return PublicacionDto.de(p);
    }

    public PublicacionDto editar(AuthUser me, String id, PublicacionRequest req) {
        Publicacion p = propia(me, id, "No encontramos la publicación que editabas.");
        validarOferta(req);
        int precioAntes = p.getPrecio();
        copiarDatos(p, req);
        if (req.cambiaImagen()) p.setImagen(vacioANull(req.imagen()));
        if (req.cambiaImagenApi()) p.setImagenApi(vacioANull(req.imagenApi()));
        p.setActualizado(System.currentTimeMillis());
        if (!req.stock().equals(p.getStock())) {
            auditoria.cambiarStock(p, req.stock(), "edicion", "Edición de la publicación", me.id());
        }
        auditoria.actividad("Publicación editada", p.getNombre() + " (" + p.getId() + ")"
                + (precioAntes != p.getPrecio() ? ", precio " + clp(precioAntes) + " → " + clp(p.getPrecio()) : ""), me.id());
        return PublicacionDto.de(p);
    }

    /** Ajuste manual de stock (botones + y −, o ventana "Ajustar" del inventario). */
    public PublicacionDto ajustarStock(AuthUser me, String id, AjusteStockRequest req) {
        Publicacion p = propia(me, id, "Solo puedes ajustar el stock de tus publicaciones.");
        int cantidad = req.cantidad();
        boolean entrada = "entrada".equals(req.tipo());
        if (!entrada && cantidad > p.getStock()) {
            throw ApiException.badRequest("No puedes restar más de " + p.getStock() + " "
                    + plural(p.getStock(), "unidad", "unidades") + ".");
        }
        if (entrada && p.getStock() + cantidad > Publicacion.STOCK_MAXIMO) {
            throw ApiException.badRequest("El stock máximo por publicación es 999 unidades.");
        }
        String motivo = req.motivo() == null || req.motivo().isBlank() ? "Ajuste manual" : req.motivo().trim();
        int antes = auditoria.cambiarStock(p, entrada ? p.getStock() + cantidad : p.getStock() - cantidad, req.tipo(), motivo, me.id());
        auditoria.actividad("Ajuste de stock", p.getNombre() + " (" + p.getId() + "): " + antes + " → " + p.getStock() + ", " + motivo, me.id());
        return PublicacionDto.de(p);
    }

    public PublicacionDto cambiarPrecio(AuthUser me, String id, int precio) {
        Publicacion p = propia(me, id, "Solo puedes cambiar el precio de tus publicaciones.");
        int antes = p.getPrecio();
        p.setPrecio(precio);
        // Si el nuevo precio ya no es menor que el anterior, la oferta deja de tener sentido.
        if (p.getPrecioAnterior() != null && p.getPrecioAnterior() <= precio) p.setPrecioAnterior(null);
        p.setActualizado(System.currentTimeMillis());
        auditoria.actividad("Cambio de precio", p.getNombre() + " (" + p.getId() + "): " + clp(antes) + " → " + clp(precio), me.id());
        return PublicacionDto.de(p);
    }

    /** El dueño pausa o activa su publicación; el administrador puede hacerlo como moderación. */
    public PublicacionDto cambiarEstado(AuthUser me, String id, String nuevo) {
        if (!Publicacion.ACTIVA.equals(nuevo) && !Publicacion.PAUSADA.equals(nuevo)) {
            throw ApiException.badRequest("Estado no válido.");
        }
        Publicacion p = me.esAdmin() ? buscar(id) : propia(me, id, "No se pudo cambiar el estado de la publicación.");
        if (p.eliminada() || nuevo.equals(p.getEstado())) throw ApiException.conflict("No se pudo cambiar el estado de la publicación.");
        p.setEstado(nuevo);
        p.setActualizado(System.currentTimeMillis());
        auditoria.actividad(Publicacion.PAUSADA.equals(nuevo) ? "Publicación pausada" : "Publicación activada",
                p.getNombre() + " (" + p.getId() + ")" + (me.esAdmin() ? ", por moderación" : ""), me.id());
        return PublicacionDto.de(p);
    }

    /** Baja lógica: la publicación queda "eliminada" con stock 0 (los pedidos y el kardex la siguen citando). */
    public void eliminar(AuthUser me, String id) {
        Publicacion p = me.esAdmin() ? buscar(id) : propia(me, id, "Esta publicación ya no existe.");
        if (p.eliminada()) throw ApiException.conflict("Esta publicación ya no existe.");
        auditoria.cambiarStock(p, 0, "baja", me.esAdmin() ? "Eliminada por moderación" : "Publicación eliminada", me.id());
        p.setEstado(Publicacion.ELIMINADA);
        auditoria.actividad("Publicación eliminada",
                p.getNombre() + " (" + p.getId() + ")" + (me.esAdmin() ? ", por moderación" : ""), me.id());
    }

    /* ---------- Apoyo ---------- */

    private Publicacion buscar(String id) {
        return publicacionRepository.findById(id).orElseThrow(() -> ApiException.notFound("Esta publicación ya no existe."));
    }

    /** Publicación del propio vendedor que todavía se puede modificar. */
    private Publicacion propia(AuthUser me, String id, String error) {
        Publicacion p = publicacionRepository.findByIdForUpdate(id).orElseThrow(() -> ApiException.notFound(error));
        if (!p.getVendedor().getId().equals(me.id()) || p.eliminada()) throw ApiException.forbidden(error);
        return p;
    }

    private static void validarOferta(PublicacionRequest req) {
        if (req.precioAnterior() != null && req.precioAnterior() <= req.precio()) {
            throw ApiException.badRequest("Para mostrar una oferta, el precio anterior debe ser mayor que el precio actual.");
        }
    }

    private static void copiarDatos(Publicacion p, PublicacionRequest req) {
        p.setJuego(req.juego());
        p.setNombre(req.nombre().trim().replaceAll("\\s+", " "));
        p.setEdicion(req.edicion().trim().replaceAll("\\s+", " "));
        p.setNumero(req.numero() == null ? "" : req.numero().trim().toUpperCase(Locale.ROOT));
        p.setRareza(req.rareza());
        p.setAcabado(req.acabado());
        p.setIdioma(req.idioma());
        p.setCondicion(req.condicion());
        p.setPrecio(req.precio());
        p.setPrecioAnterior(req.precioAnterior());
        p.setDescripcion(req.descripcion() == null ? "" : req.descripcion().trim());
    }

    private static String vacioANull(String s) {
        return s == null || s.isBlank() ? null : s;
    }
}
