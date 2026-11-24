package cl.duoc.holomarket.controller;

import cl.duoc.holomarket.dto.EstadoDtos.RetiroDto;
import cl.duoc.holomarket.dto.SolicitudDtos.ComprobanteRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.CuentaRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.MotivoRequest;
import cl.duoc.holomarket.dto.SolicitudDtos.RetiroRequest;
import cl.duoc.holomarket.security.AuthUser;
import cl.duoc.holomarket.service.RetiroService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "Retiros")
@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class RetiroController {

    private final RetiroService retiroService;

    @Operation(summary = "Guardar mi cuenta bancaria", description = "Cuenta a nombre del vendedor donde recibe sus retiros.")
    @PutMapping("/usuarios/yo/cuenta")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void guardarCuenta(@Valid @RequestBody CuentaRequest req, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        retiroService.guardarCuenta(me, req.banco(), req.tipo(), req.numero());
    }

    @Operation(summary = "Solicitar un retiro", description = "Entre el mínimo configurado y el saldo disponible (ventas entregadas − retiros).")
    @PostMapping("/retiros")
    @ResponseStatus(HttpStatus.CREATED)
    public RetiroDto solicitar(@Valid @RequestBody RetiroRequest req, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return retiroService.solicitar(me, req.monto());
    }

    @Operation(summary = "Anular mi solicitud", description = "Solo mientras está en proceso; el monto vuelve al saldo.")
    @PostMapping("/retiros/{id}/anular")
    public RetiroDto anular(@PathVariable String id, @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return retiroService.anular(me, id);
    }

    @Operation(summary = "Marcar como transferido [ADMIN]")
    @PostMapping("/retiros/{id}/transferir")
    public RetiroDto transferir(@PathVariable String id, @Valid @RequestBody ComprobanteRequest req,
                                @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return retiroService.transferir(me, id, req.comprobante());
    }

    @Operation(summary = "Rechazar [ADMIN]", description = "El monto vuelve al saldo del vendedor.")
    @PostMapping("/retiros/{id}/rechazar")
    public RetiroDto rechazar(@PathVariable String id, @Valid @RequestBody MotivoRequest req,
                              @Parameter(hidden = true) @AuthenticationPrincipal AuthUser me) {
        return retiroService.rechazar(me, id, req.motivo());
    }
}
