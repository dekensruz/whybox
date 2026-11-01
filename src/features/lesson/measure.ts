import type { SimulationMeasurement } from '@shared/lesson';

/** A measurement as the learner reads it: a number with its unit, or for a reaction, its word ("Forte"). */
export const describeMeasure = (measurement: SimulationMeasurement, value: number, language: string) => {
  if (measurement.scale) {
    const share = Math.max(0, Math.min(1, value / measurement.scale.max));
    const { levels } = measurement.scale;
    return levels[Math.min(levels.length - 1, Math.floor(share * levels.length))];
  }
  const number = new Intl.NumberFormat(language, { maximumFractionDigits: Math.abs(value) >= 10 ? 1 : 2 }).format(value);
  return measurement.unit ? `${number} ${measurement.unit}` : number;
};
