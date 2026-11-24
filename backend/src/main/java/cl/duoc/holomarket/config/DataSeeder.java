package cl.duoc.holomarket.config;

import cl.duoc.holomarket.service.DatosDemoService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

/** En el primer arranque (base vacía) carga los datos de demostración. Después no toca nada. */
@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final DatosDemoService datosDemo;

    @Override
    public void run(String... args) {
        if (!datosDemo.hayDatos()) datosDemo.cargar();
    }
}
