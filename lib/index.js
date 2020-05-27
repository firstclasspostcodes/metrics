const { cosmiconfigSync } = require('cosmiconfig');

const Collector = require('./collector');

const searchFrom = process.env.METRICS_CONFIG_PATH || process.cwd();

let { config, isEmpty } = cosmiconfigSync('metrics').search(searchFrom) || {};

const { namespace, metrics = {} } = config || {};

if (isEmpty) {
  throw new Error('Encountered metrics.config.js configuration file.');
}

if (metrics.constructor !== Object) {
  throw new Error(`Metrics configuration must be an object.`);
}

if (!namespace || typeof namespace !== 'string') {
  throw new Error(`Metrics expecting namespace but found: "${namespace}"`);
}

const collector = new Collector(namespace, metrics, config);

module.exports = Collector.createProxy(collector);
