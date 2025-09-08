const { Redis } = require("ioredis");

let redisConnection;

if (process.env.NODE_ENV === "production") {
  const redisUrl = process.env.REDIS_URL; 

  if (!redisUrl) {
    throw new Error("REDIS_URL não definido no ambiente de produção");
  }

  redisConnection = new Redis(redisUrl, {
    tls: {}, 
    maxRetriesPerRequest: null,
    connectTimeout: 30000,
  });
} else {
  redisConnection = new Redis({
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
    tls: process.env.REDIS_TLS === "true" ? {} : undefined,
    maxRetriesPerRequest: null,
    connectTimeout: 10000,
  });
}

redisConnection.on("connect", () => console.log("✅ Redis conectado!"));
redisConnection.on("error", (err) => console.error("❌ Redis erro:", err));

module.exports = { redisConnection };
