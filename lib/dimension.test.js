const Dimension = require('./dimension');
const Timers = require('timers');

describe('Dimension class', () => {
  const name = 'testDimension';

  const config = {
    unit: 'Count',
    resolution: 15,
    autoStart: true,
    dimensions: [
      {
        Name: 'test',
        Value: 'value',
      },
    ],
  };

  let callback;

  let dimension;

  beforeEach(() => {
    callback = jest.fn();
    dimension = new Dimension(name, config, callback);
  });

  it('initialises correctly', () => {
    expect(dimension.intervalTime).toBe(config.resolution * 1000);
    expect(dimension.name).toBe(name);
    expect(dimension.config).toBe(config);
    expect(dimension.intervalTime).toEqual(expect.any(Number));
    expect(dimension.flushCallback).toEqual(expect.any(Function));
    expect(dimension.intervalId.unref).toEqual(expect.any(Function));
  });

  describe('#toPayload', () => {
    it('returns AWS CloudWatch MetricData', () => {
      expect(dimension.toPayload()).toEqual(
        expect.objectContaining({
          MetricName: 'TestDimension',
          Dimensions: config.dimensions,
          Timestamp: expect.any(Date),
          StorageResolution: expect.any(Number),
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
        await dimension.flush();
        expect(callback).not.toHaveBeenCalled();
      });
    });

    it('calls the callback with a payload object', async () => {
      dimension.record(15);
      await dimension.flush();
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
      const interval = dimension.start();
      expect(interval.hasRef()).toBe(false);
    });
  });

  describe('#stop', () => {
    it('correctly stops an interval', async () => {
      const timeoutFn = jest.fn();
      dimension.intervalId = setTimeout(timeoutFn, 200);
      dimension.stop();
      await new Promise((resolve) => setTimeout(resolve, 300));
      expect(timeoutFn).not.toHaveBeenCalled();
    });
  });

  describe('#reset', () => {
    beforeEach(() => {
      dimension.record(10);
    });

    it('correctly resets the dimension', () => {
      dimension.reset();
      expect(dimension.values.length).toBe(0);
      expect(dimension.counts.length).toBe(0);
      expect(dimension.timestamp).toEqual(expect.any(Date));
    });
  });

  describe('#measure', () => {
    describe('when the function is asynchronous', () => {
      it('records the execution time successfully', async () => {
        const mockRecord = jest.fn();
        dimension.record = mockRecord;
        await dimension.measure(
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

    describe('when the function is synchronous', () => {
      it('records the execution time successfully', () => {
        const startTime = Number(new Date());

        const mockRecord = jest.fn((starter) => {
          const delay = 200;

          while (true) {
            if (Number(new Date()) - starter > delay) {
              break;
            }
          }

          return Number(new Date()) - starter;
        });

        const result = dimension.measure(() => mockRecord(startTime));

        expect(mockRecord).toHaveBeenCalled();
        expect(result).toBeGreaterThanOrEqual(200);
        expect(result).toBeLessThan(210);
      });
    });

    describe('when the function throws', () => {
      it('records the execution time successfully', async () => {
        const mockRecord = jest.fn();
        dimension.record = mockRecord;
        await expect(
          dimension.measure(
            () =>
              new Promise((_resolve, reject) => {
                expect(mockRecord).not.toHaveBeenCalled();
                setTimeout(() => reject(new Error('test')), 500);
              })
          )
        ).rejects.toEqual(expect.any(Error));
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
        const flushSpy = jest.spyOn(dimension, 'flush');
        testValues.forEach((val) => dimension.record(val));
        expect(flushSpy).toHaveBeenCalledTimes(1);
        expect(dimension.values.length).toBe(testValues.length - maxValues);
      });
    });

    it('adds the value correctly', () => {
      dimension.record(10);
      expect(dimension.values).toEqual(expect.arrayContaining([10]));
      expect(dimension.counts).toEqual(expect.arrayContaining([1]));
      dimension.record(10);
      expect(dimension.counts).toEqual(expect.arrayContaining([2]));
    });

    it('returns the value passed into it', () => {
      const testFn = () => 14;
      expect(dimension.record(testFn())).toBe(14);
    });
  });
});
