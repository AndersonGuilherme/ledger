export const RABBITMQ_EXCHANGE = "whalet.emails";
export const RABBITMQ_QUEUE = "whalet.emails.transactional";
export const RABBITMQ_ROUTING_KEY_OTP = "email.otp";
export const RABBITMQ_DLQ = "whalet.emails.deadletter";
export const RABBITMQ_DLX = "whalet.emails.deadletter.exchange";

export const RETRY_DELAYS_MS = [1000, 5000, 30000];
export const MAX_RETRY_ATTEMPTS = 3;
