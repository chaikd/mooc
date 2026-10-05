import { Role, RoleType, User, mdaction } from '@mooc/db-shared/index.ts';

export interface PermissionContext {
  userId: string;
  roleId: string;
  roleCode: string;
  permissions: string[];
}

function normalizePermissions(value: RoleType['permissions']): string[] {
  return Array.isArray(value)
    ? value
    : String(value || '').split(',').filter(Boolean);
}

export async function getPermissionContext(
  userId?: string,
): Promise<PermissionContext | null> {
  if (!userId) return null;

  const user = await mdaction.findOneDoc(User, { _id: userId }, 'role');
  if (!user?.role) return null;

  const role = await mdaction.findOneDoc(Role, { _id: user.role }) as RoleType | null;
  if (!role) return null;

  return {
    userId,
    roleId: String(role._id || user.role),
    roleCode: role.code,
    permissions: normalizePermissions(role.permissions),
  };
}

export async function isSystemAdmin(userId?: string): Promise<boolean> {
  const context = await getPermissionContext(userId);
  return context?.roleCode === 'SYSTEM';
}
