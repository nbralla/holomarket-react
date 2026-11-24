package cl.duoc.holomarket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Pago simulado. De la tarjeta se guarda solo el texto "tarjeta terminada en 1111". */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Pago {

    @Column(name = "pago_metodo", nullable = false, length = 15)
    private String metodo;

    @Column(name = "pago_detalle", length = 60)
    private String detalle;
}
