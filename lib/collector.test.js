const AWS = require('aws-sdk-mock');

const Collector = require('./collector');
const Metric = require('./metric');

describe('Collector', () => {
  let collector;

  let proxy;

  let mockPutMetricData;

  const namespace = 'test/namespace';

  const collectorConfig = {
    manualMode: false,
  };

  let metricConfigurations = {
    testMetric: {},
  };

  beforeEach(() => {
    mockPutMetricData = jest.fn((_params, cb) => cb(null, {}));
    AWS.mock('CloudWatch', 'putMetricData', mockPutMetricData);
  });

  afterEach(() => {
    AWS.restore();
  });

  beforeEach(() => {
    collector = new Collector(namespace, metricConfigurations, collectorConfig);
    proxy = Collector.createProxy(collector);
  });

  it('initialises correctly', () => {
    expect(collector.namespace).toBe(namespace);
    expect(collector.config).toBe(collectorConfig);
    expect(collector.metrics).toEqual(
      expect.objectContaining({
        testMetric: expect.objectContaining({
          config: expect.objectContaining({
            autoStart: true,
          }),
        }),
      })
    );
  });

  it('records metrics correctly', () => {
    const value = proxy.testMetric(3456);
    const result = proxy.testMetric(() => 564);
    expect(result).toBe(564);
    expect(value).toBe(3456);
  });

  describe('#push', () => {
    const testDatapoint = {
      MetricName: 'TestMetric',
      Value: 1,
      Timestamp: new Date(),
    };

    it('correctly pushes metrics to CloudWatch', async () => {
      collector.datapoints = [testDatapoint];
      await collector.push();

      expect(collector.datapoints.length).toBe(0);
      // expect(mockPutMetricData).toHaveBeenCalledTimes(1);
      expect(mockPutMetricData).toHaveBeenCalledWith(
        expect.objectContaining({
          Namespace: namespace,
          MetricData: [testDatapoint],
        }),
        expect.any(Function)
      );
    });

    describe('when the collector is disabled', () => {
      beforeEach(() => {
        collector.config.disabled = true;
      });

      it('does not push metrics to CloudWatch', async () => {
        await collector.push();
        return expect(mockPutMetricData).not.toHaveBeenCalled();
      });
    });

    describe('when an error occurs', () => {
      beforeEach(() => {
        mockPutMetricData.mockImplementationOnce(() => {
          throw new Error('testing');
        });
      });

      let warnSpy;
      let errorSpy;

      beforeEach(() => {
        warnSpy = jest
          .spyOn(console, 'warn')
          .mockImplementationOnce(() => null);
        errorSpy = jest
          .spyOn(console, 'error')
          .mockImplementationOnce(() => null);
      });

      afterEach(() => {
        jest.restoreAllMocks();
      });

      it('shoud not throw an error', async () => {
        collector.config.disabled = false;
        collector.datapoints = [testDatapoint];
        await expect(collector.push()).resolves.toEqual(undefined);
        expect(warnSpy).toHaveBeenCalled();
        expect(errorSpy).toHaveBeenCalled();
      });
    });
  });

  describe('#reset', () => {
    it('resets all the datapoints for the collector', () => {
      collector.datapoints = [1, 2, 3, 4, 5];
      collector.reset();
      expect(collector.datapoints.length).toBe(0);
    });
  });

  describe('#stop', () => {
    let mockStop;

    beforeEach(() => {
      mockStop = jest.fn();
      collector.metrics = [{ stop: mockStop }, { stop: mockStop }];
    });

    it('stops all interval flushes on all metrics', () => {
      collector.stop();
      expect(mockStop).toHaveBeenCalledTimes(2);
    });
  });

  describe('#flush', () => {
    let mockFlush;

    let mockPush;

    beforeEach(() => {
      mockFlush = jest.fn();
      mockPush = jest.fn();
      collector.push = mockPush;
      collector.metrics = [{ flush: mockFlush }, { flush: mockFlush }];
    });

    it('flushes all recorded metrics to the collector', async () => {
      await collector.flush();
      expect(mockFlush).toHaveBeenCalledTimes(2);
      expect(mockPush).toHaveBeenCalledTimes(1);
    });
  });

  describe('#onMetricFlush', () => {
    const testDatapoint = {
      MetricName: 'TestMetric',
      Value: 1,
      Timestamp: new Date(),
    };

    describe('when the overflow is reached', () => {
      const values = Array(30).fill(testDatapoint);

      const maxDatapoints = 20;

      it('calls push to send the datapoints to CloudWatch', () => {
        const pushSpy = jest.spyOn(collector, 'push');
        values.forEach((val) => collector.onMetricFlush(val));
        expect(pushSpy).toHaveBeenCalledTimes(1);
        expect(collector.datapoints.length).toBe(values.length - maxDatapoints);
      });
    });

    it('adds the record to the datapoints array', () => {
      expect(collector.datapoints.length).toBe(0);
      collector.onMetricFlush(testDatapoint);
      expect(collector.datapoints.length).toBe(1);
    });
  });

  describe('#has', () => {
    it('correctly determines if a metric is configured', () => {
      collector.metrics = { testMetric: {} };
      expect(collector.has('testMetric')).toBe(true);
      expect(collector.has('undefinedMetric')).toBe(false);
    });
  });

  describe('#collector', () => {
    let mockMeasure;

    let mockRecord;

    let metricName = 'testMetric';

    beforeEach(() => {
      mockMeasure = jest.fn();
      mockRecord = jest.fn();
      collector.metrics = {
        [metricName]: { measure: mockMeasure, record: mockRecord },
      };
    });

    describe('when the value is a function', () => {
      it('measures the execution time', async () => {
        collector.collector(metricName)(() => 14);
        expect(mockMeasure).toHaveBeenCalledTimes(1);
        expect(mockRecord).not.toHaveBeenCalled();
      });
    });

    it('records the value correctly', async () => {
      collector.collector(metricName)(56);
      expect(mockRecord).toHaveBeenCalledWith(56);
      expect(mockMeasure).not.toHaveBeenCalled();
    });
  });
});
