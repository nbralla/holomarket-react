package cl.duoc.holomarket.dto;

import cl.duoc.holomarket.dto.EstadoDtos.UsuarioDto;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.util.List;

/** Cuerpos (JSON) que recibe la API. Las anotaciones validan antes de llegar a los servicios. */
public final class SolicitudDtos {

    private SolicitudDtos() {
    }

    /* ---------- Auth ---------- */

    public record LoginRequest(
            @Schema(example = "admin@holomarket.cl") @NotBlank(message = "Ingresa tu correo.") @Email(message = "Revisa el formato del correo.") String email,
            @Schema(example = "Admin1234") @NotBlank(message = "Ingresa tu contraseña.") String clave) {
    }

    public record RegistroRequest(
            @NotBlank(message = "Ingresa tu RUT.") String rut,
            @NotBlank(message = "Ingresa tu nombre y apellido.") @Size(min = 3, max = 60) String nombre,
            @NotBlank(message = "Ingresa tu correo.") @Email(message = "Revisa el formato del correo.") @Size(max = 100) String email,
            @Size(max = 20) String telefono,
            @NotBlank(message = "Elige tu región.") String region,
            @NotBlank(message = "Elige tu comuna.") String comuna,
            @NotBlank(message = "Crea una contraseña.") @Size(min = 8, max = 20, message = "Usa entre 8 y 20 caracteres.")
            @Pattern(regexp = "^(?=.*[A-Za-z])(?=.*\\d).+$", message = "Incluye al menos una letra y un número.") String clave,
            @AssertTrue(message = "Debes aceptar los términos y la política de privacidad.") boolean acepta) {
    }

    public record AuthResponse(String token, UsuarioDto usuario) {
    }

    /* ---------- Publicaciones ---------- */

    public record PublicacionRequest(
            @NotBlank @Pattern(regexp = "pokemon|magic|yugioh|onepiece|myl", message = "Juego no válido.") String juego,
            @NotBlank(message = "Ingresa el nombre de la carta.") @Size(max = 80) String nombre,
            @NotBlank(message = "Ingresa la edición.") @Size(max = 80) String edicion,
            @Size(max = 20) String numero,
            @NotBlank(message = "Elige la rareza.") @Size(max = 40) String rareza,
            @NotBlank @Size(max = 30) String acabado,
            @NotBlank @Size(max = 4) String idioma,
            @NotBlank @Pattern(regexp = "MT|NM|EX|GD|LP|PL|PO", message = "Condición no válida.") String condicion,
            @NotNull @Min(value = 100, message = "El precio mínimo es $100.") @Max(value = 50_000_000, message = "Ingresa un precio en pesos, sin puntos.") Integer precio,
            @Max(value = 50_000_000, message = "Ingresa un precio en pesos, sin puntos.") Integer precioAnterior,
            @NotNull @Min(value = 0, message = "El stock no puede ser negativo.") @Max(value = 999, message = "El stock máximo es 999.") Integer stock,
            @Size(max = 300, message = "La descripción admite hasta 300 caracteres.") String descripcion,
            @Schema(description = "Foto como data URL (JPEG reducido). Máximo unos 3 MB.")
            @Size(max = 4_000_000, message = "La foto es demasiado grande.") String imagen,
            @Size(max = 500) String imagenApi,
            @Schema(description = "Solo al editar: true si se cambia (o quita) la foto") boolean cambiaImagen,
            @Schema(description = "Solo al editar: true si se cambia (o quita) la imagen de API TCG") boolean cambiaImagenApi) {
    }

    public record AjusteStockRequest(
            @NotBlank @Pattern(regexp = "entrada|salida", message = "Tipo de ajuste no válido.") String tipo,
            @NotNull @Min(value = 1, message = "Ingresa una cantidad entera mayor que 0.") Integer cantidad,
            @Size(max = 120) String motivo) {
    }

    public record PrecioRequest(
            @NotNull @Min(value = 100, message = "El precio mínimo es $100.") @Max(value = 50_000_000) Integer precio) {
    }

    public record EstadoRequest(@NotBlank String estado) {
    }

    /* ---------- Compra ---------- */

    public record ItemCompra(@NotBlank String pubId, @NotNull @Min(1) @Max(999) Integer cantidad) {
    }

    public record CompraRequest(
            @NotEmpty(message = "Tu carrito está vacío.") @Valid List<ItemCompra> items,
            @NotBlank @Pattern(regexp = "despacho|retiro") String entrega,
            @NotBlank @Pattern(regexp = "tarjeta|transferencia") String pago,
            @NotBlank(message = "Ingresa quién recibe.") @Size(max = 60) String receptor,
            @NotBlank(message = "Ingresa un teléfono de contacto.") @Size(max = 20) String telefono,
            @Size(max = 60) String region,
            @Size(max = 60) String comuna,
            @Size(max = 120) String direccion,
            @Schema(example = "4111 1111 1111 1111") @Size(max = 25) String numeroTarjeta) {
    }

    public record SeguimientoRequest(@Size(max = 40) String seguimiento) {
    }

    /* ---------- Cuenta bancaria y retiros ---------- */

    public record CuentaRequest(
            @NotBlank(message = "Elige el banco.") @Size(max = 60) String banco,
            @NotBlank(message = "Elige el tipo de cuenta.") @Size(max = 40) String tipo,
            @NotBlank @Pattern(regexp = "^[\\d\\s-]{4,25}$", message = "El número de cuenta debe tener entre 4 y 20 dígitos.") String numero) {
    }

    public record RetiroRequest(@NotNull @Min(1) Integer monto) {
    }

    public record ComprobanteRequest(@Size(max = 40) String comprobante) {
    }

    public record MotivoRequest(@NotBlank(message = "Indica el motivo del rechazo.") @Size(max = 200) String motivo) {
    }

    /* ---------- Administración ---------- */

    public record ConfigRequest(
            @NotNull @Min(0) @Max(30) Integer comision,
            @NotNull @Min(0) @Max(30) Integer iva,
            @NotNull @Min(0) @Max(50_000) Integer envioMismaRegion,
            @NotNull @Min(0) @Max(50_000) Integer envioOtraRegion,
            @NotNull @Min(0) @Max(20) Integer stockBajo,
            @NotNull @Min(5) @Max(240) Integer sesionMinutos,
            @NotNull @Min(1000) @Max(100_000) Integer retiroMinimo,
            @NotNull @Min(300) @Max(3000) Integer dolar) {
    }

    public record ActividadRequest(@NotBlank @Size(max = 80) String accion, @Size(max = 500) String detalle) {
    }
}
