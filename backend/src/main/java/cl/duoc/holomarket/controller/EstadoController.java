package cl.duoc.holomarket.controller;

import cl.duoc.holomarket.dto.EstadoDtos.EstadoDto;
import cl.duoc.holomarket.dto.SolicitudDtos.ActividadRequest;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.service.AuditoriaService;
import cl.duoc.holomarket.service.EstadoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Tienda")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class EstadoController {

    private final EstadoService estadoService;
    private final AuditoriaService auditoria;

    @Operation(summary = "Datos de la tienda",
            description = """
                    Todo lo que el usuario puede ver en una sola respuesta, con la misma forma que usa el front: \
                    catálogo, vendedores, pedidos, kardex, retiros y configuración. Sin token responde la vista \
                    pública; con token agrega los datos propios; el administrador ve todo.""")
    @SecurityRequirements
    @GetMapping("/estado")
    public EstadoDto estado(@Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return estadoService.estadoPara(me);
    }

    @Operation(summary = "Registrar una acción en la auditoría",
            description = "Para acciones que ocurren solo en el navegador, como exportar el CSV de movimientos.")
    @PostMapping("/actividad")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void actividad(@Valid @RequestBody ActividadRequest req, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        auditoria.actividad(req.accion(), req.detalle(), me.id());
    }
}
