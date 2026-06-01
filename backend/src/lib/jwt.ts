import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { UnauthorizedError } from './errors.js';

export interface TokenPayload {
  sub: string;
  email: string;
}

type TokenKind = 'access' | 'refresh';

function secretFor(kind: TokenKind): string {
  return kind === 'access' ? config.JWT_ACCESS_SECRET : config.JWT_REFRESH_SECRET;
}

function ttlFor(kind: TokenKind): string {
  return kind === 'access' ? config.ACCESS_TOKEN_TTL : config.REFRESH_TOKEN_TTL;
}

export function signToken(kind: TokenKind, payload: TokenPayload): string {
  return jwt.sign(payload, secretFor(kind), {
    expiresIn: ttlFor(kind),
  } as jwt.SignOptions);
}

export function verifyToken(kind: TokenKind, token: string): TokenPayload {
  try {
    const decoded = jwt.verify(token, secretFor(kind));
    if (typeof decoded === 'string') {
      throw new UnauthorizedError('Malformed token');
    }
    return { sub: String(decoded.sub), email: String(decoded.email) };
  } catch {
    throw new UnauthorizedError('Invalid or expired token');
  }
}
