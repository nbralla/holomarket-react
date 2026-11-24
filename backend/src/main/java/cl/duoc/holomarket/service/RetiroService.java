package cl.duoc.holomarket.service;

import cl.duoc.holomarket.dto.EstadoDtos.RetiroDto;
import cl.duoc.holomarket.entity.*;
import cl.duoc.holomarket.exception.ApiException;
import cl.duoc.holomarket.repository.PedidoRepository;
import cl.duoc.holomarket.repository.RetiroRepository;
import cl.duoc.holomarket.repository.UsuarioRepository;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.service.AuditoriaService.Tipo;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Locale;

import static cl.duoc.holomarket.service.Formato.clp;

/** Cuenta bancaria y retiros de dinero del vendedor. Equivale a logica/retiros.ts del front. */
@Service
@RequiredArgsConstructor
@Transactional
public class RetiroService {

    private static final String YA_CAMBIO = "Esta solicitud de retiro ya cambió de estado. Actualizamos la lista.";

    private final RetiroRepository retiroRepository;
    private final PedidoRepository pedidoRepository;
    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoria;

    /**
     * El neto de cada venta queda retenido mientras el pedido está pagado o enviado, y se libera
     * cuando quien compra confirma la recepción.
     * Saldo disponible = ventas liberadas − retiros en proceso − retiros transferidos.
     */
    public int saldoDisponible(String uid) {
        int liberado = pedidoRepository.findByVendedor_Id(uid).stream()
                .filter(o -> Pedido.ENTREGADO.equals(o.getEstado()))
                .mapToInt(Pedido::getNetoVendedor).sum();
        List<Retiro> retiros = retiroRepository.findByUsuario_Id(uid);
        int enProceso = retiros.stream().filter(r -> Retiro.SOLICITADO.equals(r.getEstado())).mapToInt(Retiro::getMonto).sum();
        int retirado = retiros.stream().filter(r -> Retiro.PAGADO.equals(r.getEstado())).mapToInt(Retiro::getMonto).sum();
        return Math.max(0, liberado - enProceso - retirado);
    }

    public void guardarCuenta(AuthUser me, String banco, String tipo, String numero) {
        Usuario u = usuarioRepository.findById(me.id()).orElseThrow(() -> ApiException.unauthorized("Tu sesión cambió. Vuelve a ingresar."));
        String limpio = numero.replaceAll("[\\s-]", "");
        if (!limpio.matches("\\d{4,20}")) throw ApiException.badRequest("El número de cuenta debe tener entre 4 y 20 dígitos.");
        boolean nueva = u.getCuenta() == null || u.getCuenta().getNumero() == null;
        u.setCuenta(new CuentaBancaria(banco, tipo, limpio, System.currentTimeMillis()));
        auditoria.actividad(nueva ? "Cuenta bancaria registrada" : "Cuenta bancaria actualizada",
                banco + ", " + tipo + " terminada en " + limpio.substring(limpio.length() - 4), me.id());
    }

    /** El saldo se vuelve a calcular con los datos guardados: evita retirar dos veces el mismo dinero. */
    public RetiroDto solicitar(AuthUser me, int monto) {
        Usuario u = usuarioRepository.findById(me.id()).orElseThrow(() -> ApiException.unauthorized("Tu sesión cambió. Vuelve a ingresar."));
        CuentaBancaria c = u.getCuenta();
        if (c == null || c.getNumero() == null) throw ApiException.badRequest("Registra una cuenta bancaria antes de retirar.");
        int minimo = auditoria.config().getRetiroMinimo();
        if (monto < minimo) throw ApiException.badRequest("El monto mínimo de retiro es " + clp(minimo) + ".");
        // Se toma el contador de ids (fila bloqueada) ANTES de calcular el saldo: dos solicitudes
        // simultáneas del mismo vendedor quedan en fila y la segunda ya ve la primera.
        String id = auditoria.siguienteId(Tipo.RETIRO);
        int disponible = saldoDisponible(u.getId());
        if (monto > disponible) throw ApiException.conflict("Tu saldo cambió: ahora puedes retirar hasta " + clp(disponible) + ".");
        long ahora = System.currentTimeMillis();
        Retiro r = new Retiro();
        r.setId(id);
        r.setUsuario(u);
        r.setMonto(monto);
        String numero = c.getNumero();
        r.setCuenta(new ResumenCuenta(c.getBanco(), c.getTipo(), numero.substring(Math.max(0, numero.length() - 4)), u.getNombre(), u.getRut()));
        r.setFecha(ahora);
        r.cambiarEstado(Retiro.SOLICITADO, ahora);
        retiroRepository.save(r);
        auditoria.actividad("Retiro solicitado", r.getId() + " por " + clp(monto) + " a " + c.getBanco() + ", "
                + c.getTipo() + " terminada en " + r.getCuenta().getUltimos(), me.id());
        return RetiroDto.de(r);
    }

    public RetiroDto anular(AuthUser me, String id) {
        Retiro r = pendiente(id);
        if (!r.getUsuario().getId().equals(me.id())) throw ApiException.conflict(YA_CAMBIO);
        r.cambiarEstado(Retiro.ANULADO, System.currentTimeMillis());
        auditoria.actividad("Retiro anulado", r.getId() + " por " + clp(r.getMonto()), me.id());
        return RetiroDto.de(r);
    }

    public RetiroDto transferir(AuthUser admin, String id, String comprobante) {
        Retiro r = pendiente(id);
        r.setComprobante(comprobante == null ? "" : comprobante.trim().toUpperCase(Locale.ROOT));
        r.cambiarEstado(Retiro.PAGADO, System.currentTimeMillis());
        auditoria.actividad("Retiro transferido", r.getId() + " por " + clp(r.getMonto()) + " a " + r.getUsuario().getNombre()
                + (r.getComprobante().isEmpty() ? "" : ", comprobante " + r.getComprobante()), admin.id());
        return RetiroDto.de(r);
    }

    public RetiroDto rechazar(AuthUser admin, String id, String motivo) {
        Retiro r = pendiente(id);
        r.setMotivo(motivo.trim());
        r.cambiarEstado(Retiro.RECHAZADO, System.currentTimeMillis());
        auditoria.actividad("Retiro rechazado", r.getId() + " por " + clp(r.getMonto()) + ": " + r.getMotivo(), admin.id());
        return RetiroDto.de(r);
    }

    private Retiro pendiente(String id) {
        Retiro r = retiroRepository.findByIdForUpdate(id).orElse(null);
        if (r == null || !Retiro.SOLICITADO.equals(r.getEstado())) throw ApiException.conflict(YA_CAMBIO);
        return r;
    }
}
