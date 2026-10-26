// Bundle entry for 3D experiments: WB.app3d({ camera, caption, switchLabels, setup, update }).
import { COLORS, startExperiment } from './core.js';
import { createRenderer3d } from './renderer3d.js';

let renderNow = () => {};

window.WB = {
  colors: COLORS,
  app3d(options) {
    renderNow = startExperiment(options, createRenderer3d(options));
  },
  /** Paints the current state immediately, even when the browser pauses animations. */
  renderNow: () => renderNow(),
};
