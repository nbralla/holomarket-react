package cl.duoc.holomarket.security;

import cl.duoc.holomarket.entity.Usuario;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

@Slf4j
@Service
public class JwtService {

    private final SecretKey key;
    private final long expirationMs;

    public JwtService(@Value("${app.jwt.secret:}") String secret,
                      @Value("${app.jwt.expiration-minutes:120}") long expirationMinutes) {
        if (secret == null || secret.isBlank()) {
            log.warn("JWT_SECRET no configurado: se generó una clave aleatoria. "
                    + "Los tokens se invalidan al reiniciar. Configúralo en producción.");
            this.key = Jwts.SIG.HS256.key().build();
        } else {
            byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
            if (bytes.length < 32) {
                throw new IllegalStateException("JWT_SECRET debe tener al menos 32 caracteres");
            }
            this.key = Keys.hmacShaKeyFor(bytes);
        }
        this.expirationMs = expirationMinutes * 60_000;
    }

    public String generar(Usuario usuario) {
        Date ahora = new Date();
        return Jwts.builder()
                .subject(usuario.getId())
                .claim("rol", usuario.getRol())
                .issuedAt(ahora)
                .expiration(new Date(ahora.getTime() + expirationMs))
                .signWith(key)
                .compact();
    }

    /** Devuelve el id del usuario si el token es válido (firma + expiración); vacío si no. */
    public Optional<String> leerUsuarioId(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return Optional.ofNullable(claims.getSubject());
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
