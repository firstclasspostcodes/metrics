const AWS = require('aws-sdk');
const Metric = require('./metric');

const { AWS_REGION } = process.env;

const MAX_DATAPOINTS = 20;

class Collector {
  constructor(namespace, metricConfigurations = {}, config = {}) {
    this.namespace = namespace;
    this.config = config || {};

    this.cloudwatch = new AWS.CloudWatch({
      region: config.region || AWS_REGION,
    });

    this.onMetricFlush = this.onMetricFlush.bind(this);

    const metricEntries = Object.entries(metricConfigurations);

    this.metrics = metricEntries.reduce((metrics, [name, metricConfig]) => {
      const autoStart = !config.manualMode && !config.disabled;

      const metric = new Metric(
        name,
        { autoStart, ...metricConfig },
        this.onMetricFlush
      );

      return { ...metrics, [name]: metric };
    }, {});

    this.reset();
  }

  async push() {
    const metricData = [].concat(this.datapoints);

    this.reset();

    if (this.config.disabled) {
      return {};
    }

    const putMetricParams = {
      MetricData: metricData,
      Namespace: this.namespace,
    };

    let response;

    try {
      response = await this.cloudwatch.putMetricData(putMetricParams).promise();
    } catch (err) {
      console.warn(`Error pushing ${metricData.length} datapoints.`);
      console.error(err);
    }

    return response;
  }

  reset() {
    this.datapoints = [];
  }

  stop() {
    Object.values(this.metrics).map((metric) => metric.stop());
  }

  async flush() {
    await Promise.all(
      Object.values(this.metrics).map((metric) => metric.flush())
    );
    return this.push();
  }

  onMetricFlush(obj) {
    this.datapoints.push(obj);

    if (this.datapoints.length >= MAX_DATAPOINTS) {
      this.push();
    }
  }

  has(name) {
    return name in this.metrics;
  }

  collector(name) {
    return (val) => {
      if (typeof val !== 'function') {
        return this.metrics[name].record(val);
      }
      return this.metrics[name].measure(val);
    };
  }

  static createProxy(collector) {
    return new Proxy(collector, { get: Collector.proxyReceiver });
  }

  static proxyReceiver(target, prop) {
    if (typeof target[prop] === 'function') {
      return target[prop].bind(target);
    }

    if (!target.has(prop)) {
      const noop = (fn) => {
        if (typeof fn === 'function') {
          return fn();
        }
      };

      console.warn(
        `Warning, metric "${prop}" is not defined, skipping collection.`
      );

      return noop;
    }

    return target.collector(prop);
  }
}

module.exports = Collector;
