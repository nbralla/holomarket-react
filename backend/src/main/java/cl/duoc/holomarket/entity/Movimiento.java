package cl.duoc.holomarket.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Kardex: cada cambio de stock queda registrado con su tipo, cantidad, stock antes y después.
 * Guarda los ids como texto (no relaciones) porque es un historial: debe sobrevivir aunque
 * la publicación se elimine.
 */
@Entity
@Table(name = "movimientos", indexes = @Index(columnList = "vendedor_id"))
@Getter
@Setter
@NoArgsConstructor
public class Movimiento {

    @Id
    @Column(length = 10)
    private String id;

    @Column(nullable = false)
    private Long fecha;

    @Column(name = "pub_id", nullable = false, length = 10)
    private String pubId;

    @Column(nullable = false, length = 80)
    private String carta;

    @Column(nullable = false, length = 10)
    private String juego;

    @Column(name = "vendedor_id", nullable = false, length = 10)
    private String vendedorId;

    /** alta, venta, cancelacion, entrada, salida, edicion o baja */
    @Column(nullable = false, length = 12)
    private String tipo;

    /** Positiva = entra stock, negativa = sale. */
    @Column(nullable = false)
    private Integer cantidad;

    @Column(nullable = false)
    private Integer antes;

    @Column(nullable = false)
    private Integer despues;

    /** Pedido o motivo del movimiento. */
    @Column(name = "referencia", length = 120)
    private String ref = "";

    /** Quién lo hizo. */
    @Column(length = 10)
    private String uid;
}
