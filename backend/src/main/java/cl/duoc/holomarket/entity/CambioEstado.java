package cl.duoc.holomarket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Un paso del seguimiento de un pedido o de un retiro (estado y fecha). */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CambioEstado {

    @Column(nullable = false, length = 12)
    private String estado;

    @Column(nullable = false)
    private Long fecha;
}
