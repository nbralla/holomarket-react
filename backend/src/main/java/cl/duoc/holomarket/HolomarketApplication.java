package cl.duoc.holomarket;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// Se excluye el usuario "user" con contraseña autogenerada que Spring Security crea por defecto
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class HolomarketApplication {

    public static void main(String[] args) {
        SpringApplication.run(HolomarketApplication.class, args);
    }
}
