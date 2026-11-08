import { Schema, model, type Types } from 'mongoose';
import { NEWSLETTER_EVENT_ACTORS, NEWSLETTER_EVENT_TYPES, NEWSLETTER_SOURCES, NEWSLETTER_STATUSES } from '@under30ss/shared';

export interface NewsletterEventDoc {
  type: (typeof NEWSLETTER_EVENT_TYPES)[number];
  at: Date;
  actor: (typeof NEWSLETTER_EVENT_ACTORS)[number];
  source?: (typeof NEWSLETTER_SOURCES)[number];
  textVersion?: number;
  /** Snapshot of the sentence the visitor agreed to; kept as proof of consent. */
  consentText?: string;
}

export interface NewsletterSubscriberDoc {
  email: string;
  status: (typeof NEWSLETTER_STATUSES)[number];
  source: (typeof NEWSLETTER_SOURCES)[number];
  consentedAt: Date;
  consentText: string;
  consentTextVersion: number;
  unsubscribedAt?: Date;
  events: NewsletterEventDoc[];
  createdAt: Date;
  updatedAt: Date;
}

export type NewsletterSubscriberRecord = NewsletterSubscriberDoc & { _id: Types.ObjectId };

const eventSchema = new Schema<NewsletterEventDoc>(
  {
    type: { type: String, enum: NEWSLETTER_EVENT_TYPES, required: true },
    at: { type: Date, required: true },
    actor: { type: String, enum: NEWSLETTER_EVENT_ACTORS, required: true },
    source: { type: String, enum: NEWSLETTER_SOURCES },
    textVersion: Number,
    consentText: String,
  },
  { _id: false },
);

const newsletterSubscriberSchema = new Schema<NewsletterSubscriberDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: { type: String, enum: NEWSLETTER_STATUSES, required: true },
    source: { type: String, enum: NEWSLETTER_SOURCES, required: true },
    consentedAt: { type: Date, required: true },
    consentText: { type: String, required: true },
    consentTextVersion: { type: Number, required: true },
    unsubscribedAt: Date,
    events: { type: [eventSchema], default: [] },
  },
  { timestamps: true, collection: 'newsletter_subscribers' },
);

newsletterSubscriberSchema.index({ status: 1, createdAt: -1 });

export const NewsletterSubscriberModel = model<NewsletterSubscriberDoc>('NewsletterSubscriber', newsletterSubscriberSchema);
