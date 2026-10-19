import { describe, expect, it } from 'vitest';
import {
  calcularNotasScore,
  calcularPuntajeFinal,
  calcularSurveyScore,
  clasificarRiesgo,
} from './riskService';

// RN-02: el puntaje de riesgo se calcula como 50% notas + 50% encuesta.
describe('calcularNotasScore', () => {
  it('devuelve 0 cuando no hay materias registradas', () => {
    expect(calcularNotasScore([])).toBe(0);
  });

  it('convierte el promedio de notas (escala 0-5) al 50% del puntaje (escala 0-100)', () => {
    // Promedio 5.0 -> (5/5) * 100 * 0.5 = 50
    expect(calcularNotasScore([{ nota: 5 }, { nota: 5 }])).toBe(50);
    // Promedio 2.5 -> (2.5/5) * 100 * 0.5 = 25
    expect(calcularNotasScore([{ nota: 2.5 }])).toBe(25);
  });
});

// RF-03 / RN-02: la encuesta tiene exactamente 6 preguntas.
describe('calcularSurveyScore', () => {
  it('devuelve 0 si no se completaron exactamente 6 respuestas', () => {
    expect(calcularSurveyScore([])).toBe(0);
    expect(calcularSurveyScore([1, 2, 3])).toBe(0);
  });

  it('convierte la suma de las 6 respuestas (escala 1-5 c/u) al 50% del puntaje', () => {
    // Suma 30 (máximo) -> (30/30) * 100 * 0.5 = 50
    expect(calcularSurveyScore([5, 5, 5, 5, 5, 5])).toBe(50);
    // Suma 15 (mitad) -> (15/30) * 100 * 0.5 = 25
    expect(calcularSurveyScore([3, 3, 2, 3, 2, 2])).toBe(25);
  });
});

describe('calcularPuntajeFinal', () => {
  it('combina notas y encuesta en un puntaje redondeado de 0 a 100', () => {
    const materias = [{ nota: 5 }, { nota: 5 }];
    const respuestas = [5, 5, 5, 5, 5, 5];
    expect(calcularPuntajeFinal(materias, respuestas)).toBe(100);
  });

  it('da 0 cuando no hay ni materias ni encuesta', () => {
    expect(calcularPuntajeFinal([], [])).toBe(0);
  });
});

// RF-06: 4 niveles de riesgo + recomendación + botón de contacto en Alto/Crítico.
describe('clasificarRiesgo', () => {
  it.each([
    [100, 'Bajo'],
    [80, 'Bajo'],
    [79, 'Medio'],
    [60, 'Medio'],
    [59, 'Alto'],
    [40, 'Alto'],
    [39, 'Crítico'],
    [1, 'Crítico'],
  ])('clasifica el puntaje %i como %s', (score, nivelEsperado) => {
    expect(clasificarRiesgo(score).nivel).toBe(nivelEsperado);
  });

  it('trata un puntaje de 0 como "Sin datos" en vez de Crítico (deuda técnica heredada del frontend)', () => {
    expect(clasificarRiesgo(0).nivel).toBe('Sin datos');
  });

  it('solo muestra el botón de contacto a Bienestar Universitario en Alto y Crítico (RN-05)', () => {
    expect(clasificarRiesgo(90).mostrarContacto).toBe(false); // Bajo
    expect(clasificarRiesgo(70).mostrarContacto).toBe(false); // Medio
    expect(clasificarRiesgo(50).mostrarContacto).toBe(true); // Alto
    expect(clasificarRiesgo(10).mostrarContacto).toBe(true); // Crítico
  });
});
