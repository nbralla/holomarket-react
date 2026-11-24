package cl.duoc.holomarket.dto;

import cl.duoc.holomarket.entity.*;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Respuestas de la API con la MISMA forma que los tipos del front (src/types/index.ts),
 * así la interfaz de React sigue funcionando igual que con json-server.
 */
public final class EstadoDtos {

    private EstadoDtos() {
    }

    public record CuentaDto(String banco, String tipo, String numero, Long actualizada) {
    }

    public record UsuarioDto(String id, String rut, String nombre, String email, String rol, String region,
                             String comuna, String telefono, String direccion, String estado, Long creado,
                             Long consentimiento, CuentaDto cuenta) {

        /** Datos completos: para el propio usuario y para el administrador. Nunca incluye la contraseña. */
        public static UsuarioDto completo(Usuario u) {
            CuentaBancaria c = u.getCuenta();
            CuentaDto cuenta = c == null || c.getNumero() == null ? null
                    : new CuentaDto(c.getBanco(), c.getTipo(), c.getNumero(), c.getActualizada());
            return new UsuarioDto(u.getId(), u.getRut(), u.getNombre(), u.getEmail(), u.getRol(), u.getRegion(),
                    u.getComuna(), u.getTelefono(), u.getDireccion(), u.getEstado(), u.getCreado(),
                    u.getConsentimiento(), cuenta);
        }

        /** Lo que cualquiera puede ver de otro usuario: su nombre de vendedor y su región (para el envío). */
        public static UsuarioDto publico(Usuario u) {
            return new UsuarioDto(u.getId(), "", u.getNombre(), "", u.getRol(), u.getRegion(), u.getComuna(),
                    "", "", u.getEstado(), u.getCreado(), null, null);
        }
    }

    public record PublicacionDto(String id, String vendedorId, String juego, String nombre, String edicion,
                                 String numero, String rareza, String acabado, String idioma, String condicion,
                                 Integer precio, Integer precioAnterior, Integer stock, String estado,
                                 String descripcion, String imagen, String imagenApi, Long creado, Long actualizado) {

        public static PublicacionDto de(Publicacion p) {
            return new PublicacionDto(p.getId(), p.getVendedor().getId(), p.getJuego(), p.getNombre(), p.getEdicion(),
                    p.getNumero(), p.getRareza(), p.getAcabado(), p.getIdioma(), p.getCondicion(), p.getPrecio(),
                    p.getPrecioAnterior(), p.getStock(), p.getEstado(), p.getDescripcion(), p.getImagen(),
                    p.getImagenApi(), p.getCreado(), p.getActualizado());
        }
    }

    public record PedidoDto(String id, String compradorId, String vendedorId, Long fecha, List<LineaPedido> items,
                            Integer subtotal, Envio envio, Integer total, Integer comisionPct, Integer comision,
                            Integer ivaComision, Integer netoVendedor, Pago pago, String estado,
                            List<CambioEstado> historial, String seguimiento) {

        public static PedidoDto de(Pedido o) {
            return new PedidoDto(o.getId(), o.getComprador().getId(), o.getVendedor().getId(), o.getFecha(),
                    List.copyOf(o.getItems()), o.getSubtotal(), o.getEnvio(), o.getTotal(), o.getComisionPct(),
                    o.getComision(), o.getIvaComision(), o.getNetoVendedor(), o.getPago(), o.getEstado(),
                    List.copyOf(o.getHistorial()), o.getSeguimiento());
        }

        /**
         * Venta de otra persona: solo lo necesario para el historial de ventas de una carta
         * (qué carta, cuándo, a qué precio). Sin comprador, dirección ni medio de pago.
         */
        public static PedidoDto anonimo(Pedido o) {
            Envio envio = new Envio(o.getEnvio().getMetodo(), 0, "", "", "", "", "");
            return new PedidoDto(o.getId(), "", o.getVendedor().getId(), o.getFecha(), List.copyOf(o.getItems()),
                    o.getSubtotal(), envio, o.getSubtotal(), 0, 0, 0, 0, new Pago("", ""), o.getEstado(),
                    List.copyOf(o.getHistorial()), "");
        }
    }

    public record RetiroDto(String id, String uid, Integer monto, ResumenCuenta cuenta, String estado, Long fecha,
                            List<CambioEstado> historial, String comprobante, String motivo) {

        public static RetiroDto de(Retiro r) {
            return new RetiroDto(r.getId(), r.getUsuario().getId(), r.getMonto(), r.getCuenta(), r.getEstado(),
                    r.getFecha(), List.copyOf(r.getHistorial()), r.getComprobante(), r.getMotivo());
        }
    }

    public record ConfigDto(Integer comision, Integer iva, Integer envioMismaRegion, Integer envioOtraRegion,
                            Integer stockBajo, Integer sesionMinutos, Integer retiroMinimo, Integer dolar,
                            Map<String, Integer> secuencias) {

        public static ConfigDto de(Configuracion c) {
            Map<String, Integer> sec = new LinkedHashMap<>();
            sec.put("usuario", c.getSecUsuario());
            sec.put("publicacion", c.getSecPublicacion());
            sec.put("pedido", c.getSecPedido());
            sec.put("movimiento", c.getSecMovimiento());
            sec.put("actividad", c.getSecActividad());
            sec.put("retiro", c.getSecRetiro());
            return new ConfigDto(c.getComision(), c.getIva(), c.getEnvioMismaRegion(), c.getEnvioOtraRegion(),
                    c.getStockBajo(), c.getSesionMinutos(), c.getRetiroMinimo(), c.getDolar(), sec);
        }
    }

    /** Todo lo que el usuario actual puede ver, en una sola respuesta (GET /api/estado). */
    public record EstadoDto(List<UsuarioDto> usuarios, List<PublicacionDto> publicaciones, List<PedidoDto> pedidos,
                            List<Movimiento> movimientos, List<Actividad> actividad, List<RetiroDto> retiros,
                            ConfigDto config) {
    }
}
