import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  verify: vi.fn(),
  findUser: vi.fn(),
  createUser: vi.fn(),
  connect: vi.fn(),
  welcome: vi.fn(),
}));

vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = mocks.verify;
  },
}));
vi.mock('@/lib/mongodb', () => ({ connectDB: mocks.connect }));
vi.mock('@/models/User', () => ({ default: { findOne: mocks.findUser, create: mocks.createUser } }));
vi.mock('@/models/Otp', () => ({ default: {} }));
vi.mock('@/lib/notifications/email', () => ({ emailService: { sendWelcomeEmail: mocks.welcome } }));

type Authorize = (credentials: { idToken?: string } | undefined, request: unknown) => Promise<unknown>;
let authorize: Authorize;

beforeAll(async () => {
  vi.stubEnv('NEXTAUTH_SECRET', 'native-google-test-only');
  vi.stubEnv('GOOGLE_CLIENT_ID', 'synthetic-web-client');
  vi.stubEnv('GOOGLE_CLIENT_SECRET', 'synthetic-secret');
  vi.stubEnv('GOOGLE_ANDROID_CLIENT_ID', 'synthetic-android-client');
  const { authOptions } = await import('./auth');
  const providers = authOptions.providers as Array<{ options?: { id?: string; authorize?: Authorize } }>;
  const callback = providers.find(provider => provider.options?.id === 'google-native')?.options?.authorize;
  if (!callback) throw new Error('Native Google provider is unavailable');
  authorize = callback;
});

afterAll(() => vi.unstubAllEnvs());

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv('GOOGLE_CLIENT_ID', 'synthetic-web-client');
  vi.stubEnv('GOOGLE_ANDROID_CLIENT_ID', 'synthetic-android-client');
  mocks.verify.mockResolvedValue({ getPayload: () => ({ sub: 'google-user', email: 'synthetic@example.com', email_verified: true }) });
  mocks.findUser.mockResolvedValue({ _id: 'existing-user', email: 'synthetic@example.com', googleId: 'google-user', emailVerified: true, save: vi.fn().mockResolvedValue(undefined) });
  mocks.welcome.mockResolvedValue(undefined);
});

describe('native Google authentication contract', () => {
  it('verifies the native ID token against server-configured audiences and resolves the existing account', async () => {
    const user = await authorize({ idToken: 'synthetic-id-token' }, {});
    expect(mocks.verify).toHaveBeenCalledWith({ idToken: 'synthetic-id-token', audience: ['synthetic-web-client', 'synthetic-android-client'] });
    expect(mocks.findUser).toHaveBeenCalledWith({ $or: [{ email: 'synthetic@example.com' }, { googleId: 'google-user' }] });
    expect(user).toMatchObject({ id: 'existing-user', email: 'synthetic@example.com' });
    expect(mocks.createUser).not.toHaveBeenCalled();
  });

  it('rejects an invalid or wrong-audience token before accessing user data', async () => {
    mocks.verify.mockRejectedValueOnce(new Error('Token verification failed'));
    await expect(authorize({ idToken: 'invalid-token' }, {})).rejects.toThrow('Token verification failed');
    expect(mocks.connect).not.toHaveBeenCalled();
    expect(mocks.findUser).not.toHaveBeenCalled();
  });

  it.each([
    { sub: 'google-user', email: 'synthetic@example.com', email_verified: false },
    { sub: 'google-user', email_verified: true },
  ])('rejects claims without a verified email: %j', async payload => {
    mocks.verify.mockResolvedValueOnce({ getPayload: () => payload });
    await expect(authorize({ idToken: 'synthetic-id-token' }, {})).rejects.toThrow('Google account could not be verified');
    expect(mocks.connect).not.toHaveBeenCalled();
  });

  it('rejects a missing ID token', async () => {
    await expect(authorize(undefined, {})).rejects.toThrow('Missing Google token');
    expect(mocks.verify).not.toHaveBeenCalled();
  });

  it('fails closed when server audiences are not configured', async () => {
    vi.stubEnv('GOOGLE_CLIENT_ID', '');
    vi.stubEnv('GOOGLE_ANDROID_CLIENT_ID', '');
    await expect(authorize({ idToken: 'synthetic-id-token' }, {})).rejects.toThrow('Google sign-in is not configured');
    expect(mocks.verify).not.toHaveBeenCalled();
    expect(mocks.connect).not.toHaveBeenCalled();
  });
});
