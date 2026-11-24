package cl.duoc.holomarket.config;

import cl.duoc.holomarket.repository.UsuarioRepository;
import cl.duoc.holomarket.security.JwtAuthFilter;
import cl.duoc.holomarket.security.JwtService;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtService jwtService, UsuarioRepository usuarioRepository)
            throws Exception {
        http
                // API stateless con JWT en header (no cookies) => CSRF no aplica
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        // Swagger (se apaga con SWAGGER_ENABLED=false y estas rutas pasan a dar 404)
                        .requestMatchers("/v3/api-docs/**", "/swagger-ui/**", "/swagger-ui.html").permitAll()
                        // Público: ingresar, crear cuenta, ver el catálogo y las imágenes de las cartas
                        .requestMatchers(HttpMethod.POST, "/api/auth/login", "/api/auth/registro").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/estado", "/api/tcg/**").permitAll()
                        // Solo ADMIN
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/config", "/api/usuarios/*/estado").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/retiros/*/transferir", "/api/retiros/*/rechazar").hasRole("ADMIN")
                        // Todo lo demás requiere login (publicar, comprar, pedidos, retiros...)
                        .anyRequest().authenticated())
                .exceptionHandling(e -> e
                        .authenticationEntryPoint((req, res, ex) -> writeJson(res, 401, "Tu sesión no es válida o expiró. Vuelve a ingresar."))
                        .accessDeniedHandler((req, res, ex) -> writeJson(res, 403, "No tienes permisos para esta acción.")))
                .addFilterBefore(new JwtAuthFilter(jwtService, usuarioRepository),
                        UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    /** CORS con lista blanca: solo el front configurado puede llamar a la API desde el navegador. */
    @Bean
    public CorsConfigurationSource corsConfigurationSource(@Value("${app.cors.allowed-origins}") String origins) {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(Arrays.stream(origins.split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
        config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(List.of("Authorization", "Content-Type"));
        config.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }

    private static void writeJson(HttpServletResponse res, int status, String message) throws IOException {
        res.setStatus(status);
        res.setContentType(MediaType.APPLICATION_JSON_VALUE);
        res.setCharacterEncoding("UTF-8");
        res.getWriter().write("{\"status\":" + status + ",\"message\":\"" + message + "\"}");
    }
}
