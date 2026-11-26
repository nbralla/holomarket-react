package cl.duoc.holomarket.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

/**
 * Proxy de solo lectura hacia API TCG (imágenes y precios de mercado de las cartas).
 * La clave APITCG_KEY se agrega aquí, en el servidor: nunca llega al navegador ni al JavaScript.
 */
@Tag(name = "API TCG")
@RestController
@RequestMapping("/api/tcg")
public class TcgController {

    private static final String PREFIJO = "/api/tcg/";
    /** Solo las consultas que usa el front: así el proxy no sirve para gastar la clave en cualquier cosa. */
    private static final java.util.regex.Pattern PERMITIDAS =
            java.util.regex.Pattern.compile("^api/(products|[a-z-]+/sets|history-prices/[0-9]+)$");

    private final RestClient cliente;
    private final String clave;

    public TcgController(@Value("${app.apitcg.key:}") String clave) {
        this.clave = clave == null ? "" : clave.trim();
        this.cliente = RestClient.create();
    }

    @Operation(summary = "Consultar API TCG", description = "Ej.: GET /api/tcg/api/products?tcg=pokemon&name=charizard. Responde 503 si el servidor no tiene clave.")
    @SecurityRequirements
    @GetMapping("/**")
    public ResponseEntity<byte[]> consultar(HttpServletRequest request) {
        if (clave.isEmpty()) return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        String ruta = request.getRequestURI().substring(request.getContextPath().length() + PREFIJO.length());
        if (!PERMITIDAS.matcher(ruta).matches()) return ResponseEntity.notFound().build();
        String consulta = request.getQueryString() == null ? "" : "?" + request.getQueryString();
        try {
            return cliente.get()
                    .uri(java.net.URI.create("https://api.apitcg.com/" + ruta + consulta))
                    .header("x-api-key", clave)
                    .accept(MediaType.APPLICATION_JSON)
                    .exchange((req, res) -> ResponseEntity.status(res.getStatusCode())
                            .contentType(MediaType.APPLICATION_JSON)
                            .body(res.getBody().readAllBytes()));
        } catch (RestClientException | IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_GATEWAY).build();
        }
    }
}
