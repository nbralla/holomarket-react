package cl.duoc.holomarket.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

import java.util.Map;

/** Excepción de negocio con el código HTTP que debe devolverse. */
@Getter
public class ApiException extends RuntimeException {

    private final HttpStatus status;
    /** Datos extra para el front (por ejemplo, el motivo de un pago rechazado). */
    private final Map<String, String> errors;

    public ApiException(HttpStatus status, String message) {
        this(status, message, null);
    }

    public ApiException(HttpStatus status, String message, Map<String, String> errors) {
        super(message);
        this.status = status;
        this.errors = errors;
    }

    public static ApiException notFound(String message) {
        return new ApiException(HttpStatus.NOT_FOUND, message);
    }

    public static ApiException badRequest(String message) {
        return new ApiException(HttpStatus.BAD_REQUEST, message);
    }

    public static ApiException conflict(String message) {
        return new ApiException(HttpStatus.CONFLICT, message);
    }

    public static ApiException unauthorized(String message) {
        return new ApiException(HttpStatus.UNAUTHORIZED, message);
    }

    public static ApiException forbidden(String message) {
        return new ApiException(HttpStatus.FORBIDDEN, message);
    }
}
