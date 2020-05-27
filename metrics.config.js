module.exports = {
  namespace: 'Test/Service',
  region: process.env.AWS_REGION,
  manualMode: true,
  metrics: {
    randomCount: {
      dimensions: [
        {
          Name: 'Function',
          Value: 'getPostcode',
        },
      ],
      resolution: 1,
      unit: 'Count/Second',
    },
    awaitInterval: {
      dimensions: [
        {
          Name: 'Function',
          Value: 'getPostcode',
        },
      ],
      resolution: 1,
      unit: 'Milliseconds',
    },
  },
};
