const Metric = require('./metric');

describe('Metric class', () => {
  const name = 'testMetric';

  const config = {
    unit: 'Count',
    resolution: 15,
    dimensions: [
      {
        Name: 'test',
        Value: 'value',
      },
    ],
  };

  let callback;

  let metric;

  beforeEach(() => {
    callback = jest.fn();
    metric = new Metric(name, config, callback);
  });

  it('initialises correctly', () => {
    expect(metric.intervalTime).toBe(config.resolution * 1000);
    expect(metric.name).toBe(name);
    expect(metric.config).toBe(config);
  });

  describe('#toPayload', () => {
    it('returns AWS CloudWatch MetricData', () => {
      expect(metric.toPayload()).toEqual(
        expect.objectContaining({
          MetricName: 'TestMetric',
          Dimensions: config.dimensions,
          Timestamp: expect.any(Date),
          StorageResolution: config.resolution,
          Counts: [0],
          Values: [0],
          Unit: 'Count',
          StatisticValues: {
            SampleCount: 1,
            Maximum: 0,
            Minimum: 0,
            Sum: 0,
          },
        })
      );
    });
  });

  describe('#flush', () => {
    describe('when no values are recorded', () => {
      it('does not call the callback', async () => {
        await metric.flush();
        expect(callback).not.toHaveBeenCalled();
      });
    });

    it('calls the callback with a payload object', async () => {
      metric.record(15);
      await metric.flush();
      expect(callback).toHaveBeenCalledWith(
        expect.objectContaining({
          Counts: [1],
          Values: [15],
        })
      );
    });
  });

  describe('#start', () => {
    it('starts an interval', () => {
      const interval = metric.start();
      expect(interval.hasRef()).toBe(false);
    });
  });

  describe('#reset', () => {
    beforeEach(() => {
      metric.record(10);
    });

    it('correctly resets the metric', () => {
      metric.reset();
      expect(metric.values.length).toBe(0);
      expect(metric.counts.length).toBe(0);
      expect(metric.timestamp).toEqual(expect.any(Date));
    });
  });

  describe('#measure', () => {
    describe('when the function is asynchronous', () => {
      it('records the execution time successfully', async () => {
        const mockRecord = jest.fn();
        metric.record = mockRecord;
        await metric.measure(
          () =>
            new Promise((resolve) => {
              expect(mockRecord).not.toHaveBeenCalled();
              setTimeout(() => resolve(), 500);
            })
        );
        expect(mockRecord.mock.calls[0][0]).toBeGreaterThanOrEqual(500);
        expect(mockRecord.mock.calls[0][0]).toBeLessThan(510);
      });
    });
  });

  describe('#record', () => {
    describe('when max value is reached', () => {
      let testValues;

      const maxValues = 150;

      beforeEach(() => {
        testValues = Array(200)
          .fill(10)
          .map((n, i) => n * i);
      });

      it('calls flush when the values array is filled up', () => {
        const flushSpy = jest.spyOn(metric, 'flush');
        testValues.forEach((val) => metric.record(val));
        expect(flushSpy).toHaveBeenCalledTimes(1);
        expect(metric.values.length).toBe(testValues.length - maxValues);
      });
    });

    it('adds the value correctly', () => {
      metric.record(10);
      expect(metric.values).toEqual(expect.arrayContaining([10]));
      expect(metric.counts).toEqual(expect.arrayContaining([1]));
      metric.record(10);
      expect(metric.counts).toEqual(expect.arrayContaining([2]));
    });

    it('returns the value passed into it', () => {
      const testFn = () => 14;
      expect(metric.record(testFn())).toBe(14);
    });
  });
});
