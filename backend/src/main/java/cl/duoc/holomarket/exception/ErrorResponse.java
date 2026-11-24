package cl.duoc.holomarket.exception;

import com.fasterxml.jackson.annotation.JsonInclude;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.Map;

@Schema(description = "Formato estándar de error de la API")
@JsonInclude(JsonInclude.Include.NON_NULL)
public record ErrorResponse(
        @Schema(description = "Código HTTP", example = "400") int status,
        @Schema(description = "Mensaje legible", example = "Datos inválidos") String message,
        @Schema(description = "Errores por campo (solo en validaciones)",
                example = "{\"email\": \"debe ser una dirección de correo electrónico con formato correcto\"}")
        Map<String, String> errors) {

    public static ErrorResponse of(int status, String message) {
        return new ErrorResponse(status, message, null);
    }
}
