namespace Log {

  export interface ILog {
    seq: string;
    timestamp: string;
    level: string;
    logger: string;
    message: string;
    sanitizedMessage: string;
  }

}
