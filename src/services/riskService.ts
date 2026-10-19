/**
 * Cálculo del puntaje de riesgo.
 *
 * Replica EXACTAMENTE la fórmula que hoy vive en el frontend (App.tsx),
 * para que mover el cálculo al backend no cambie el resultado que el
 * estudiante ya conoce (RNF-05 del documento de análisis: mover la lógica
 * de riesgo del frontend al backend sin romper el comportamiento visible).
 *
 *   notasScore  = (promedio de notas / 5) * 100 * 0.5
 *   surveyScore = (suma de 6 respuestas / 30) * 100 * 0.5   (requiere 6 respuestas)
 *   finalScore  = round(notasScore + surveyScore)
 */

export interface Materia {
  nota: number;
}

export function calcularNotasScore(materias: Materia[]): number {
  if (materias.length === 0) return 0;
  const promedio = materias.reduce((acc, m) => acc + m.nota, 0) / materias.length;
  return (promedio / 5) * 100 * 0.5;
}

export function calcularSurveyScore(respuestas: number[]): number {
  if (respuestas.length !== 6) return 0;
  const suma = respuestas.reduce((acc, v) => acc + v, 0);
  return (suma / 30) * 100 * 0.5;
}

export function calcularPuntajeFinal(materias: Materia[], respuestas: number[]): number {
  const notasScore = calcularNotasScore(materias);
  const surveyScore = calcularSurveyScore(respuestas);
  return Math.round(notasScore + surveyScore);
}

export type NivelRiesgo = 'Bajo' | 'Medio' | 'Alto' | 'Crítico' | 'Sin datos';

/**
 * Niveles y recomendaciones — replica getRecommendation() de App.tsx TAL CUAL,
 * incluyendo una ambigüedad ya presente en el frontend original: un puntaje de
 * 0 siempre se interpreta como "faltan datos", incluso en el caso (poco común)
 * de que el estudiante realmente tenga notas y encuesta en 0. Se deja
 * documentado como deuda técnica heredada (ver sección 3.2 / RNF-05 del
 * documento de análisis) en lugar de corregirlo aquí sin que el equipo lo
 * decida explícitamente, para no cambiar el comportamiento que el frontend
 * ya mostraba.
 */
export function clasificarRiesgo(score: number): { nivel: NivelRiesgo; recomendacion: string; mostrarContacto: boolean } {
  if (score >= 80) {
    return {
      nivel: 'Bajo',
      recomendacion: '¡Vas muy bien! Mantén tu ritmo. Recuerda que puedes consultar tutorías si lo necesitas.',
      mostrarContacto: false,
    };
  }
  if (score >= 60) {
    return {
      nivel: 'Medio',
      recomendacion: 'Te recomendamos asistir a tutoría académica y hablar con tu consejero esta semana.',
      mostrarContacto: false,
    };
  }
  if (score >= 40) {
    return {
      nivel: 'Alto',
      recomendacion: 'Es importante que te comuniques con bienestar universitario lo antes posible.',
      mostrarContacto: true,
    };
  }
  if (score === 0) {
    return {
      nivel: 'Sin datos',
      recomendacion: 'Registra tus notas y completa la encuesta para ver tu resultado.',
      mostrarContacto: false,
    };
  }
  return {
    nivel: 'Crítico',
    recomendacion: 'Un asesor se pondrá en contacto contigo. No estás solo, hay apoyo disponible.',
    mostrarContacto: true,
  };
}
