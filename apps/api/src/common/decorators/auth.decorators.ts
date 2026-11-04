import { createParamDecorator, type CustomDecorator, type ExecutionContext, SetMetadata } from "@nestjs/common"
import type { UserRole } from "@levelusp/contracts"
import type { AuthenticatedRequest, AuthUser } from "../http/request"

export const IS_PUBLIC = "lvl:isPublic"
export const ROLES = "lvl:roles"
export const OPTIONAL_AUTH = "lvl:optionalAuth"

/** Rota acessível sem login. */
export const Public = (): CustomDecorator<string> => SetMetadata(IS_PUBLIC, true)
/** Rota pública que, se houver sessão, identifica o usuário. */
export const OptionalAuth = (): CustomDecorator<string> => SetMetadata(OPTIONAL_AUTH, true)
/** Restringe a papéis específicos (além de exigir login). */
export const Roles = (...roles: UserRole[]): CustomDecorator<string> => SetMetadata(ROLES, roles)

/** Usuário autenticado da requisição. */
export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser | undefined => {
  return context.switchToHttp().getRequest<AuthenticatedRequest>().user
})
