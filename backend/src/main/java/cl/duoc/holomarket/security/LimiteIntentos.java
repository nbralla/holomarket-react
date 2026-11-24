package cl.duoc.holomarket.security;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Frena la fuerza bruta en el login: después de 3 contraseñas incorrectas seguidas,
 * el correo queda bloqueado 30 segundos. Vive en memoria (se reinicia con la API).
 */
@Component
public class LimiteIntentos {

    public static final int INTENTOS_MAXIMOS = 3;
    public static final int SEGUNDOS_BLOQUEO = 30;

    private record Registro(int fallos, long hasta) {
    }

    private final Map<String, Registro> registros = new ConcurrentHashMap<>();

    /** Segundos que faltan para poder volver a intentar (0 = puede intentar). */
    public long segundosRestantes(String email) {
        Registro r = registros.get(email);
        long restante = r == null ? 0 : r.hasta() - System.currentTimeMillis();
        return restante > 0 ? (restante + 999) / 1000 : 0;
    }

    /** Registra un fallo y devuelve true si con este fallo la cuenta quedó bloqueada. */
    public boolean registrarFallo(String email) {
        Registro r = registros.getOrDefault(email, new Registro(0, 0));
        int fallos = r.fallos() + 1;
        if (fallos >= INTENTOS_MAXIMOS) {
            registros.put(email, new Registro(0, System.currentTimeMillis() + SEGUNDOS_BLOQUEO * 1000L));
            return true;
        }
        registros.put(email, new Registro(fallos, 0));
        return false;
    }

    public void limpiar(String email) {
        registros.remove(email);
    }
}
