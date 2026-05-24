import type { Faq } from "../models/Faq.js";

type LeanFaq = Faq & {
  _id: unknown;
  createdAt?: Date;
  updatedAt?: Date;
  __v?: number;
};

export function toPublicFaq<T extends LeanFaq>(faq: T): Omit<T, "embedding" | "__v"> {
  const { embedding: _embedding, __v: _version, ...publicFaq } = faq;
  return publicFaq;
}
