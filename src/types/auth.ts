export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  id_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
}

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface LogoutRequest {
  refresh_token?: string;
}
