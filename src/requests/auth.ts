import { publicClient } from "../http/clients";
import type { LoginRequest, LoginResponse } from "../types/auth";

export async function login(request: LoginRequest): Promise<LoginResponse> {
  const { data } = await publicClient.post<LoginResponse>(
    "/users/login",
    request
  );
  return data;
}

/**
 * Hosted demo sign-in. Sends no body: a JSON object with any keys is 400.
 * 404 means demo hosting is unset on this API, not a failed password grant.
 */
export async function demoLogin(): Promise<LoginResponse> {
  const { data } = await publicClient.request<LoginResponse>({
    method: "POST",
    url: "/users/demo-login",
    // Axios must not serialize `{}` (or any keyed object) as the body.
    transformRequest: [
      (_body, headers) => {
        headers.delete("Content-Type");
        return undefined;
      },
    ],
  });
  return data;
}

export async function logout(refreshToken: string): Promise<void> {
  await publicClient.post("/users/logout", { refresh_token: refreshToken });
}
