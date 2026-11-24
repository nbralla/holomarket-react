package cl.duoc.holomarket.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.ArrayList;
import java.util.List;

/** Solicitud de un vendedor para transferir su saldo a su cuenta bancaria. */
@Entity
@Table(name = "retiros")
@Getter
@Setter
@NoArgsConstructor
public class Retiro {

    public static final String SOLICITADO = "solicitado";
    public static final String PAGADO = "pagado";
    public static final String RECHAZADO = "rechazado";
    public static final String ANULADO = "anulado";

    @Id
    @Column(length = 10)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "usuario_id")
    private Usuario usuario;

    @Column(nullable = false)
    private Integer monto;

    /** Copia de la cuenta al momento de pedir el retiro, solo con los últimos 4 dígitos. */
    @Embedded
    private ResumenCuenta cuenta;

    @Column(nullable = false, length = 12)
    private String estado = SOLICITADO;

    @Column(nullable = false)
    private Long fecha;

    @ElementCollection
    @CollectionTable(name = "retiro_historial", joinColumns = @JoinColumn(name = "retiro_id"))
    @OrderColumn(name = "posicion")
    private List<CambioEstado> historial = new ArrayList<>();

    @Column(length = 40)
    private String comprobante = "";

    @Column(length = 200)
    private String motivo = "";

    public void cambiarEstado(String nuevo, long momento) {
        this.estado = nuevo;
        this.historial.add(new CambioEstado(nuevo, momento));
    }
}
