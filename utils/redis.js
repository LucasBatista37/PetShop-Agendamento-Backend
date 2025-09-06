const { Redis } = require("ioredis");

const redisConnection = new Redis({
  host: "127.0.0.1",
  port: 6379,
});

module.exports = { redisConnection };
