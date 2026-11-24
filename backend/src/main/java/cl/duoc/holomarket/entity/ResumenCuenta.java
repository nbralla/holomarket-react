package cl.duoc.holomarket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cuenta de destino de un retiro, enmascarada (solo los últimos 4 dígitos). */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class ResumenCuenta {

    @Column(name = "cuenta_banco", length = 60)
    private String banco;

    @Column(name = "cuenta_tipo", length = 40)
    private String tipo;

    @Column(name = "cuenta_ultimos", length = 4)
    private String ultimos;

    @Column(name = "cuenta_titular", length = 60)
    private String titular;

    @Column(name = "cuenta_rut", length = 12)
    private String rut;
}
