import { describe, expect, it } from 'vitest';
import { hashClave, sha256 } from './sha256';

describe('sha256', () => {
  it('coincide con los valores oficiales de prueba', () => {
    expect(sha256('')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
    expect(sha256('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });
  it('produce hashes distintos para la misma contraseña con distinta sal', () => {
    expect(hashClave('a1', 'Demo1234')).not.toBe(hashClave('b2', 'Demo1234'));
    expect(hashClave('a1', 'Demo1234')).toHaveLength(64);
  });
});
