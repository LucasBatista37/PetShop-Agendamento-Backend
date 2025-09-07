const { Redis } = require("ioredis");

const redisConnection = {
  host: process.env.REDIS_HOST || "127.0.0.1",
  port: process.env.REDIS_PORT || 6379,
  maxRetriesPerRequest: null,  
};

module.exports = { redisConnection };
