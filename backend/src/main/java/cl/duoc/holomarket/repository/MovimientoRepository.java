package cl.duoc.holomarket.repository;

import cl.duoc.holomarket.entity.Movimiento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MovimientoRepository extends JpaRepository<Movimiento, String> {
    List<Movimiento> findAllByOrderByFechaAsc();
}
