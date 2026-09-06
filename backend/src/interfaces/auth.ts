export interface AuthRequestBody {
  username?: string;
  password?: string;
  rememberMe?: boolean;
}

export interface JwtPayload {
  id: number;
  username: string;
  role: string;
  rememberMe?: boolean;
}
