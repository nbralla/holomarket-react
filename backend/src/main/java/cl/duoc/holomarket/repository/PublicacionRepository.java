package cl.duoc.holomarket.repository;

import cl.duoc.holomarket.entity.Publicacion;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface PublicacionRepository extends JpaRepository<Publicacion, String> {

    /** SELECT ... FOR UPDATE: bloquea la fila para que dos compras simultáneas no dejen stock negativo. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select p from Publicacion p where p.id = :id")
    Optional<Publicacion> findByIdForUpdate(@Param("id") String id);
}
