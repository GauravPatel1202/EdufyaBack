import mongoose, { Schema, Document } from 'mongoose';

export interface IVisitor extends Document {
  visitorId: string;
  firstVisit: Date;
  lastVisit: Date;
  visitCount: number;
}

const VisitorSchema: Schema = new Schema({
  visitorId: { type: String, required: true, unique: true },
  firstVisit: { type: Date, default: Date.now },
  lastVisit: { type: Date, default: Date.now },
  visitCount: { type: Number, default: 1 }
});

VisitorSchema.index({ visitorId: 1 });
VisitorSchema.index({ lastVisit: 1 });

export default mongoose.model<IVisitor>('Visitor', VisitorSchema);
