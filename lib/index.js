const { cosmiconfigSync } = require('cosmiconfig');

const Collector = require('./collector');

let { config } = cosmiconfigSync('metrics').search() || {};

const { namespace, metrics = {} } = config || {};

if (metrics.constructor !== Object) {
  throw new Error(`Metrics configuration must be an object.`);
}

if (!namespace || typeof namespace !== 'string') {
  throw new Error(`Metrics expecting namespace but found: "${namespace}"`);
}

const collector = new Collector(namespace, metrics, config);

module.exports = Collector.createProxy(collector);
