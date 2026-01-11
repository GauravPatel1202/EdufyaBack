import { Request, Response, NextFunction } from 'express';
import client from 'prom-client';

// Create a Registry which registers the metrics
const register = new client.Registry();

// Add a default label which is added to all metrics
register.setDefaultLabels({
  app: 'edufya-backend'
});

// Enable the collection of default metrics
client.collectDefaultMetrics({ register });

// Create a histogram for HTTP request latency
const httpRequestDurationMicroseconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10]
});

// Create a histogram for DB query latency
const dbQueryDurationSeconds = new client.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of Database queries in seconds',
  labelNames: ['collection', 'operation'],
  buckets: [0.01, 0.05, 0.1, 0.3, 0.5, 1] // DB queries should be faster
});

register.registerMetric(httpRequestDurationMicroseconds);
register.registerMetric(dbQueryDurationSeconds);

export const metricsMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime();

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;
    
    const route = req.route ? req.route.path : 'unknown';
    
    httpRequestDurationMicroseconds
      .labels(req.method, route, res.statusCode.toString())
      .observe(durationInSeconds);
  });

  next();
};

export const getMetrics = async (req: Request, res: Response) => {
  res.setHeader('Content-Type', register.contentType);
  res.send(await register.metrics());
};

export const trackDbQuery = (collection: string, operation: string, durationInSeconds: number) => {
  dbQueryDurationSeconds.labels(collection, operation).observe(durationInSeconds);
};

export default {
  metricsMiddleware,
  getMetrics,
  trackDbQuery
};
