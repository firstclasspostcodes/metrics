const { cosmiconfigSync } = require('cosmiconfig');

const Collector = require('./collector');

const searchFrom = process.env.METRICS_CONFIG_PATH || process.cwd();

let { config } = cosmiconfigSync('metrics').search(searchFrom) || {};

const { namespace, metrics = {} } = config || {};

const isDisabled = !namespace || !metrics || Object.keys(metrics).length === 0;

if (isDisabled) {
  console.warn('@firstclasspostcodes/metrics is disabled.');
}

const collectorConfig = Object.assign({}, config, {
  disabled: isDisabled,
});

const collector = new Collector(namespace, metrics, collectorConfig);

module.exports = Collector.createProxy(collector);
