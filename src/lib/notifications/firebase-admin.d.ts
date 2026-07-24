/**
 * Type stubs for firebase-admin to allow tsc --noEmit to pass
 * even when firebase-admin is not installed.
 *
 * At runtime, the module is loaded dynamically with a try-catch,
 * so missing the package gracefully degrades (no push notifications).
 */

declare module 'firebase-admin' {
  interface Message {
    notification?: { title: string; body: string };
    data?: Record<string, string>;
    token?: string;
  }

  interface Messaging {
    send(message: Message): Promise<string>;
  }

  interface App {
    messaging(): Messaging;
  }

  interface FirebaseAdmin {
    messaging(): Messaging;
  }

  const firebase: FirebaseAdmin;
  export default firebase;
  export function messaging(): Messaging;
}
