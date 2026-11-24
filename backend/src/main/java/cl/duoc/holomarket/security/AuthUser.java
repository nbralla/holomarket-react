package cl.duoc.holomarket.security;

import cl.duoc.holomarket.entity.Usuario;

/** Usuario autenticado de la petición actual (se obtiene con @AuthenticationPrincipal). */
public record AuthUser(String id, String email, String rol) {

    public boolean esAdmin() {
        return Usuario.ADMIN.equals(rol);
    }
}
