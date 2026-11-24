package cl.duoc.holomarket.security;

import cl.duoc.holomarket.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Lee el header "Authorization: Bearer <token>" y autentica la petición.
 * No es @Component a propósito: se registra solo dentro de la cadena de Spring Security
 * (si fuera @Component, Spring Boot lo registraría además como filtro global).
 */
public class JwtAuthFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public JwtAuthFilter(JwtService jwtService, UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header != null && header.startsWith("Bearer ")) {
            // Se busca el usuario en la BD en cada petición: si lo bloquean o le cambian el rol,
            // su token viejo deja de servir de inmediato.
            jwtService.leerUsuarioId(header.substring(7))
                    .flatMap(usuarioRepository::findById)
                    .filter(u -> u.activo())
                    .ifPresent(u -> {
                        AuthUser principal = new AuthUser(u.getId(), u.getEmail(), u.getRol());
                        var auth = new UsernamePasswordAuthenticationToken(principal, null,
                                List.of(new SimpleGrantedAuthority("ROLE_" + u.getRol().toUpperCase())));
                        SecurityContextHolder.getContext().setAuthentication(auth);
                    });
        }
        chain.doFilter(request, response);
    }
}
