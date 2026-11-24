/* Validaciones que usan los formularios (registro, checkout, vender). */
import { claveError, cvvValido, emailValido, formatearRut, luhn, numeroCartaValido, rutValido, telefonoValido, vencimientoValido } from './validaciones';

describe('Validaciones', () => {
  it('RUT: acepta el dígito verificador correcto (también K) y rechaza el incorrecto', () => {
    expect(rutValido('21.456.789-K')).toBeTrue();
    expect(rutValido('12.345.678-5')).toBeTrue();
    expect(rutValido('12.345.678-9')).toBeFalse();
    expect(formatearRut('214567890')).toBe('21.456.789-0');
  });

  it('Tarjeta: valida el número con el algoritmo de Luhn, el vencimiento y el código', () => {
    expect(luhn('4111 1111 1111 1111')).toBeTrue();
    expect(luhn('4111 1111 1111 1112')).toBeFalse();
    const hoy = new Date(2026, 10, 2);
    expect(vencimientoValido('12/29', hoy)).toBeTrue();
    expect(vencimientoValido('01/24', hoy)).toBeFalse();
    expect(cvvValido('123')).toBeTrue();
    expect(cvvValido('12')).toBeFalse();
  });

  it('Correo, teléfono y contraseña', () => {
    expect(emailValido('camila@demo.cl')).toBeTrue();
    expect(emailValido('camila@demo')).toBeFalse();
    expect(telefonoValido('+56 9 8765 4321')).toBeTrue();
    expect(claveError('Clave1234')).toBe('');
    expect(claveError('corta1')).toBe('Usa entre 8 y 20 caracteres.');
    expect(claveError('solo-letras')).toBe('Incluye al menos una letra y un número.');
  });

  it('Número de carta: letras, números, guion o barra', () => {
    expect(numeroCartaValido('125/197')).toBeTrue();
    expect(numeroCartaValido('OP01-120')).toBeTrue();
    expect(numeroCartaValido('<script>')).toBeFalse();
  });
});
