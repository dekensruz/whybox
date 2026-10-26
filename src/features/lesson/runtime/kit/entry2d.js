// Bundle entry for 2D experiments: WB.app({ world, caption, switchLabels, draw }).
import { COLORS, startExperiment } from './core.js';
import { createRenderer2d } from './renderer2d.js';

let renderNow = () => {};

window.WB = {
  colors: COLORS,
  app(options) {
    renderNow = startExperiment(options, createRenderer2d(options));
  },
  /** Paints the current state immediately, even when the browser pauses animations. */
  renderNow: () => renderNow(),
};
