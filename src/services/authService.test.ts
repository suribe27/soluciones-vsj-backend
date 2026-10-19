import { describe, expect, it } from 'vitest';
import { DOMINIO_INSTITUCIONAL, validarDominioInstitucional } from './authService';

// RN-01: solo se permite iniciar sesión con un correo @soyudemedellin.edu.co.
describe('validarDominioInstitucional', () => {
  it('acepta un correo institucional válido', () => {
    expect(validarDominioInstitucional(`estudiante${DOMINIO_INSTITUCIONAL}`)).toBe(true);
  });

  it('acepta el correo sin importar mayúsculas/minúsculas', () => {
    expect(validarDominioInstitucional('Estudiante@SoyUdeMedellin.edu.co')).toBe(true);
  });

  it('rechaza correos de otros dominios', () => {
    expect(validarDominioInstitucional('estudiante@gmail.com')).toBe(false);
    expect(validarDominioInstitucional('estudiante@udemedellin.edu.co')).toBe(false);
  });

  it('rechaza un dominio institucional falsificado como subcadena', () => {
    expect(validarDominioInstitucional('ataque@soyudemedellin.edu.co.falso.com')).toBe(false);
  });
});
