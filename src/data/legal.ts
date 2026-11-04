export type TipoLegal = 'terminos' | 'privacidad' | 'condiciones';

export const TITULOS_LEGALES: Record<TipoLegal, string> = {
  terminos: 'Términos y condiciones',
  privacidad: 'Política de privacidad',
  condiciones: 'Guía de condiciones',
};
