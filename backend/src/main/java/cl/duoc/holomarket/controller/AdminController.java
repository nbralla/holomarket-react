package cl.duoc.holomarket.controller;

import cl.duoc.holomarket.dto.EstadoDtos.ConfigDto;
import cl.duoc.holomarket.dto.EstadoDtos.UsuarioDto;
import cl.duoc.holomarket.dto.SolicitudDtos.ConfigRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.EstadoRequest;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.service.AdminService;
import cl.duoc.holomarket.service.AuditoriaService;
import cl.duoc.holomarket.service.DatosDemoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Solo ADMIN (reglas en SecurityConfig). */
@Tag(name = "Administración")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AdminController {

    private final AdminService adminService;
    private final DatosDemoService datosDemo;
    private final AuditoriaService auditoria;

    @Operation(summary = "Bloquear o reactivar un usuario [ADMIN]", description = "Estados: activo, bloqueado. Un bloqueado no ingresa y sus publicaciones se ocultan.")
    @PutMapping("/usuarios/{id}/estado")
    public UsuarioDto cambiarEstado(@PathVariable String id, @Valid @RequestBody EstadoRequest req,
                                    @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return adminService.cambiarEstadoUsuario(me, id, req.estado());
    }

    @Operation(summary = "Guardar la configuración [ADMIN]", description = "Comisión 0-30 %, IVA, envíos, stock bajo, sesión, retiro mínimo y dólar de respaldo.")
    @PutMapping("/config")
    public ConfigDto guardarConfig(@Valid @RequestBody ConfigRequest req, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return adminService.guardarConfiguracion(me, req);
    }

    @Operation(summary = "Restablecer los datos de demostración [ADMIN]", description = "Borra todo y vuelve a cargar la demo.")
    @PostMapping("/admin/restablecer")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void restablecer(@Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        datosDemo.restablecer();
        auditoria.actividad("Datos de demostración restablecidos", "", me.id());
    }
}
