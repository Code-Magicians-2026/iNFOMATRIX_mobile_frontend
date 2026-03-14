export interface AuthSession {
  email: string;
  accessToken: string;
  refreshToken: string | null;
  expiresIn: number;
  tokenType: string;
}
