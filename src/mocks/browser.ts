import { setupWorker } from "msw/browser";
import { handlers } from "./handlers.shared";

export const worker = setupWorker(...handlers);
