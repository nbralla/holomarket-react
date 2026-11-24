package cl.duoc.holomarket.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Registro de auditoría: quién hizo qué y cuándo. Solo lo ve el administrador. */
@Entity
@Table(name = "actividad")
@Getter
@Setter
@NoArgsConstructor
public class Actividad {

    @Id
    @Column(length = 10)
    private String id;

    @Column(nullable = false)
    private Long fecha;

    @Column(length = 10)
    private String uid;

    @Column(nullable = false, length = 80)
    private String accion;

    @Column(length = 1000)
    private String detalle = "";
}
