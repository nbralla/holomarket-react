package cl.duoc.holomarket.repository;

import cl.duoc.holomarket.entity.Configuracion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;

public interface ConfiguracionRepository extends JpaRepository<Configuracion, Integer> {

    /** Bloquea la fila mientras se toma el siguiente id correlativo: dos compras nunca reciben el mismo HM-xxxx. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Configuracion c where c.id = 1")
    Optional<Configuracion> findForUpdate();
}
