package cl.duoc.holomarket.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Carta que un vendedor ofrece, con su precio, condición y stock. */
@Entity
@Table(name = "publicaciones")
@Getter
@Setter
@NoArgsConstructor
public class Publicacion {

    public static final String ACTIVA = "activa";
    public static final String PAUSADA = "pausada";
    public static final String ELIMINADA = "eliminada";
    public static final int STOCK_MAXIMO = 999;

    @Id
    @Column(length = 10)
    private String id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "vendedor_id")
    private Usuario vendedor;

    /** pokemon, magic, yugioh, onepiece o myl */
    @Column(nullable = false, length = 10)
    private String juego;

    @Column(nullable = false, length = 80)
    private String nombre;

    @Column(nullable = false, length = 80)
    private String edicion;

    @Column(length = 20)
    private String numero = "";

    @Column(nullable = false, length = 40)
    private String rareza;

    @Column(nullable = false, length = 30)
    private String acabado;

    @Column(nullable = false, length = 4)
    private String idioma;

    /** MT, NM, EX, GD, LP, PL o PO */
    @Column(nullable = false, length = 2)
    private String condicion;

    @Column(nullable = false)
    private Integer precio;

    /** Precio antes de la oferta. null = sin oferta. */
    private Integer precioAnterior;

    @Column(nullable = false)
    private Integer stock;

    @Column(nullable = false, length = 10)
    private String estado = ACTIVA;

    @Column(length = 300)
    private String descripcion = "";

    /** Foto subida por el vendedor (data URL JPEG reducida en el navegador). */
    @Lob
    @Column(columnDefinition = "LONGTEXT")
    private String imagen;

    /** Imagen elegida desde API TCG al publicar. */
    @Column(length = 500)
    private String imagenApi;

    @Column(nullable = false)
    private Long creado;

    @Column(nullable = false)
    private Long actualizado;

    public boolean eliminada() {
        return ELIMINADA.equals(estado);
    }
}
