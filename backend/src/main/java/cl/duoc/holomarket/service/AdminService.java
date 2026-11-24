package cl.duoc.holomarket.service;

import cl.duoc.holomarket.dto.EstadoDtos.ConfigDto;
import cl.duoc.holomarket.dto.EstadoDtos.UsuarioDto;
import cl.duoc.holomarket.dto.SolicitudDtos.ConfigRequest;
import cl.duoc.holomarket.entity.Configuracion;
import cl.duoc.holomarket.entity.Usuario;
import cl.duoc.holomarket.exception.ApiException;
import cl.duoc.holomarket.repository.UsuarioRepository;
import cl.duoc.holomarket.security.AuthUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.BiConsumer;
import java.util.function.Function;

/** Moderación de usuarios y configuración del negocio. Equivale a logica/usuarios.ts del front. */
@Service
@RequiredArgsConstructor
@Transactional
public class AdminService {

    private final UsuarioRepository usuarioRepository;
    private final AuditoriaService auditoria;

    /** Bloquear oculta sus publicaciones del catálogo e impide que vuelva a ingresar (su token deja de servir). */
    public UsuarioDto cambiarEstadoUsuario(AuthUser admin, String id, String nuevo) {
        if (!Usuario.ACTIVO.equals(nuevo) && !Usuario.BLOQUEADO.equals(nuevo)) throw ApiException.badRequest("Estado no válido.");
        Usuario u = usuarioRepository.findById(id).orElseThrow(() -> ApiException.notFound("No encontramos al usuario."));
        if (u.esAdmin() || nuevo.equals(u.getEstado())) throw ApiException.conflict("No se pudo cambiar el estado del usuario.");
        u.setEstado(nuevo);
        auditoria.actividad(Usuario.BLOQUEADO.equals(nuevo) ? "Usuario bloqueado" : "Usuario reactivado",
                u.getNombre() + " (" + u.getEmail() + ")", admin.id());
        return UsuarioDto.completo(u);
    }

    private record Campo(String etiqueta, Function<Configuracion, Integer> leer, BiConsumer<Configuracion, Integer> escribir,
                         Function<ConfigRequest, Integer> nuevo) {
    }

    private static final List<Campo> CAMPOS = List.of(
            new Campo("Comisión por venta (%)", Configuracion::getComision, Configuracion::setComision, ConfigRequest::comision),
            new Campo("IVA sobre la comisión (%)", Configuracion::getIva, Configuracion::setIva, ConfigRequest::iva),
            new Campo("Envío a la misma región (CLP)", Configuracion::getEnvioMismaRegion, Configuracion::setEnvioMismaRegion, ConfigRequest::envioMismaRegion),
            new Campo("Envío a otra región (CLP)", Configuracion::getEnvioOtraRegion, Configuracion::setEnvioOtraRegion, ConfigRequest::envioOtraRegion),
            new Campo("Aviso de stock bajo (unidades)", Configuracion::getStockBajo, Configuracion::setStockBajo, ConfigRequest::stockBajo),
            new Campo("Monto mínimo de retiro (CLP)", Configuracion::getRetiroMinimo, Configuracion::setRetiroMinimo, ConfigRequest::retiroMinimo),
            new Campo("Cierre de sesión por inactividad (minutos)", Configuracion::getSesionMinutos, Configuracion::setSesionMinutos, ConfigRequest::sesionMinutos),
            new Campo("Dólar de respaldo (CLP)", Configuracion::getDolar, Configuracion::setDolar, ConfigRequest::dolar));

    /** Guarda solo los valores que cambiaron y deja la lista de cambios en la auditoría. */
    public ConfigDto guardarConfiguracion(AuthUser admin, ConfigRequest req) {
        Configuracion c = auditoria.config();
        List<String> cambios = new ArrayList<>();
        for (Campo campo : CAMPOS) {
            Integer antes = campo.leer().apply(c);
            Integer despues = campo.nuevo().apply(req);
            if (!Objects.equals(antes, despues)) {
                cambios.add(campo.etiqueta() + ": " + antes + " → " + despues);
                campo.escribir().accept(c, despues);
            }
        }
        if (!cambios.isEmpty()) auditoria.actividad("Configuración actualizada", String.join("; ", cambios), admin.id());
        return ConfigDto.de(c);
    }
}
