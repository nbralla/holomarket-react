package cl.duoc.holomarket.repository;

import cl.duoc.holomarket.entity.Actividad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ActividadRepository extends JpaRepository<Actividad, String> {
    List<Actividad> findAllByOrderByFechaAsc();
}
