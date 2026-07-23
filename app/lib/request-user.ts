export interface RequestUser {
  id: string;
  role: string | null;
  email: string;
}

export function getRequestUser(request: Request): RequestUser | null {
  const id = request.headers.get("x-user-id");
  const email = request.headers.get("x-user-email");
  if (!id || !email) return null;
  return {
    id,
    email,
    role: request.headers.get("x-user-role"),
  };
}
