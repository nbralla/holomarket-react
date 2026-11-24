package cl.duoc.holomarket.repository;

import cl.duoc.holomarket.entity.Pedido;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PedidoRepository extends JpaRepository<Pedido, String> {
    List<Pedido> findByVendedor_Id(String vendedorId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select o from Pedido o where o.id = :id")
    Optional<Pedido> findByIdForUpdate(@Param("id") String id);
}
