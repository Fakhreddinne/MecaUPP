import businessData from "@/data/business.json";

export type BusinessConfig = typeof businessData;

export const business: BusinessConfig = businessData;

export function buildWhatsAppUrl(message: string): string {
  const params = new URLSearchParams({ text: message });
  return `https://wa.me/${business.whatsapp_number}?${params.toString()}`;
}

export function buildMailtoUrl(subject: string): string {
  const params = new URLSearchParams({ subject });
  return `mailto:${business.email}?${params.toString()}`;
}
