package cl.duoc.holomarket.repository;

import cl.duoc.holomarket.entity.Retiro;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RetiroRepository extends JpaRepository<Retiro, String> {
    List<Retiro> findByUsuario_Id(String usuarioId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Retiro r where r.id = :id")
    Optional<Retiro> findByIdForUpdate(@Param("id") String id);
}
