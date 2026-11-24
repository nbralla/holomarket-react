package cl.duoc.holomarket.config;

import cl.duoc.holomarket.exception.ErrorResponse;
import io.swagger.v3.core.converter.ModelConverters;
import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.media.Content;
import io.swagger.v3.oas.models.media.MediaType;
import io.swagger.v3.oas.models.media.Schema;
import io.swagger.v3.oas.models.responses.ApiResponse;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.tags.Tag;
import org.springdoc.core.customizers.OpenApiCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

/**
 * Configuración de Swagger / OpenAPI.
 * - Define el esquema de seguridad JWT (botón "Authorize" en la UI).
 * - Por defecto TODOS los endpoints requieren token; los públicos lo anulan con @SecurityRequirements.
 */
@Configuration
public class OpenApiConfig {

    public static final String BEARER = "bearerAuth";

    @Bean
    public OpenAPI holomarketOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("HoloMarket API")
                        .version("1.0.0")
                        .description("""
                                API REST de HoloMarket, marketplace de cartas TCG en Chile: autenticación JWT, \
                                catálogo, publicaciones con kardex de stock, compra multivendedor, pedidos, \
                                retiros de dinero y administración.

                                **Cómo probar endpoints protegidos**
                                1. Ejecuta `POST /api/auth/login` (el ejemplo ya trae el admin de prueba).
                                2. Copia el `token` de la respuesta.
                                3. Presiona **Authorize** 🔒 y pega solo el token (sin la palabra `Bearer`).

                                Cuentas de prueba (solo desarrollo): `admin@holomarket.cl / Admin1234` (admin) \
                                y `camila@demo.cl`, `diego@demo.cl`, `valentina@demo.cl` con `Demo1234` (cliente).
                                """))
                .tags(List.of(
                        new Tag().name("Auth").description("Ingreso, registro y usuario actual"),
                        new Tag().name("Tienda").description("Datos de la tienda según el rol y auditoría"),
                        new Tag().name("Publicaciones").description("Publicar cartas y administrar el inventario"),
                        new Tag().name("Pedidos").description("Compra y seguimiento de pedidos"),
                        new Tag().name("Retiros").description("Cuenta bancaria y retiros de dinero"),
                        new Tag().name("Administración").description("Moderación y configuración (solo admin)"),
                        new Tag().name("API TCG").description("Proxy de imágenes y precios de las cartas")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER))
                .components(new Components().addSecuritySchemes(BEARER, new SecurityScheme()
                        .type(SecurityScheme.Type.HTTP)
                        .scheme("bearer")
                        .bearerFormat("JWT")
                        .description("Pega el token obtenido en /api/auth/login (sin 'Bearer ')")));
    }

    /**
     * Completa la documentación automáticamente:
     * - Agrega la respuesta 401 a todo endpoint protegido.
     * - Asigna el esquema ErrorResponse a toda respuesta 4xx/5xx que no tenga cuerpo documentado.
     */
    @Bean
    @SuppressWarnings({"rawtypes", "unchecked"})
    public OpenApiCustomizer errorResponsesCustomizer() {
        return openApi -> {
            ModelConverters.getInstance().read(ErrorResponse.class)
                    .forEach((name, schema) -> openApi.getComponents().addSchemas(name, schema));

            Content errorContent = new Content().addMediaType("application/json",
                    new MediaType().schema(new Schema().$ref("#/components/schemas/ErrorResponse")));

            if (openApi.getPaths() == null) return;
            openApi.getPaths().values().forEach(path -> path.readOperations().forEach(op -> {
                // security == null => hereda el requisito global (JWT); lista vacía => endpoint público
                if (op.getSecurity() == null && !op.getResponses().containsKey("401")) {
                    op.getResponses().addApiResponse("401",
                            new ApiResponse().description("No autenticado: falta el token, es inválido o expiró"));
                }
                op.getResponses().forEach((code, response) -> {
                    if ((code.startsWith("4") || code.startsWith("5")) && response.getContent() == null) {
                        response.setContent(errorContent);
                    }
                });
            }));
        };
    }
}
