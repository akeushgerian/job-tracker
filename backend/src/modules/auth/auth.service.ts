import { hashPassword, verifyPassword } from '../../lib/password.js';
import { signToken } from '../../lib/jwt.js';
import { EmailAlreadyInUseError, InvalidCredentialsError } from '../../lib/errors.js';
import type { UserRow } from '../../db/schema.js';
import { AuthRepository } from './auth.repository.js';
import type { LoginInput, RegisterInput, UserPublic } from './auth.schemas.js';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResult {
  user: UserPublic;
  tokens: AuthTokens;
}

function toPublicUser(row: UserRow): UserPublic {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    createdAt: row.createdAt.toISOString(),
  };
}

function issueTokens(user: UserRow): AuthTokens {
  const payload = { sub: user.id, email: user.email };
  return {
    accessToken: signToken('access', payload),
    refreshToken: signToken('refresh', payload),
  };
}

export class AuthService {
  constructor(private readonly repo: AuthRepository) {}

  async register(input: RegisterInput): Promise<AuthResult> {
    const existing = await this.repo.findByEmail(input.email);
    if (existing) {
      throw new EmailAlreadyInUseError(input.email);
    }

    const passwordHash = await hashPassword(input.password);
    const user = await this.repo.create({
      email: input.email,
      passwordHash,
      name: input.name,
    });

    return { user: toPublicUser(user), tokens: issueTokens(user) };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const user = await this.repo.findByEmail(input.email);
    if (!user) {
      throw new InvalidCredentialsError();
    }

    const valid = await verifyPassword(input.password, user.passwordHash);
    if (!valid) {
      throw new InvalidCredentialsError();
    }

    return { user: toPublicUser(user), tokens: issueTokens(user) };
  }

  async refresh(userId: string): Promise<AuthResult> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    return { user: toPublicUser(user), tokens: issueTokens(user) };
  }

  async getProfile(userId: string): Promise<UserPublic> {
    const user = await this.repo.findById(userId);
    if (!user) {
      throw new InvalidCredentialsError();
    }
    return toPublicUser(user);
  }
}
