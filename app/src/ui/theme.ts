export const colors = {
  bg: '#04060C',
  bgElevated: '#0A1020',
  panel: 'rgba(9, 18, 36, 0.92)',
  panelBorder: '#2BC4FF',
  panelBorderDim: 'rgba(43, 196, 255, 0.35)',
  glow: '#2BC4FF',
  accent: '#7C5CFF',
  text: '#E8F4FF',
  textDim: '#8BA3BF',
  textFaint: '#4F6580',
  success: '#3DFFB0',
  warning: '#FFC145',
  danger: '#FF4D6D',
  gold: '#FFD15C',
  track: 'rgba(43, 196, 255, 0.12)',
} as const;

export const fonts = {
  regular: 'Rajdhani_500Medium',
  semibold: 'Rajdhani_600SemiBold',
  bold: 'Rajdhani_700Bold',
} as const;

export const space = (n: number) => n * 4;
