package cl.duoc.holomarket.service;

import cl.duoc.holomarket.dto.EstadoDtos.PedidoDto;
import cl.duoc.holomarket.dto.SolicitudDtos.CompraRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.ItemCompra;
import cl.duoc.holomarket.entity.*;
import cl.duoc.holomarket.exception.ApiException;
import cl.duoc.holomarket.repository.PedidoRepository;
import cl.duoc.holomarket.repository.PublicacionRepository;
import cl.duoc.holomarket.repository.UsuarioRepository;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.service.AuditoriaService.Tipo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.*;

import static cl.duoc.holomarket.service.Formato.clp;
import static cl.duoc.holomarket.service.Formato.plural;

/** Compra y ciclo de vida de los pedidos. Equivale a logica/compras.ts del front. */
@Service
@RequiredArgsConstructor
public class PedidoService {

    /** Tarjetas de prueba que el "banco" rechaza (igual que logica/ofertas.ts del front). */
    private static final Map<String, String> TARJETAS_RECHAZADAS = Map.of(
            "4000000000000002", "rechazada",
            "4000000000009995", "fondos");
    private static final Map<String, String> TEXTO_RECHAZO = Map.of(
            "rechazada", "El banco emisor no autorizó la compra.",
            "fondos", "La tarjeta no tiene fondos o cupo suficiente para este monto.");

    private final PedidoRepository pedidoRepository;
    private final PublicacionRepository publicacionRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoria;
    private final PlatformTransactionManager transactionManager;

    /**
     * Revisa primero el pago simulado: si el banco lo rechaza, responde 402 sin tocar el stock
     * (el intento queda en la auditoría). Si se aprueba, crea los pedidos en UNA transacción.
     */
    public List<PedidoDto> comprar(AuthUser me, CompraRequest req) {
        String digitos = req.numeroTarjeta() == null ? "" : req.numeroTarjeta().replaceAll("\\D", "");
        if ("tarjeta".equals(req.pago())) {
            if (!Formato.luhnValido(digitos)) throw ApiException.badRequest("El número de tarjeta no es válido.");
            String motivo = TARJETAS_RECHAZADAS.get(digitos);
            if (motivo != null) {
                auditoria.actividad("Pago rechazado", TEXTO_RECHAZO.get(motivo), me.id());
                throw new ApiException(HttpStatus.PAYMENT_REQUIRED, TEXTO_RECHAZO.get(motivo), Map.of("motivo", motivo));
            }
        }
        if ("despacho".equals(req.entrega()) && (vacio(req.region()) || vacio(req.comuna()) || vacio(req.direccion()))) {
            throw ApiException.badRequest("Completa la región, la comuna y la dirección de despacho.");
        }
        return new TransactionTemplate(transactionManager).execute(tx -> crearPedidos(me, req, digitos));
    }

    /**
     * Un pedido por vendedor. Bloquea cada publicación (FOR UPDATE) en orden de id para evitar
     * bloqueos cruzados; si alguna no alcanza, lanza el error y no se guarda NADA (rollback).
     */
    private List<PedidoDto> crearPedidos(AuthUser me, CompraRequest req, String digitos) {
        if (me.esAdmin()) throw ApiException.forbidden("La cuenta de administración no puede comprar. Ingresa con un usuario cliente.");
        Usuario comprador = usuarioRepository.findById(me.id())
                .orElseThrow(() -> ApiException.unauthorized("Tu sesión cambió. Vuelve a ingresar."));

        Map<String, Integer> cantidades = new TreeMap<>();
        for (ItemCompra it : req.items()) cantidades.merge(it.pubId(), it.cantidad(), Integer::sum);

        // Agrupa las líneas por vendedor manteniendo el orden.
        Map<String, List<Map.Entry<Publicacion, Integer>>> porVendedor = new LinkedHashMap<>();
        List<String> avisos = new ArrayList<>();
        for (Map.Entry<String, Integer> e : cantidades.entrySet()) {
            Publicacion p = publicacionRepository.findByIdForUpdate(e.getKey()).orElse(null);
            int cantidad = e.getValue();
            if (p == null || !Publicacion.ACTIVA.equals(p.getEstado()) || !p.getVendedor().activo()
                    || p.getVendedor().getId().equals(comprador.getId())) {
                avisos.add((p == null ? "Una carta" : p.getNombre()) + " ya no está disponible.");
            } else if (p.getStock() < cantidad) {
                avisos.add(p.getStock() == 0 ? p.getNombre() + " se agotó."
                        : "Solo quedan " + p.getStock() + " " + plural(p.getStock(), "unidad", "unidades") + " de " + p.getNombre() + ".");
            } else {
                porVendedor.computeIfAbsent(p.getVendedor().getId(), k -> new ArrayList<>()).add(Map.entry(p, cantidad));
            }
        }
        if (!avisos.isEmpty()) {
            throw ApiException.conflict("El stock cambió mientras comprabas. " + String.join(" ", avisos)
                    + " Revisa el resumen y vuelve a pagar.");
        }

        Configuracion config = auditoria.config();
        boolean despacho = "despacho".equals(req.entrega());
        String regionDestino = despacho ? req.region() : comprador.getRegion();
        String detallePago = "tarjeta".equals(req.pago())
                ? "tarjeta terminada en " + digitos.substring(digitos.length() - 4) : "transferencia simulada";
        long ahora = System.currentTimeMillis();

        List<PedidoDto> creados = new ArrayList<>();
        for (List<Map.Entry<Publicacion, Integer>> lineas : porVendedor.values()) {
            Usuario vendedor = lineas.get(0).getKey().getVendedor();
            Pedido o = new Pedido();
            o.setId(auditoria.siguienteId(Tipo.PEDIDO));
            o.setComprador(comprador);
            o.setVendedor(vendedor);
            o.setFecha(ahora);
            int subtotal = 0;
            for (Map.Entry<Publicacion, Integer> l : lineas) {
                Publicacion p = l.getKey();
                o.getItems().add(new LineaPedido(p.getId(), p.getNombre(), p.getJuego(), p.getEdicion(), p.getNumero(),
                        p.getCondicion(), p.getIdioma(), p.getPrecio(), l.getValue()));
                subtotal = Math.addExact(subtotal, Math.multiplyExact(p.getPrecio(), l.getValue()));
            }
            int costoEnvio = costoEnvio(config, req.entrega(), vendedor.getRegion(), regionDestino);
            int comision = (int) Math.round(subtotal * config.getComision() / 100.0);
            int ivaComision = (int) Math.round(comision * config.getIva() / 100.0);
            o.setSubtotal(subtotal);
            o.setEnvio(new Envio(req.entrega(), costoEnvio, req.receptor().trim(), req.telefono().trim(),
                    despacho ? regionDestino : "", despacho ? req.comuna() : "", despacho ? req.direccion().trim() : ""));
            o.setTotal(subtotal + costoEnvio);
            o.setComisionPct(config.getComision());
            o.setComision(comision);
            o.setIvaComision(ivaComision);
            o.setNetoVendedor(subtotal - comision - ivaComision);
            o.setPago(new Pago(req.pago(), detallePago));
            o.cambiarEstado(Pedido.PAGADO, ahora);
            o.setSeguimiento("");
            pedidoRepository.save(o);
            for (Map.Entry<Publicacion, Integer> l : lineas) {
                Publicacion p = l.getKey();
                auditoria.cambiarStock(p, p.getStock() - l.getValue(), "venta", o.getId(), comprador.getId());
            }
            auditoria.actividad("Compra realizada", o.getId() + " a " + vendedor.getNombre() + " por " + clp(o.getTotal()), comprador.getId());
            creados.add(PedidoDto.de(o));
        }
        return creados;
    }

