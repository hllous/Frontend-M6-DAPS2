const responsePaths = new WeakMap<Response, string>();

export function rememberBffPath(response: Response, path: string): void {
  responsePaths.set(response, path);
}

export function bffPathForResponse(response: Response): string | undefined {
  return responsePaths.get(response);
}
