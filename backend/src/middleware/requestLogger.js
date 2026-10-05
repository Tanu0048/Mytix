import morgan from "morgan";
import { logger } from "../lib/logger.js";

const morganStream = {
  write: (message) => {
    logger.http(message.trim());
  }
};

export const requestLogger = morgan(
  ':remote-addr - :method :url :status :res[content-length] - :response-time ms',
  { stream: morganStream }
);
