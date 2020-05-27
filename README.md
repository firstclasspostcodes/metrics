# Metrics

We use this library internally to easily integrate AWS CloudWatch Custom Metrics into our applications.

To get started:

```sh
npm i @firstclasspostcodes/metrics -s
```

Now, add a configuration file named `metrics.config.js` to the working directory. This library uses [cosmiconfig](https://www.npmjs.com/package/cosmiconfig) so name your file accordingly.

```js
module.exports = {
  // Required: this is the namespace that all custom metrics will be published with
  namespace: 'Test/Service',
  // Required: the AWS region that the metrics will be published to
  region: process.env.AWS_REGION,
  // Optional: for serverless functions, specify `manualMode` to ensure that a metric
  // flush interval is not started.
  manualMode: true,
  // Required: define the custom metrics available to the application at runtime.
  metrics: {
    // this is the key that a custom metric will be configured as
    interestingMetric: {
      // Optional: a list of dimensions for the metric
      dimensions: [
        {
          Name: 'Function',
          Value: 'normalHandler',
        },
      ],
      // Optional: define the resolution for the metric, 1-60. Defaults to 60.
      resolution: 1,
      // Required: the type of metric being recorded
      unit: 'Count/Second',
    },
    longRunningFunction: {
      dimensions: [
        {
          Name: 'Function',
          Value: 'testHandler',
        },
      ],
      resolution: 1,
      // For measured functions, use milliseconds
      unit: 'Milliseconds',
    },
  },
};
```

For any deployed AWS applications, the correct IAM permissions must be configured:

```yaml
Function:
  Type: 'AWS::Serverless::Function'
  Properties:
    # ...
    Policies:
      - CloudWatchPutMetricPolicy: {}
```

or defined explicitly:

```yaml
Statement:
  - Effect: Allow
    Action:
      - cloudwatch:PutMetricData
    Resource:
      - '*'
```

Given the configuration above, you can use the configured metrics in the following way:

```js
const metrics = require('@firstclasspostcodes/metrics');

const { longRunningFunc } = require('./example');

exports.handler = async (event) => {
  metrics.interestingMetric(event.someValue.length);

  const data = await metrics.longRunningFunction(() => {
    // this will measure how long it takes to execute using perf_tools
    return longRunningFunc(event.someValue
  }));

  // will log a warning to the console and ignore this
  metrics.doesNotExistMetric();

  // for lambda functions, make sure to flush metrics
  // before execution ends
  await metrics.flush();

  return data;
};
```
