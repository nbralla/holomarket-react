package cl.duoc.holomarket.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/**
 * Compra a UN vendedor. Una compra con cartas de varios vendedores genera un pedido por cada uno.
 * Los montos se calculan siempre en el servidor con los precios de la base de datos.
 */
@Entity
@Table(name = "pedidos")
@Getter
@Setter
@NoArgsConstructor
public class Pedido {

    public static final String PAGADO = "pagado";
    public static final String ENVIADO = "enviado";
    public static final String ENTREGADO = "entregado";
    public static final String CANCELADO = "cancelado";

    @Id
    @Column(length = 12)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "comprador_id")
    private Usuario comprador;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendedor_id")
    private Usuario vendedor;

    @Column(nullable = false)
    private Long fecha;

    /** Copia de cada carta al momento de comprar: si después cambia el precio, el pedido no cambia. */
    @ElementCollection
    @CollectionTable(name = "pedido_items", joinColumns = @JoinColumn(name = "pedido_id"))
    @OrderColumn(name = "posicion")
    private List<LineaPedido> items = new ArrayList<>();

    @Column(nullable = false)
    private Integer subtotal;

    @Embedded
    private Envio envio;

    @Column(nullable = false)
    private Integer total;

    @Column(nullable = false)
    private Integer comisionPct;

    @Column(nullable = false)
    private Integer comision;

    @Column(nullable = false)
    private Integer ivaComision;

    @Column(nullable = false)
    private Integer netoVendedor;

    @Embedded
    private Pago pago;

    @Column(nullable = false, length = 10)
    private String estado = PAGADO;

    @ElementCollection
    @CollectionTable(name = "pedido_historial", joinColumns = @JoinColumn(name = "pedido_id"))
    @OrderColumn(name = "posicion")
    private List<CambioEstado> historial = new ArrayList<>();

    @Column(length = 40)
    private String seguimiento = "";

    public void cambiarEstado(String nuevo, long momento) {
        this.estado = nuevo;
        this.historial.add(new CambioEstado(nuevo, momento));
    }
}
