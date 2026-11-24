package cl.duoc.holomarket.service;

import cl.duoc.holomarket.dto.EstadoDtos.*;
import cl.duoc.holomarket.entity.Usuario;
import cl.duoc.holomarket.repository.*;
import cl.duoc.holomarket.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Arma GET /api/estado: todo lo que el usuario actual puede ver, filtrado según su rol.
 * - Visitante: catálogo, vendedores (solo nombre y región) y ventas anónimas para el historial de precios.
 * - Cliente: lo anterior + sus datos, sus pedidos (compras y ventas), su kardex y sus retiros.
 * - Administrador: todo.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class EstadoService {

    private final UsuarioRepository usuarioRepository;
    private final PublicacionRepository publicacionRepository;
    private final PedidoRepository pedidoRepository;
    private final MovimientoRepository movimientoRepository;
    private final ActividadRepository actividadRepository;
    private final RetiroRepository retiroRepository;
    private final AuditoriaService auditoria;

    public EstadoDto estadoPara(AuthUser me) {
        boolean admin = me != null && me.esAdmin();
        String uid = me == null ? null : me.id();

        List<UsuarioDto> usuarios = usuarioRepository.findAll().stream()
                .sorted(Comparator.comparing(Usuario::getId))
                .map(u -> admin || u.getId().equals(uid) ? UsuarioDto.completo(u) : UsuarioDto.publico(u))
                .toList();

        // Las publicaciones eliminadas solo las ve su dueño (inventario) o el administrador.
        List<PublicacionDto> publicaciones = publicacionRepository.findAll().stream()
                .filter(p -> admin || !p.eliminada() || p.getVendedor().getId().equals(uid))
                .sorted(Comparator.comparing(p -> p.getId()))
                .map(PublicacionDto::de)
                .toList();

        List<PedidoDto> pedidos = pedidoRepository.findAll().stream()
                .sorted(Comparator.comparing(o -> o.getFecha()))
                .map(o -> admin || o.getComprador().getId().equals(uid) || o.getVendedor().getId().equals(uid)
                        ? PedidoDto.de(o) : PedidoDto.anonimo(o))
                .toList();

        // Kardex: el vendedor ve el de sus publicaciones; el comprador, solo los movimientos de sus
        // propias compras (la confirmación muestra "stock antes → después").
        Set<String> misCompras = pedidos.stream().filter(o -> o.compradorId().equals(uid)).map(PedidoDto::id)
                .collect(Collectors.toSet());
        var movimientos = admin ? movimientoRepository.findAllByOrderByFechaAsc()
                : uid == null ? List.<cl.duoc.holomarket.entity.Movimiento>of()
                : movimientoRepository.findAllByOrderByFechaAsc().stream()
                .filter(m -> uid.equals(m.getVendedorId()) || misCompras.contains(m.getRef()))
                .toList();

        var actividad = admin ? actividadRepository.findAllByOrderByFechaAsc() : List.<cl.duoc.holomarket.entity.Actividad>of();

        List<RetiroDto> retiros = (admin ? retiroRepository.findAll()
                : uid == null ? List.<cl.duoc.holomarket.entity.Retiro>of() : retiroRepository.findByUsuario_Id(uid))
                .stream()
                .sorted(Comparator.comparing(r -> r.getFecha()))
                .map(RetiroDto::de)
                .toList();

        return new EstadoDto(usuarios, publicaciones, pedidos, movimientos, actividad, retiros,
                ConfigDto.de(auditoria.config()));
    }
}
