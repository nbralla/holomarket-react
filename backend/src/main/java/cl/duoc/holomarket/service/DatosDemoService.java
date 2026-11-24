package cl.duoc.holomarket.service;

import cl.duoc.holomarket.entity.*;
import cl.duoc.holomarket.repository.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.persistence.EntityManager;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

/**
 * Carga los datos de demostración (resources/datos-demo.json): 4 cuentas, 25 publicaciones,
 * 22 pedidos con su historial, retiros, kardex y auditoría. Es el mismo conjunto que usaba el front.
 * Las fechas se corren para que el pedido más reciente quede "de hoy", y las contraseñas salen
 * de ADMIN_PASSWORD y DEMO_USER_PASSWORD (nunca del archivo).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class DatosDemoService {

    /** Momento de referencia con que se generaron los datos (ver frontend: crearEstadoInicial). */
    private static final long BASE = Instant.parse("2026-11-20T15:00:00Z").toEpochMilli();

    private final UsuarioRepository usuarioRepository;
    private final PublicacionRepository publicacionRepository;
    private final PedidoRepository pedidoRepository;
    private final MovimientoRepository movimientoRepository;
    private final ActividadRepository actividadRepository;
    private final RetiroRepository retiroRepository;
    private final ConfiguracionRepository configuracionRepository;
    private final PasswordEncoder passwordEncoder;
    private final ObjectMapper objectMapper;
    private final EntityManager entityManager;

    @Value("${app.seed.admin-password}")
    private String adminPassword;

    @Value("${app.seed.user-password}")
    private String userPassword;

    public boolean hayDatos() {
        return configuracionRepository.existsById(Configuracion.ID);
    }

    /** Borra todo y vuelve a cargar la demostración (Administración › Restablecer datos). */
    @Transactional
    public void restablecer() {
        // Retiros y pedidos con deleteAll (uno a uno) para que JPA borre también sus colecciones
        // (historial e ítems). flush() los ejecuta YA: si no, Hibernate insertaría los datos nuevos
        // antes de borrar los viejos y chocarían los ids.
        retiroRepository.deleteAll();
        pedidoRepository.deleteAll();
        pedidoRepository.flush();
        publicacionRepository.deleteAllInBatch();
        movimientoRepository.deleteAllInBatch();
        actividadRepository.deleteAllInBatch();
        usuarioRepository.deleteAllInBatch();
        configuracionRepository.deleteAllInBatch();
        // Los borrados "en bloque" van directo a MySQL: se vacía la memoria de JPA para que no
        // queden copias de los registros viejos (con los mismos ids que los nuevos).
        entityManager.clear();
        cargar();
    }

    @Transactional
    public void cargar() {
        JsonNode raiz = leerArchivo();
        correrFechas(raiz, System.currentTimeMillis() - BASE);

        JsonNode cfg = raiz.get("config");
        JsonNode sec = cfg.get("secuencias");
        Configuracion c = new Configuracion();
        c.setComision(cfg.get("comision").asInt());
        c.setIva(cfg.get("iva").asInt());
        c.setEnvioMismaRegion(cfg.get("envioMismaRegion").asInt());
        c.setEnvioOtraRegion(cfg.get("envioOtraRegion").asInt());
        c.setStockBajo(cfg.get("stockBajo").asInt());
        c.setSesionMinutos(cfg.get("sesionMinutos").asInt());
        c.setRetiroMinimo(cfg.get("retiroMinimo").asInt());
        c.setDolar(cfg.get("dolar").asInt());
        c.setSecUsuario(sec.get("usuario").asInt());
        c.setSecPublicacion(sec.get("publicacion").asInt());
        c.setSecPedido(sec.get("pedido").asInt());
        c.setSecMovimiento(sec.get("movimiento").asInt());
        c.setSecActividad(sec.get("actividad").asInt());
        c.setSecRetiro(sec.get("retiro").asInt());
        configuracionRepository.save(c);

        // BCrypt es lento a propósito: se calcula una vez por contraseña, no una vez por usuario.
        String hashAdmin = passwordEncoder.encode(adminPassword);
        String hashCliente = passwordEncoder.encode(userPassword);
        Map<String, Usuario> usuarios = new HashMap<>();
        for (JsonNode n : raiz.get("usuarios")) {
            Usuario u = new Usuario();
            u.setId(texto(n, "id"));
            u.setRut(texto(n, "rut"));
            u.setNombre(texto(n, "nombre"));
            u.setEmail(texto(n, "email"));
            u.setRol(texto(n, "rol"));
            u.setPasswordHash(u.esAdmin() ? hashAdmin : hashCliente);
            u.setRegion(texto(n, "region"));
            u.setComuna(texto(n, "comuna"));
            u.setTelefono(texto(n, "telefono"));
            u.setDireccion(texto(n, "direccion"));
            u.setEstado(texto(n, "estado"));
            u.setCreado(n.get("creado").asLong());
            u.setConsentimiento(n.hasNonNull("consentimiento") ? n.get("consentimiento").asLong() : null);
            JsonNode cu = n.get("cuenta");
            if (cu != null && !cu.isNull()) {
                u.setCuenta(new CuentaBancaria(texto(cu, "banco"), texto(cu, "tipo"), texto(cu, "numero"), cu.get("actualizada").asLong()));
            }
            usuarios.put(u.getId(), usuarioRepository.save(u));
        }

        for (JsonNode n : raiz.get("publicaciones")) {
            Publicacion p = new Publicacion();
            p.setId(texto(n, "id"));
            p.setVendedor(usuarios.get(texto(n, "vendedorId")));
            p.setJuego(texto(n, "juego"));
            p.setNombre(texto(n, "nombre"));
            p.setEdicion(texto(n, "edicion"));
            p.setNumero(texto(n, "numero"));
            p.setRareza(texto(n, "rareza"));
            p.setAcabado(texto(n, "acabado"));
            p.setIdioma(texto(n, "idioma"));
            p.setCondicion(texto(n, "condicion"));
            p.setPrecio(n.get("precio").asInt());
            p.setPrecioAnterior(n.hasNonNull("precioAnterior") ? n.get("precioAnterior").asInt() : null);
            p.setStock(n.get("stock").asInt());
            p.setEstado(texto(n, "estado"));
            p.setDescripcion(texto(n, "descripcion"));
            p.setImagen(n.hasNonNull("imagen") ? texto(n, "imagen") : null);
            p.setImagenApi(n.hasNonNull("imagenApi") ? texto(n, "imagenApi") : null);
            p.setCreado(n.get("creado").asLong());
            p.setActualizado(n.get("actualizado").asLong());
            publicacionRepository.save(p);
        }

        for (JsonNode n : raiz.get("pedidos")) {
            Pedido o = new Pedido();
            o.setId(texto(n, "id"));
            o.setComprador(usuarios.get(texto(n, "compradorId")));
            o.setVendedor(usuarios.get(texto(n, "vendedorId")));
            o.setFecha(n.get("fecha").asLong());
            for (JsonNode it : n.get("items")) {
                o.getItems().add(new LineaPedido(texto(it, "pubId"), texto(it, "nombre"), texto(it, "juego"), texto(it, "edicion"),
                        texto(it, "numero"), texto(it, "condicion"), texto(it, "idioma"), it.get("precio").asInt(), it.get("cantidad").asInt()));
            }
            o.setSubtotal(n.get("subtotal").asInt());
            JsonNode e = n.get("envio");
            o.setEnvio(new Envio(texto(e, "metodo"), e.get("costo").asInt(), texto(e, "receptor"), texto(e, "telefono"),
                    texto(e, "region"), texto(e, "comuna"), texto(e, "direccion")));
            o.setTotal(n.get("total").asInt());
            o.setComisionPct(n.get("comisionPct").asInt());
            o.setComision(n.get("comision").asInt());
            o.setIvaComision(n.get("ivaComision").asInt());
            o.setNetoVendedor(n.get("netoVendedor").asInt());
            o.setPago(new Pago(texto(n.get("pago"), "metodo"), texto(n.get("pago"), "detalle")));
            o.setEstado(texto(n, "estado"));
            for (JsonNode h : n.get("historial")) o.getHistorial().add(new CambioEstado(texto(h, "estado"), h.get("fecha").asLong()));
            o.setSeguimiento(texto(n, "seguimiento"));
            pedidoRepository.save(o);
        }

        for (JsonNode n : raiz.get("retiros")) {
            Retiro r = new Retiro();
            r.setId(texto(n, "id"));
            r.setUsuario(usuarios.get(texto(n, "uid")));
            r.setMonto(n.get("monto").asInt());
            JsonNode cu = n.get("cuenta");
            r.setCuenta(new ResumenCuenta(texto(cu, "banco"), texto(cu, "tipo"), texto(cu, "ultimos"), texto(cu, "titular"), texto(cu, "rut")));
            r.setEstado(texto(n, "estado"));
            r.setFecha(n.get("fecha").asLong());
            for (JsonNode h : n.get("historial")) r.getHistorial().add(new CambioEstado(texto(h, "estado"), h.get("fecha").asLong()));
            r.setComprobante(texto(n, "comprobante"));
            r.setMotivo(texto(n, "motivo"));
            retiroRepository.save(r);
        }

        for (JsonNode n : raiz.get("movimientos")) {
            Movimiento m = new Movimiento();
            m.setId(texto(n, "id"));
            m.setFecha(n.get("fecha").asLong());
            m.setPubId(texto(n, "pubId"));
            m.setCarta(texto(n, "carta"));
            m.setJuego(texto(n, "juego"));
            m.setVendedorId(texto(n, "vendedorId"));
            m.setTipo(texto(n, "tipo"));
            m.setCantidad(n.get("cantidad").asInt());
            m.setAntes(n.get("antes").asInt());
            m.setDespues(n.get("despues").asInt());
            m.setRef(texto(n, "ref"));
            m.setUid(n.hasNonNull("uid") ? texto(n, "uid") : null);
            movimientoRepository.save(m);
        }

        for (JsonNode n : raiz.get("actividad")) {
            Actividad a = new Actividad();
            a.setId(texto(n, "id"));
            a.setFecha(n.get("fecha").asLong());
            a.setUid(n.hasNonNull("uid") ? texto(n, "uid") : null);
            a.setAccion(texto(n, "accion"));
            a.setDetalle(texto(n, "detalle"));
            actividadRepository.save(a);
        }
        log.info("Datos de demostración cargados: {} usuarios, {} publicaciones, {} pedidos",
                usuarios.size(), raiz.get("publicaciones").size(), raiz.get("pedidos").size());
    }

    private JsonNode leerArchivo() {
        try (InputStream in = new ClassPathResource("datos-demo.json").getInputStream()) {
            return objectMapper.readTree(in);
        } catch (IOException e) {
            throw new IllegalStateException("No se pudo leer datos-demo.json", e);
        }
    }

    /** Suma "delta" a todas las fechas (números de 13 dígitos en ms) del archivo. */
    private static void correrFechas(JsonNode nodo, long delta) {
        if (nodo.isObject()) {
            ObjectNode obj = (ObjectNode) nodo;
            Iterator<Map.Entry<String, JsonNode>> campos = obj.fields();
            while (campos.hasNext()) {
                Map.Entry<String, JsonNode> c = campos.next();
                if (c.getValue().isNumber() && c.getValue().asLong() > 1_000_000_000_000L) {
                    obj.put(c.getKey(), c.getValue().asLong() + delta);
                } else {
                    correrFechas(c.getValue(), delta);
                }
            }
        } else if (nodo.isArray()) {
            nodo.forEach(hijo -> correrFechas(hijo, delta));
        }
    }

    private static String texto(JsonNode n, String campo) {
        JsonNode v = n.get(campo);
        return v == null || v.isNull() ? "" : v.asText();
    }
}
