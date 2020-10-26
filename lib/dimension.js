const pascalCase = require('pascalcase');
const { performance } = require('perf_hooks');

const MAX_VALUES = 150;

const DEFAULT_RESOLUTION = 60;

class Dimension {
  constructor(name, config, flushCallback) {
    this.name = name;
    this.config = config;
    this.flushCallback = flushCallback;
    this.intervalTime = (this.config.resolution || DEFAULT_RESOLUTION) * 1000;
    this.reset();

    if (config.autoStart) {
      this.start();
    }
  }

  toPayload() {
    const { unit, resolution, dimensions = [] } = this.config;

    const values = this.values.length > 0 ? this.values : [0];
    const counts = this.counts.length > 0 ? this.counts : [0];

    const maximum = Math.max(...values);
    const minimum = Math.min(...values);
    const sum = values.reduce((total, num) => total + num, 0);

    return {
      MetricName: pascalCase(this.name),
      Dimensions: dimensions,
      Timestamp: this.timestamp,
      StorageResolution: resolution || DEFAULT_RESOLUTION,
      Counts: counts,
      Values: values,
      Unit: unit,
      StatisticValues: {
        SampleCount: values.length,
        Maximum: maximum,
        Minimum: minimum,
        Sum: sum,
      },
    };
  }

  flush() {
    if (this.values.length === 0) {
      return true;
    }

    this.flushCallback(this.toPayload());
    return this.reset();
  }

  start() {
    const interval = setInterval(() => this.flush(), this.intervalTime);
    interval.unref();
    this.intervalId = interval;
    return interval;
  }

  stop() {
    this.intervalId = clearInterval(this.intervalId);
    return this.intervalId;
  }

  reset() {
    this.timestamp = new Date();
    this.counts = [];
    this.values = [];
  }

  measure(fn) {
    const start = performance.now();
    const result = fn();

    const finished = () => this.record(performance.now() - start);

    if (typeof result.then !== 'function') {
      finished();
      return result;
    }

    return result
      .then((resolvedValue) => {
        finished();
        return resolvedValue;
      })
      .catch((err) => {
        finished();
        throw err;
      });
  }

  record(value) {
    const index = this.values.findIndex((existing) => existing === value);

    if (index > -1) {
      return (this.counts[index] += 1);
    }

    this.counts[this.values.push(value) - 1] = 1;

    if (this.values.length >= MAX_VALUES) {
      this.flush();
    }

    return value;
  }
}

module.exports = Dimension;
