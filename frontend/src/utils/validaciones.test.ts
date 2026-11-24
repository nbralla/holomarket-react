import { describe, expect, it } from 'vitest';
import {
  claveError, cuentaBancariaValida, emailValido, formatearRut, fuerzaClave, luhn, nombreValido, numeroCartaValido,
  precioError, rutValido, stockError, telefonoValido, vencimientoValido,
} from './validaciones';

describe('RUT', () => {
  it('acepta RUT con dígito verificador correcto, con o sin puntos', () => {
    expect(rutValido('21.456.789-K')).toBe(true);
    expect(rutValido('21456789k')).toBe(true);
    expect(rutValido('12.345.678-5')).toBe(true);
  });
  it('rechaza un dígito verificador incorrecto', () => {
    expect(rutValido('21.456.789-0')).toBe(false);
    expect(rutValido('123')).toBe(false);
  });
  it('formatea con puntos y guion', () => {
    expect(formatearRut('21456789k')).toBe('21.456.789-K');
  });
});

describe('Datos de contacto y contraseña', () => {
  it('valida correos', () => {
    expect(emailValido('camila@demo.cl')).toBe(true);
    expect(emailValido('camila@demo')).toBe(false);
  });
  it('valida nombres con tildes y rechaza números', () => {
    expect(nombreValido('Martina Muñoz')).toBe(true);
    expect(nombreValido('R2D2')).toBe(false);
  });
  it('valida teléfonos chilenos', () => {
    expect(telefonoValido('+56 9 8765 4321')).toBe(true);
    expect(telefonoValido('12345')).toBe(false);
  });
  it('exige contraseñas de 8 a 20 caracteres con letras y números', () => {
    expect(claveError('corta')).toBe('Usa entre 8 y 20 caracteres.');
    expect(claveError('solamenteletras')).toBe('Incluye al menos una letra y un número.');
    expect(claveError('HoloMarket2026')).toBe('');
    expect(fuerzaClave('HoloMarket2026')).toBe(3);
  });
});

describe('Pago simulado', () => {
  it('aplica el algoritmo de Luhn', () => {
    expect(luhn('4111 1111 1111 1111')).toBe(true);
    expect(luhn('4111 1111 1111 1112')).toBe(false);
  });
  it('rechaza tarjetas vencidas', () => {
    const hoy = new Date(2026, 9, 8);
    expect(vencimientoValido('12/29', hoy)).toBe(true);
    expect(vencimientoValido('01/24', hoy)).toBe(false);
    expect(vencimientoValido('13/29', hoy)).toBe(false);
  });
});

describe('Publicaciones y retiros', () => {
  it('valida precio y stock', () => {
    expect(precioError('50')).toBe('El precio mínimo es $100.');
    expect(precioError('5990')).toBe('');
    expect(stockError('0')).toBe('Publica al menos 1 unidad.');
    expect(stockError('0', 0)).toBe('');
    expect(stockError('1000')).toBe('El máximo por publicación es 999 unidades.');
  });
  it('valida el número de carta y de cuenta bancaria', () => {
    expect(numeroCartaValido('125/197')).toBe(true);
    expect(numeroCartaValido('OP01-120')).toBe(true);
    expect(numeroCartaValido('<script>')).toBe(false);
    expect(cuentaBancariaValida('00-1234 5678')).toBe(true);
    expect(cuentaBancariaValida('12abc')).toBe(false);
  });
});
