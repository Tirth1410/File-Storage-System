export class Logger {
  private context: string;

  constructor(context: string = "App") {
    this.context = context;
  }

  /**
   * Create a new logger instance with a specific context.
   */
  static withContext(context: string): Logger {
    return new Logger(context);
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.context}] ${message}`;
  }

  info(message: string, ...optionalParams: unknown[]) {
    console.info(this.formatMessage("INFO", message), ...optionalParams);
  }

  warn(message: string, ...optionalParams: unknown[]) {
    console.warn(this.formatMessage("WARN", message), ...optionalParams);
  }

  error(message: string, ...optionalParams: unknown[]) {
    console.error(this.formatMessage("ERROR", message), ...optionalParams);
  }

  debug(message: string, ...optionalParams: unknown[]) {
    console.debug(this.formatMessage("DEBUG", message), ...optionalParams);
  }
}

export const logger = new Logger();

export function withLogging<
  TArgs extends unknown[],
  TRequest extends Request = Request,
>(
  handler: (request: TRequest, ...args: TArgs) => Promise<Response> | Response,
  context: string = "API",
) {
  const routeLogger = Logger.withContext(context);

  return async (request: TRequest, ...rest: TArgs): Promise<Response> => {
    const method = request.method;
    const urlObj = new URL(request.url);
    const url = urlObj.pathname + urlObj.search;

    const startTime = Date.now();
    routeLogger.info(`REQUEST: ${method} ${url}`);

    try {
      const response = await handler(request, ...rest);
      const duration = Date.now() - startTime;

      if (response instanceof Response) {
        routeLogger.info(
          `RESPONSE: ${method} ${url} - Status: ${response.status} - ${duration}ms`,
        );
      } else {
        routeLogger.info(`RESPONSE: ${method} ${url} - ${duration}ms`);
      }

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      routeLogger.error(
        `RESPONSE FAILED: ${method} ${url} - ${duration}ms`,
        error,
      );
      throw error;
    }
  };
}
