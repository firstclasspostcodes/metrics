const AWS = require('aws-sdk');
const Metrics = require('.');
const { promisify } = require('util');

AWS.config.update({ region: 'eu-west-1' });

const setTimeoutPromise = promisify(setTimeout);

// const rand = (min, max) => Math.floor(Math.random() * (max - min)) + min;

const main = async () => {
  // setInterval(() => {
  //   const num = rand(1, 10);
  //   console.log(`randomCount(${num})`);
  //   Metrics.randomCount(num);
  // }, 300);

  const result = await Metrics.awaitInterval(() => {
    return setTimeoutPromise(2000).then(() => 123456);
  });

  await Metrics.flush();
  await Metrics.stop();

  console.log(123456 === result, result);

  return true;
};

main();
