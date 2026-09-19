export const CONTACT_MESSAGE_STATUSES = ["new", "read", "in_progress", "resolved", "archived"] as const;
export type ContactMessageStatus = (typeof CONTACT_MESSAGE_STATUSES)[number];

export function isContactMessageStatus(value: string): value is ContactMessageStatus {
  return (CONTACT_MESSAGE_STATUSES as readonly string[]).includes(value);
}
