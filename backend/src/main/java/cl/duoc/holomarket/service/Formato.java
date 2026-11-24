package cl.duoc.holomarket.service;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;

/** Utilidades de texto compartidas por los servicios (montos en CLP y RUT chileno). */
public final class Formato {

    private Formato() {
    }

    /** 5990 -> "$5.990" */
    public static String clp(long monto) {
        DecimalFormatSymbols simbolos = new DecimalFormatSymbols();
        simbolos.setGroupingSeparator('.');
        return "$" + new DecimalFormat("#,##0", simbolos).format(monto);
    }

    public static String plural(int n, String uno, String varios) {
        return n == 1 ? uno : varios;
    }

    /* ---------- RUT chileno (módulo 11), igual que utils/validaciones.ts ---------- */

    public static String limpiarRut(String rut) {
        return rut == null ? "" : rut.toUpperCase().replaceAll("[^0-9K]", "");
    }

    public static String calcularDv(String cuerpo) {
        int suma = 0;
        int multiplicador = 2;
        for (int i = cuerpo.length() - 1; i >= 0; i--) {
            suma += (cuerpo.charAt(i) - '0') * multiplicador;
            multiplicador = multiplicador == 7 ? 2 : multiplicador + 1;
        }
        int resto = 11 - (suma % 11);
        if (resto == 11) return "0";
        if (resto == 10) return "K";
        return String.valueOf(resto);
    }

    public static boolean rutValido(String valor) {
        String limpio = limpiarRut(valor);
        if (limpio.length() < 8 || limpio.length() > 9) return false;
        String cuerpo = limpio.substring(0, limpio.length() - 1);
        String dv = limpio.substring(limpio.length() - 1);
        return cuerpo.matches("\\d+") && calcularDv(cuerpo).equals(dv);
    }

    /** 12345678K -> 12.345.678-K */
    public static String formatearRut(String valor) {
        String limpio = limpiarRut(valor);
        if (limpio.length() < 2) return limpio;
        String cuerpo = limpio.substring(0, limpio.length() - 1).replaceAll("\\B(?=(\\d{3})+(?!\\d))", ".");
        return cuerpo + "-" + limpio.substring(limpio.length() - 1);
    }

    /** Algoritmo de Luhn: detecta números de tarjeta mal escritos. */
    public static boolean luhnValido(String digitos) {
        if (digitos == null || !digitos.matches("\\d{13,19}")) return false;
        int suma = 0;
        boolean doblar = false;
        for (int i = digitos.length() - 1; i >= 0; i--) {
            int d = digitos.charAt(i) - '0';
            if (doblar) {
                d *= 2;
                if (d > 9) d -= 9;
            }
            suma += d;
            doblar = !doblar;
        }
        return suma % 10 == 0;
    }
}
