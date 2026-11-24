package cl.duoc.holomarket.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Datos de entrega de un pedido: despacho a domicilio o entrega en persona ("retiro"). */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class Envio {

    @Column(name = "envio_metodo", nullable = false, length = 10)
    private String metodo;

    @Column(name = "envio_costo", nullable = false)
    private Integer costo;

    @Column(name = "envio_receptor", length = 60)
    private String receptor;

    @Column(name = "envio_telefono", length = 20)
    private String telefono;

    @Column(name = "envio_region", length = 60)
    private String region;

    @Column(name = "envio_comuna", length = 60)
    private String comuna;

    @Column(name = "envio_direccion", length = 120)
    private String direccion;
}
