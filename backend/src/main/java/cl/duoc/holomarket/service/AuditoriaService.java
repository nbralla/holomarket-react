package cl.duoc.holomarket.service;

import cl.duoc.holomarket.entity.Actividad;
import cl.duoc.holomarket.entity.Configuracion;
import cl.duoc.holomarket.entity.Movimiento;
import cl.duoc.holomarket.entity.Publicacion;
import cl.duoc.holomarket.exception.ApiException;
import cl.duoc.holomarket.repository.ActividadRepository;
import cl.duoc.holomarket.repository.ConfiguracionRepository;
import cl.duoc.holomarket.repository.MovimientoRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Lo que comparten todas las reglas del negocio: los ids correlativos, el registro de
 * actividad (auditoría) y el kardex de stock. Equivale a logica/estado.ts del front.
 */
@Service
@RequiredArgsConstructor
@Transactional
public class AuditoriaService {

    public enum Tipo { USUARIO, PUBLICACION, PEDIDO, MOVIMIENTO, ACTIVIDAD, RETIRO }

    private final ConfiguracionRepository configuracionRepository;
    private final ActividadRepository actividadRepository;
    private final MovimientoRepository movimientoRepository;

    public Configuracion config() {
        return configuracionRepository.findById(Configuracion.ID)
                .orElseThrow(() -> new IllegalStateException("Falta la configuración: la base no tiene datos iniciales"));
    }

    /**
     * Siguiente id: U04, P026, HM-1023, RET-003... La fila de configuración se bloquea (FOR UPDATE)
     * hasta que termina la transacción, así dos peticiones simultáneas nunca reciben el mismo número.
     */
    public String siguienteId(Tipo tipo) {
        Configuracion c = configuracionRepository.findForUpdate()
                .orElseThrow(() -> new IllegalStateException("Falta la configuración"));
        return switch (tipo) {
            case USUARIO -> {
                c.setSecUsuario(c.getSecUsuario() + 1);
                yield "U" + rellenar(c.getSecUsuario(), 2);
            }
            case PUBLICACION -> {
                c.setSecPublicacion(c.getSecPublicacion() + 1);
                yield "P" + rellenar(c.getSecPublicacion(), 3);
            }
            case PEDIDO -> {
                c.setSecPedido(c.getSecPedido() + 1);
                yield "HM-" + c.getSecPedido();
            }
            case MOVIMIENTO -> {
                c.setSecMovimiento(c.getSecMovimiento() + 1);
                yield "M" + rellenar(c.getSecMovimiento(), 3);
            }
            case ACTIVIDAD -> {
                c.setSecActividad(c.getSecActividad() + 1);
                yield "A" + rellenar(c.getSecActividad(), 3);
            }
            case RETIRO -> {
                c.setSecRetiro(c.getSecRetiro() + 1);
                yield "RET-" + rellenar(c.getSecRetiro(), 3);
            }
        };
    }

    private static String rellenar(int n, int largo) {
        return String.format("%0" + largo + "d", n);
    }

    /* ---------- Auditoría ---------- */

    public void actividad(String accion, String detalle, String uid) {
        Actividad a = new Actividad();
        a.setId(siguienteId(Tipo.ACTIVIDAD));
        a.setFecha(System.currentTimeMillis());
        a.setUid(uid);
        a.setAccion(accion);
        String texto = detalle == null ? "" : detalle;
        a.setDetalle(texto.length() > 1000 ? texto.substring(0, 1000) : texto);
        actividadRepository.save(a);
    }

    public void movimiento(Publicacion pub, String tipo, int cantidad, int antes, int despues, String ref, String uid) {
        Movimiento m = new Movimiento();
        m.setId(siguienteId(Tipo.MOVIMIENTO));
        m.setFecha(System.currentTimeMillis());
        m.setPubId(pub.getId());
        m.setCarta(pub.getNombre());
        m.setJuego(pub.getJuego());
        m.setVendedorId(pub.getVendedor().getId());
        m.setTipo(tipo);
        m.setCantidad(cantidad);
        m.setAntes(antes);
        m.setDespues(despues);
        m.setRef(ref == null ? "" : ref);
        m.setUid(uid);
        movimientoRepository.save(m);
    }

    /** Cambia el stock de una publicación y deja la trazabilidad en el kardex. Devuelve el stock anterior. */
    public int cambiarStock(Publicacion pub, int nuevoStock, String tipo, String ref, String uid) {
        if (nuevoStock < 0) throw ApiException.conflict("El stock no puede quedar negativo.");
        if (nuevoStock > Publicacion.STOCK_MAXIMO) throw ApiException.badRequest("El stock máximo por publicación es 999 unidades.");
        int antes = pub.getStock();
        pub.setStock(nuevoStock);
        pub.setActualizado(System.currentTimeMillis());
        movimiento(pub, tipo, nuevoStock - antes, antes, nuevoStock, ref, uid);
        return antes;
    }
}
