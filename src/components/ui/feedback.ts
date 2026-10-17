import { toast } from "sonner";

/** Result of an action that worked: a transient toast. */
function notifySuccess(message: string) {
  return toast.success(message);
}

/** Result of an action that failed: stays until dismissed so it can be read and retried. */
function notifyError(message: string) {
  return toast.error(message, { duration: Infinity, closeButton: true });
}

export { notifyError, notifySuccess };
