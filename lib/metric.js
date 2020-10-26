const Dimension = require('./dimension');

class Metric {
  static getDimensionsId(dimensions = []) {
    return JSON.stringify(dimensions).replace(' ', '');
  }

  constructor(name, config, flushCallback) {
    this.name = name;
    this.config = config;
    this.flushCallback = flushCallback;
    this.dimensions = {
      default: new Dimension(name, config, flushCallback),
    };
  }

  findOrCreateDimension(runtimeDimensions) {
    const { dimensions } = this;

    if (!runtimeDimensions || runtimeDimensions.length === 0) {
      return dimensions.default;
    }

    const id = Metric.getDimensionsId(runtimeDimensions);

    if (dimensions[id]) {
      return dimensions[id];
    }

    const { name, config, flushCallback } = this;

    dimensions[id] = new Dimension(
      name,
      {
        ...config,
        dimensions: [...config.dimensions, ...runtimeDimensions],
      },
      flushCallback
    );

    return dimensions[id];
  }

  forEach(fn) {
    const { dimensions } = this;
    Object.values(dimensions).forEach(fn);
  }

  flush() {
    this.forEach((dimension) => dimension.flush());
  }

  start() {
    this.forEach((dimension) => dimension.start());
  }

  stop() {
    this.forEach((dimension) => dimension.stop());
  }

  reset() {
    this.forEach((dimension) => dimension.reset());
  }

  measure(fn, runtimeDimensions = []) {
    const dimension = this.findOrCreateDimension(runtimeDimensions);
    return dimension.measure(fn);
  }

  record(value, runtimeDimensions = []) {
    const dimension = this.findOrCreateDimension(runtimeDimensions);
    return dimension.record(value);
  }
}

module.exports = Metric;
