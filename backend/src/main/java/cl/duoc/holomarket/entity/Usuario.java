package cl.duoc.holomarket.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Cuenta de HoloMarket. Los ids son correlativos legibles (U00, U01...) igual que en el front.
 * La contraseña se guarda SOLO como hash BCrypt.
 */
@Entity
@Table(name = "usuarios")
@Getter
@Setter
@NoArgsConstructor
public class Usuario {

    public static final String ADMIN = "admin";
    public static final String CLIENTE = "cliente";
    public static final String ACTIVO = "activo";
    public static final String BLOQUEADO = "bloqueado";

    @Id
    @Column(length = 10)
    private String id;

    @Column(nullable = false, unique = true, length = 12)
    private String rut;

    @Column(nullable = false, length = 60)
    private String nombre;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false, length = 100)
    private String passwordHash;

    /** "admin" o "cliente" */
    @Column(nullable = false, length = 10)
    private String rol;

    @Column(nullable = false, length = 60)
    private String region;

    @Column(nullable = false, length = 60)
    private String comuna;

    @Column(length = 20)
    private String telefono = "";

    @Column(length = 120)
    private String direccion = "";

    /** "activo" o "bloqueado": un usuario bloqueado no puede ingresar y sus publicaciones se ocultan. */
    @Column(nullable = false, length = 10)
    private String estado = ACTIVO;

    /** Fechas en milisegundos desde 1970 (como Date.now() en el front). */
    @Column(nullable = false)
    private Long creado;

    /** Fecha en que aceptó términos y privacidad (Ley 19.628 / 21.719). */
    private Long consentimiento;

    /** Si los cuatro campos quedan vacíos, JPA lo devuelve como null (sin cuenta registrada). */
    @Embedded
    private CuentaBancaria cuenta;

    public boolean esAdmin() {
        return ADMIN.equals(rol);
    }

    public boolean activo() {
        return ACTIVO.equals(estado);
    }
}
