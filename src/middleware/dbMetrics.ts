import { Schema, Query, Model } from 'mongoose';
import { trackDbQuery } from './metrics';

export const mongooseMetricsPlugin = (schema: Schema) => {
  const queryMiddleware = [
    'find',
    'findOne',
    'findOneAndUpdate',
    'update',
    'updateOne',
    'updateMany',
    'deleteOne',
    'deleteMany',
    'findOneAndDelete',
    'countDocuments'
  ];

  queryMiddleware.forEach((op) => {
    schema.pre(op as any, function(this: Query<any, any>) {
      (this as any)._start = process.hrtime();
    });

    schema.post(op as any, function(this: Query<any, any>) {
      if ((this as any)._start) {
        const duration = process.hrtime((this as any)._start);
        const durationInSeconds = duration[0] + duration[1] / 1e9;
        const model = (this as any).model as Model<any>;
        const collection = model.collection.name;
        const operation = (this as any).op;
        trackDbQuery(collection, operation, durationInSeconds);
      }
    });
  });

  // For aggregate
  schema.pre('aggregate', function() {
    (this as any)._start = process.hrtime();
  });

  schema.post('aggregate', function() {
    if ((this as any)._start) {
      const duration = process.hrtime((this as any)._start);
      const durationInSeconds = duration[0] + duration[1] / 1e9;
      const model = (this as any)._model as Model<any>;
      const collection = model ? model.collection.name : 'unknown';
      trackDbQuery(collection, 'aggregate', durationInSeconds);
    }
  });
};
