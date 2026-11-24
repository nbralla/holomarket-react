package cl.duoc.holomarket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Cuenta donde el vendedor recibe sus retiros. El número completo nunca sale de la API a otros usuarios. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class CuentaBancaria {

    @Column(name = "cuenta_banco", length = 60)
    private String banco;

    @Column(name = "cuenta_tipo", length = 40)
    private String tipo;

    @Column(name = "cuenta_numero", length = 20)
    private String numero;

    @Column(name = "cuenta_actualizada")
    private Long actualizada;
}
