import { jest } from '@jest/globals';

// ── Mock 
const mockSend = jest.fn().mockResolvedValue({});

jest.unstable_mockModule('@slack/webhook', () => ({
  IncomingWebhook: jest.fn(() => ({ send: mockSend })),
}));

let sendSlackNotification, notifySlack5xxError, loggerStream;
let notificationService;
let errorHandler;
let AppError;

beforeAll(async () => {
  process.env.SLACK_WEBHOOK = 'https://hooks.slack.com/services/test';

  const handleLoggerMod = await import('../src/utils/handleLogger.js');
  sendSlackNotification = handleLoggerMod.sendSlackNotification;
  notifySlack5xxError   = handleLoggerMod.notifySlack5xxError;
  loggerStream          = handleLoggerMod.loggerStream;

  const notifMod = await import('../src/services/notification.service.js');
  notificationService = notifMod.default;

  const errHandlerMod = await import('../src/middlewares/error-handler.js');
  errorHandler = errHandlerMod.errorHandler;

  const appErrorMod = await import('../src/utils/AppError.js');
  AppError = appErrorMod.AppError;
});

afterEach(() => {
  mockSend.mockClear();
});

// handleLogger tests

describe('sendSlackNotification', () => {
  it('calls webhook.send with the correct text', async () => {
    await sendSlackNotification('Test message');
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend).toHaveBeenCalledWith({ text: 'Test message' });
  });

  it('does not throw when webhook.send rejects', async () => {
    mockSend.mockRejectedValueOnce(new Error('Network error'));
    await expect(sendSlackNotification('fail')).resolves.toBeUndefined();
  });
});

describe('notifySlack5xxError', () => {
  it('sends a message containing method, path and status', () => {
    const req = { method: 'POST', originalUrl: '/api/user/register' };
    const err = { statusCode: 500, message: 'DB connection lost', stack: 'Error: DB...' };

    notifySlack5xxError(req, err);

    expect(mockSend).toHaveBeenCalledTimes(1);
    const { text } = mockSend.mock.calls[0][0];
    expect(text).toContain('500');
    expect(text).toContain('POST');
    expect(text).toContain('/api/user/register');
    expect(text).toContain('DB connection lost');
  });

  it('includes stack trace in non-production mode', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'test';

    const req = { method: 'GET', originalUrl: '/api/test' };
    const err = { statusCode: 503, message: 'Timeout', stack: 'Error: Timeout\n  at fn' };

    notifySlack5xxError(req, err);

    const { text } = mockSend.mock.calls[0][0];
    expect(text).toContain('```');
    process.env.NODE_ENV = original;
  });

  it('omits stack trace in production mode', () => {
    const original = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    const req = { method: 'DELETE', originalUrl: '/api/admin' };
    const err = { statusCode: 500, message: 'Crash', stack: 'Error: Crash\n  at foo' };

    notifySlack5xxError(req, err);

    const { text } = mockSend.mock.calls[0][0];
    expect(text).not.toContain('```');
    process.env.NODE_ENV = original;
  });

  it('handles missing req fields gracefully (uses UNKNOWN)', () => {
    notifySlack5xxError({}, {});

    const { text } = mockSend.mock.calls[0][0];
    expect(text).toContain('UNKNOWN');
  });
});

describe('loggerStream', () => {
  it('writes trimmed message to console.error', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    loggerStream.write('request log\n');
    expect(spy).toHaveBeenCalledWith('request log');
    spy.mockRestore();
  });

  it('does NOT call mockSend (Slack) when writing to loggerStream', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    loggerStream.write('some error log\n');
    expect(mockSend).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});

// error handler -> Slack

describe('error handler → Slack', () => {
  const mockRes = () => {
    const res = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
  };

  it('calls notifySlack5xxError (→ mockSend) for a 500 AppError', () => {
    const req = { method: 'GET', originalUrl: '/api/test' };
    const err = AppError.internal('Something exploded');

    errorHandler(err, req, mockRes(), jest.fn());

    expect(mockSend).toHaveBeenCalledTimes(1);
    const { text } = mockSend.mock.calls[0][0];
    expect(text).toContain('500');
    expect(text).toContain('Something exploded');
  });

  it('calls notifySlack5xxError for a plain Error (converted to 500)', () => {
    const req = { method: 'POST', originalUrl: '/api/crash' };
    const err = new Error('Unhandled crash');

    errorHandler(err, req, mockRes(), jest.fn());

    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it('does NOT call notifySlack5xxError for a 404 AppError', () => {
    const req = { method: 'GET', originalUrl: '/api/notfound' };
    const err = AppError.notFound('Resource');

    errorHandler(err, req, mockRes(), jest.fn());

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does NOT call notifySlack5xxError for a 400 AppError', () => {
    const req = { method: 'POST', originalUrl: '/api/user' };
    const err = AppError.badRequest('Campo requerido');

    errorHandler(err, req, mockRes(), jest.fn());

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('does NOT call notifySlack5xxError for a 401 AppError', () => {
    const req = { method: 'GET', originalUrl: '/api/protected' };
    const err = AppError.unauthorized('Token inválido');

    errorHandler(err, req, mockRes(), jest.fn());

    expect(mockSend).not.toHaveBeenCalled();
  });

  it('still sends the JSON response even when Slack notification fires', () => {
    const req = { method: 'GET', originalUrl: '/api/test' };
    const err = AppError.internal('Boom');
    const res = mockRes();

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ error: true, message: 'Boom' })
    );
  });
});

// notification service → Slack 

describe('notification service → Slack', () => {
  it('sends Slack on user:registered with user email', () => {
    notificationService.emit('user:registered', { email: 'nuevo@example.com' });
    expect(mockSend).toHaveBeenCalledTimes(1);
    expect(mockSend.mock.calls[0][0].text).toContain('nuevo@example.com');
  });

  it('sends Slack on company:created with company name and CIF', () => {
    notificationService.emit('company:created', {
      companyName: 'ACME Corp',
      cif: 'A12345678',
      userName: 'John Doe',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const { text } = mockSend.mock.calls[0][0];
    expect(text).toContain('ACME Corp');
    expect(text).toContain('A12345678');
  });

  it('sends Slack on user:invited with invitee email and company', () => {
    notificationService.emit('user:invited', {
      adminName: 'Admin User',
      guestName: 'Guest Person',
      companyName: 'ACME Corp',
      email: 'guest@example.com',
    });
    expect(mockSend).toHaveBeenCalledTimes(1);
    const { text } = mockSend.mock.calls[0][0];
    expect(text).toContain('guest@example.com');
    expect(text).toContain('ACME Corp');
  });

  it('does NOT send Slack on user:verified (console only)', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    notificationService.emit('user:verified', { email: 'user@example.com' });
    expect(mockSend).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does NOT send Slack on company:joined (console only)', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    notificationService.emit('company:joined', {
      userName: 'User',
      companyName: 'ACME',
      cif: 'A12345678',
    });
    expect(mockSend).not.toHaveBeenCalled();
    spy.mockRestore();
  });

  it('does NOT send Slack on user:deleted (console only)', () => {
    const spy = jest.spyOn(console, 'log').mockImplementation(() => {});
    notificationService.emit('user:deleted', { type: 'soft', email: 'gone@example.com' });
    expect(mockSend).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
