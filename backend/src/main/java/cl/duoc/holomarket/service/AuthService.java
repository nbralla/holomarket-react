package cl.duoc.holomarket.service;

import cl.duoc.holomarket.dto.EstadoDtos.UsuarioDto;
import cl.duoc.holomarket.dto.SolicitudDtos.AuthResponse;
import cl.duoc.holomarket.dto.SolicitudDtos.LoginRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.RegistroRequest;
import cl.duoc.holomarket.entity.Usuario;
import cl.duoc.holomarket.exception.ApiException;
import cl.duoc.holomarket.repository.UsuarioRepository;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.security.JwtService;
import cl.duoc.holomarket.security.LimiteIntentos;
import cl.duoc.holomarket.service.AuditoriaService.Tipo;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
@RequiredArgsConstructor
@Transactional
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final LimiteIntentos limiteIntentos;
    private final AuditoriaService auditoria;

    /**
     * Mismo mensaje para "correo no existe" y "clave incorrecta": así no se puede averiguar
     * qué correos están registrados. Tras 3 fallos seguidos, el correo queda bloqueado 30 segundos.
     * noRollbackFor: el intento fallido queda en la auditoría aunque la respuesta sea un error.
     */
    @Transactional(noRollbackFor = ApiException.class)
    public AuthResponse login(LoginRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        long espera = limiteIntentos.segundosRestantes(email);
        if (espera > 0) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                    "Demasiados intentos fallidos. Espera " + espera + " segundos antes de volver a intentarlo.");
        }
        Usuario u = usuarioRepository.findByEmail(email).orElse(null);
        if (u == null || !passwordEncoder.matches(req.clave(), u.getPasswordHash())) {
            boolean bloqueado = limiteIntentos.registrarFallo(email);
            auditoria.actividad("Inicio de sesión fallido", email, u == null ? null : u.getId());
            throw ApiException.unauthorized(bloqueado
                    ? "Correo o contraseña incorrectos. Por seguridad bloqueamos el acceso de esta cuenta durante "
                    + LimiteIntentos.SEGUNDOS_BLOQUEO + " segundos."
                    : "Correo o contraseña incorrectos.");
        }
        if (!u.activo()) {
            throw ApiException.forbidden("Tu cuenta está bloqueada. Escribe a soporte@holomarket.cl para revisarla.");
        }
        limiteIntentos.limpiar(email);
        auditoria.actividad("Inicio de sesión", "Rol " + u.getRol(), u.getId());
        return new AuthResponse(jwtService.generar(u), UsuarioDto.completo(u));
    }

    /** Crea una cuenta de cliente con la contraseña en BCrypt y la fecha del consentimiento. */
    public AuthResponse registrar(RegistroRequest req) {
        if (!Formato.rutValido(req.rut())) throw ApiException.badRequest("El RUT no es válido. Revisa el dígito verificador.");
        String rut = Formato.formatearRut(req.rut());
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (usuarioRepository.existsByRut(rut)) throw ApiException.conflict("Ya existe una cuenta con este RUT.");
        if (usuarioRepository.existsByEmail(email)) {
            throw ApiException.conflict("Ya existe una cuenta con este correo. Si es tuyo, ingresa con él.");
        }
        long ahora = System.currentTimeMillis();
        Usuario u = new Usuario();
        u.setId(auditoria.siguienteId(Tipo.USUARIO));
        u.setRut(rut);
        u.setNombre(req.nombre().trim().replaceAll("\\s+", " "));
        u.setEmail(email);
        u.setPasswordHash(passwordEncoder.encode(req.clave()));
        u.setRol(Usuario.CLIENTE);
        u.setRegion(req.region());
        u.setComuna(req.comuna());
        u.setTelefono(req.telefono() == null ? "" : req.telefono().trim());
        u.setDireccion("");
        u.setEstado(Usuario.ACTIVO);
        u.setCreado(ahora);
        u.setConsentimiento(ahora);
        usuarioRepository.save(u);
        auditoria.actividad("Registro de usuario", email + ", aceptó términos y política de privacidad", u.getId());
        return new AuthResponse(jwtService.generar(u), UsuarioDto.completo(u));
    }

    @Transactional(readOnly = true)
    public UsuarioDto yo(AuthUser me) {
        return usuarioRepository.findById(me.id()).map(UsuarioDto::completo)
                .orElseThrow(() -> ApiException.unauthorized("Tu sesión cambió. Vuelve a ingresar."));
    }

    public void cerrarSesion(AuthUser me) {
        auditoria.actividad("Cierre de sesión", "", me.id());
    }
}
