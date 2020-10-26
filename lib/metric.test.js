const Metric = require('./metric');
const Dimension = require('./dimension');

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
    expect(metric.name).toBe(name);
    expect(metric.config).toBe(config);
    expect(metric.flushCallback).toEqual(expect.any(Function));
    expect(metric.dimensions).toEqual(
      expect.objectContaining({
        default: expect.any(Dimension),
      })
    );
  });

  describe('#findOrCreateDimension', () => {
    describe('when there are no dimensions', () => {
      it('returns the default dimension', () => {
        expect(metric.findOrCreateDimension()).toBe(metric.dimensions.default);
      });
    });

    describe('when the dimensions array is empty', () => {
      it('returns the default dimension', () => {
        expect(metric.findOrCreateDimension([])).toBe(
          metric.dimensions.default
        );
      });
    });

    describe('when there are custom dimensions', () => {
      it('returns a new custom dimension', () => {
        expect(Object.keys(metric.dimensions)).toHaveLength(1);
        const dimension = metric.findOrCreateDimension([{ a: 'b' }]);
        expect(dimension).toBeInstanceOf(Dimension);
        expect(dimension).not.toBe(metric.dimensions.default);
        expect(Object.keys(metric.dimensions)).toHaveLength(2);
      });
    });
  });

  describe('#forEach', () => {
    let iterator;

    beforeEach(() => {
      iterator = jest.fn();
    });

    it('iterates over the dimensions', () => {
      metric.dimensions = {
        a: 12,
        b: 24,
        c: 35,
      };

      metric.forEach(iterator);

      expect(iterator).toHaveBeenCalledTimes(3);
      expect(iterator).toHaveBeenLastCalledWith(35, 2, [12, 24, 35]);
    });
  });

  describe('#flush', () => {
    let flush;

    beforeEach(() => {
      flush = jest.fn();
    });

    it('calls #flush on all dimensions', () => {
      metric.dimensions = {
        a: { flush },
        b: { flush },
        c: { flush },
      };

      metric.flush();

      expect(flush).toHaveBeenCalledTimes(3);
    });
  });

  describe('#start', () => {
    let start;

    beforeEach(() => {
      start = jest.fn();
    });

    it('calls #start on all dimensions', () => {
      metric.dimensions = {
        a: { start },
        b: { start },
        c: { start },
      };

      metric.start();

      expect(start).toHaveBeenCalledTimes(3);
    });
  });

  describe('#stop', () => {
    let stop;

    beforeEach(() => {
      stop = jest.fn();
    });

    it('calls #stop on all dimensions', () => {
      metric.dimensions = {
        a: { stop },
        b: { stop },
        c: { stop },
      };

      metric.stop();

      expect(stop).toHaveBeenCalledTimes(3);
    });
  });

  describe('#reset', () => {
    let reset;

    beforeEach(() => {
      reset = jest.fn();
    });

    it('calls #reset on all dimensions', () => {
      metric.dimensions = {
        a: { reset },
        b: { reset },
        c: { reset },
      };

      metric.reset();

      expect(reset).toHaveBeenCalledTimes(3);
    });
  });

  describe('#record', () => {
    let record;

    beforeEach(() => {
      record = jest.fn();
    });

    it('calls #record on the correct dimension', () => {
      metric.dimensions = {
        default: { record },
      };

      metric.record(12);

      expect(record).toHaveBeenCalledWith(12);
    });
  });

  describe('#measure', () => {
    let measurer;

    beforeEach(() => {
      measurer = jest.fn(() => 55);
    });

    it('calls #measure on the correct dimension', () => {
      metric.dimensions = {
        default: { measure: (fn) => fn() },
      };

      const returnValue = metric.measure(measurer);

      expect(measurer).toHaveBeenCalled();
      expect(returnValue).toBe(55);
    });
  });
});
