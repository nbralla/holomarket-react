package cl.duoc.holomarket.controller;

import cl.duoc.holomarket.dto.EstadoDtos.UsuarioDto;
import cl.duoc.holomarket.dto.SolicitudDtos.AuthResponse;
import cl.duoc.holomarket.dto.SolicitudDtos.LoginRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.RegistroRequest;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.service.AuthService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Auth")
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "Ingresar", description = "Devuelve el token JWT y los datos del usuario. Tras 3 intentos fallidos el correo se bloquea 30 segundos.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Ingreso correcto"),
            @ApiResponse(responseCode = "401", description = "Correo o contraseña incorrectos"),
            @ApiResponse(responseCode = "403", description = "Cuenta bloqueada por la administración"),
            @ApiResponse(responseCode = "429", description = "Demasiados intentos fallidos")
    })
    @SecurityRequirements
    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest req) {
        return authService.login(req);
    }

    @Operation(summary = "Crear cuenta de cliente", description = "Valida el RUT (módulo 11) y que RUT y correo no estén registrados.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Cuenta creada (ya viene con su token)"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos"),
            @ApiResponse(responseCode = "409", description = "RUT o correo ya registrados")
    })
    @SecurityRequirements
    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse registro(@Valid @RequestBody RegistroRequest req) {
        return authService.registrar(req);
    }

    @Operation(summary = "Usuario actual", description = "Confirma el token y devuelve los datos del usuario.")
    @GetMapping("/yo")
    public UsuarioDto yo(@Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return authService.yo(me);
    }

    @Operation(summary = "Cerrar sesión", description = "Solo deja el registro en la auditoría: el token lo descarta el navegador.")
    @PostMapping("/salir")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void salir(@Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        authService.cerrarSesion(me);
    }
}
