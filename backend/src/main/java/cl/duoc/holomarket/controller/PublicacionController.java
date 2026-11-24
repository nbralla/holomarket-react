package cl.duoc.holomarket.controller;

import cl.duoc.holomarket.dto.EstadoDtos.PublicacionDto;
import cl.duoc.holomarket.dto.SolicitudDtos.AjusteStockRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.EstadoRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.PrecioRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.PublicacionRequest;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.service.PublicacionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Publicaciones")
@RestController
@RequestMapping("/api/publicaciones")
@RequiredArgsConstructor
public class PublicacionController {

    private final PublicacionService publicacionService;

    @Operation(summary = "Publicar una carta", description = "Crea la publicación del usuario del token y registra el alta en el kardex.")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Publicación creada"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos (precio, stock, oferta...)")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public PublicacionDto crear(@Valid @RequestBody PublicacionRequest req, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return publicacionService.crear(me, req);
    }

    @Operation(summary = "Editar una publicación propia", description = "Si cambia el stock, el ajuste queda en el kardex.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Publicación actualizada"),
            @ApiResponse(responseCode = "403", description = "No es tu publicación")
    })
    @PutMapping("/{id}")
    public PublicacionDto editar(@PathVariable String id, @Valid @RequestBody PublicacionRequest req,
                                 @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return publicacionService.editar(me, id, req);
    }

    @Operation(summary = "Ajustar stock", description = "Entrada o salida manual con motivo. No se puede restar más de lo disponible ni pasar de 999.")
    @PostMapping("/{id}/stock")
    public PublicacionDto ajustarStock(@PathVariable String id, @Valid @RequestBody AjusteStockRequest req,
                                       @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return publicacionService.ajustarStock(me, id, req);
    }

    @Operation(summary = "Cambiar precio")
    @PutMapping("/{id}/precio")
    public PublicacionDto cambiarPrecio(@PathVariable String id, @Valid @RequestBody PrecioRequest req,
                                        @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return publicacionService.cambiarPrecio(me, id, req.precio());
    }

    @Operation(summary = "Pausar o activar", description = "El dueño o el administrador (moderación). Estados: activa, pausada.")
    @PutMapping("/{id}/estado")
    public PublicacionDto cambiarEstado(@PathVariable String id, @Valid @RequestBody EstadoRequest req,
                                        @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return publicacionService.cambiarEstado(me, id, req.estado());
    }

    @Operation(summary = "Eliminar", description = "Baja lógica: queda con stock 0 y estado eliminada. El dueño o el administrador.")
    @ApiResponse(responseCode = "204", description = "Eliminada")
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable String id, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        publicacionService.eliminar(me, id);
    }
}
