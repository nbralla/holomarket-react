package cl.duoc.holomarket.controller;

import cl.duoc.holomarket.dto.EstadoDtos.PedidoDto;
import cl.duoc.holomarket.dto.SolicitudDtos.CompraRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.SeguimientoRequest;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.service.PedidoService;
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

import java.util.List;

@Tag(name = "Pedidos")
@RestController
@RequestMapping("/api/pedidos")
@RequiredArgsConstructor
public class PedidoController {

    private final PedidoService pedidoService;

    @Operation(summary = "Pagar el carrito",
            description = """
                    Crea un pedido por vendedor en UNA transacción: valida el stock (bloqueando las filas), \
                    lo descuenta y calcula montos, envío y comisión con los datos de la base. Tarjetas de prueba: \
                    4111 1111 1111 1111 aprobada; 4000 0000 0000 0002 y 4000 0000 0000 9995 rechazadas.""")
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Pedidos creados"),
            @ApiResponse(responseCode = "400", description = "Datos inválidos o tarjeta mal escrita"),
            @ApiResponse(responseCode = "402", description = "El banco rechazó el pago (errors.motivo = rechazada | fondos)"),
            @ApiResponse(responseCode = "409", description = "El stock cambió: no se cobró nada")
    })
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public List<PedidoDto> comprar(@Valid @RequestBody CompraRequest req, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return pedidoService.comprar(me, req);
    }

    @Operation(summary = "Marcar como enviado (vendedor)")
    @PostMapping("/{id}/enviar")
    public PedidoDto enviar(@PathVariable String id, @Valid @RequestBody(required = false) SeguimientoRequest req,
                            @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return pedidoService.marcarEnviado(me, id, req == null ? "" : req.seguimiento());
    }

    @Operation(summary = "Confirmar recepción (comprador)", description = "Libera el dinero de la venta para el vendedor.")
    @PostMapping("/{id}/recibir")
    public PedidoDto recibir(@PathVariable String id, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return pedidoService.confirmarRecepcion(me, id);
    }

    @Operation(summary = "Cancelar (comprador)", description = "Solo mientras el pedido está pagado. Devuelve las unidades al stock.")
    @PostMapping("/{id}/cancelar")
    public PedidoDto cancelar(@PathVariable String id, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return pedidoService.cancelar(me, id);
    }
}