    public static int costoEnvio(Configuracion config, String metodo, String regionVendedor, String regionComprador) {
        if ("retiro".equals(metodo)) return 0;
        return Objects.equals(regionVendedor, regionComprador) ? config.getEnvioMismaRegion() : config.getEnvioOtraRegion();
    }

    /* ---------- Estados del pedido: pagado → enviado → entregado (o cancelado) ---------- */

    @Transactional
    public PedidoDto marcarEnviado(AuthUser me, String id, String seguimiento) {
        Pedido o = pedidoRepository.findByIdForUpdate(id).orElse(null);
        if (o == null || !o.getVendedor().getId().equals(me.id()) || !Pedido.PAGADO.equals(o.getEstado())) {
            throw ApiException.conflict("Este pedido ya no se puede marcar como enviado.");
        }
        boolean retiro = "retiro".equals(o.getEnvio().getMetodo());
        o.setSeguimiento(retiro || seguimiento == null ? "" : seguimiento.trim().toUpperCase(Locale.ROOT));
        o.cambiarEstado(Pedido.ENVIADO, System.currentTimeMillis());
        auditoria.actividad(retiro ? "Pedido listo para entrega" : "Pedido enviado",
                o.getId() + (o.getSeguimiento().isEmpty() ? "" : ", seguimiento " + o.getSeguimiento()), me.id());
        return PedidoDto.de(o);
    }

    @Transactional
    public PedidoDto confirmarRecepcion(AuthUser me, String id) {
        Pedido o = pedidoRepository.findByIdForUpdate(id).orElse(null);
        if (o == null || !o.getComprador().getId().equals(me.id()) || !Pedido.ENVIADO.equals(o.getEstado())) {
            throw ApiException.conflict("Este pedido ya no se puede confirmar.");
        }
        o.cambiarEstado(Pedido.ENTREGADO, System.currentTimeMillis());
        auditoria.actividad("Pedido recibido", o.getId(), me.id());
        return PedidoDto.de(o);
    }

    /** Solo se cancela mientras está pagado (no enviado): las unidades vuelven al stock. */
    @Transactional
    public PedidoDto cancelar(AuthUser me, String id) {
        Pedido o = pedidoRepository.findByIdForUpdate(id).orElse(null);
        if (o == null || !o.getComprador().getId().equals(me.id()) || !Pedido.PAGADO.equals(o.getEstado())) {
            throw ApiException.conflict("Este pedido ya no se puede cancelar.");
        }
        int devueltas = 0;
        for (LineaPedido it : o.getItems()) {
            Publicacion p = publicacionRepository.findByIdForUpdate(it.getPubId()).orElse(null);
            if (p != null && !p.eliminada() && p.getStock() + it.getCantidad() <= Publicacion.STOCK_MAXIMO) {
                auditoria.cambiarStock(p, p.getStock() + it.getCantidad(), "cancelacion", o.getId(), me.id());
                devueltas += it.getCantidad();
            }
        }
        o.cambiarEstado(Pedido.CANCELADO, System.currentTimeMillis());
        auditoria.actividad("Pedido cancelado", o.getId() + ", " + devueltas + " u. devueltas al stock", me.id());
        return PedidoDto.de(o);
    }

    private static boolean vacio(String s) {
        return s == null || s.isBlank();
    }
}
