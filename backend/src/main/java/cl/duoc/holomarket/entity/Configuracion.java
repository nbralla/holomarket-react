package cl.duoc.holomarket.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Parámetros del negocio que cambia el administrador (una sola fila, id = 1),
 * más los contadores de los ids correlativos (U04, P026, HM-1023...).
 */
@Entity
@Table(name = "configuracion")
@Getter
@Setter
@NoArgsConstructor
public class Configuracion {

    public static final int ID = 1;

    @Id
    private Integer id = ID;

    /** % que cobra HoloMarket al vendedor por cada venta. */
    @Column(nullable = false)
    private Integer comision;

    @Column(nullable = false)
    private Integer iva;

    @Column(nullable = false)
    private Integer envioMismaRegion;

    @Column(nullable = false)
    private Integer envioOtraRegion;

    @Column(nullable = false)
    private Integer stockBajo;

    @Column(nullable = false)
    private Integer sesionMinutos;

    @Column(nullable = false)
    private Integer retiroMinimo;

    /** Pesos por dólar de respaldo, si las APIs del dólar no responden. */
    @Column(nullable = false)
    private Integer dolar;

    @Column(nullable = false)
    private Integer secUsuario = 0;

    @Column(nullable = false)
    private Integer secPublicacion = 0;

    @Column(nullable = false)
    private Integer secPedido = 1000;

    @Column(nullable = false)
    private Integer secMovimiento = 0;

    @Column(nullable = false)
    private Integer secActividad = 0;

    @Column(nullable = false)
    private Integer secRetiro = 0;
}
