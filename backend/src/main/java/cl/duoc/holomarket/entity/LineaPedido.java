package cl.duoc.holomarket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Una carta dentro de un pedido, con el precio que se pagó. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class LineaPedido {

    @Column(name = "pub_id", nullable = false, length = 10)
    private String pubId;

    @Column(nullable = false, length = 80)
    private String nombre;

    @Column(nullable = false, length = 10)
    private String juego;

    @Column(nullable = false, length = 80)
    private String edicion;

    @Column(length = 20)
    private String numero;

    @Column(nullable = false, length = 2)
    private String condicion;

    @Column(nullable = false, length = 4)
    private String idioma;

    @Column(nullable = false)
    private Integer precio;

    @Column(nullable = false)
    private Integer cantidad;
}
