export const SESSION_MUTATION_HEADERS = {
  "content-type": "application/json",
  "x-requested-with": "XMLHttpRequest",
} as const;

export type SessionMutationRejection = {
  status: 403 | 415;
  message: string;
};

export function getSessionMutationRejection(request: Request): SessionMutationRejection | undefined {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    return { status: 415, message: "Se requiere una solicitud JSON." };
  }

  if (request.headers.get("x-requested-with")?.toLowerCase() !== "xmlhttprequest") {
    return { status: 403, message: "Solicitud no permitida." };
  }
}
