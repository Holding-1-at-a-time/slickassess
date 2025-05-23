/**
 * Permission system types and constants
 */

// Define all possible permissions in the system
export enum Permission {
  // Organization permissions
  MANAGE_ORGANIZATION = "manage_organization",
  INVITE_MEMBERS = "invite_members",
  REMOVE_MEMBERS = "remove_members",
  CHANGE_MEMBER_ROLES = "change_member_roles",

  // Client permissions
  VIEW_CLIENTS = "view_clients",
  CREATE_CLIENTS = "create_clients",
  EDIT_CLIENTS = "edit_clients",
  DELETE_CLIENTS = "delete_clients",

  // Vehicle permissions
  VIEW_VEHICLES = "view_vehicles",
  CREATE_VEHICLES = "create_vehicles",
  EDIT_VEHICLES = "edit_vehicles",
  DELETE_VEHICLES = "delete_vehicles",

  // Assessment permissions
  VIEW_ASSESSMENTS = "view_assessments",
  CREATE_ASSESSMENTS = "create_assessments",
  EDIT_ASSESSMENTS = "edit_assessments",
  DELETE_ASSESSMENTS = "delete_assessments",
  APPROVE_ASSESSMENTS = "approve_assessments",

  // Report permissions
  VIEW_REPORTS = "view_reports",
  CREATE_REPORTS = "create_reports",
  SHARE_REPORTS = "share_reports",

  // Billing permissions
  VIEW_BILLING = "view_billing",
  MANAGE_BILLING = "manage_billing",

  // Analytics permissions
  VIEW_ANALYTICS = "view_analytics",
  EXPORT_ANALYTICS = "export_analytics",

  // AI features permissions
  USE_AI_FEATURES = "use_ai_features",
  TRAIN_AI_MODELS = "train_ai_models",

  // Calendar permissions
  VIEW_CALENDAR = "view_calendar",
  MANAGE_CALENDAR = "manage_calendar",

  // Settings permissions
  VIEW_SETTINGS = "view_settings",
  MANAGE_SETTINGS = "manage_settings",
}

// Define role types
export type Role = "owner" | "admin" | "manager" | "assessor" | "viewer" | "client"

// Define permission sets for each role
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: Object.values(Permission), // Owners have all permissions

  admin: [
    // Organization permissions
    Permission.INVITE_MEMBERS,
    Permission.REMOVE_MEMBERS,
    Permission.CHANGE_MEMBER_ROLES,

    // All other permissions except some organization management
    ...Object.values(Permission).filter((p) => p !== Permission.MANAGE_ORGANIZATION),
  ],

  manager: [
    // Client permissions
    Permission.VIEW_CLIENTS,
    Permission.CREATE_CLIENTS,
    Permission.EDIT_CLIENTS,

    // Vehicle permissions
    Permission.VIEW_VEHICLES,
    Permission.CREATE_VEHICLES,
    Permission.EDIT_VEHICLES,

    // Assessment permissions
    Permission.VIEW_ASSESSMENTS,
    Permission.CREATE_ASSESSMENTS,
    Permission.EDIT_ASSESSMENTS,
    Permission.APPROVE_ASSESSMENTS,

    // Report permissions
    Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS,
    Permission.SHARE_REPORTS,

    // Analytics permissions
    Permission.VIEW_ANALYTICS,

    // AI features permissions
    Permission.USE_AI_FEATURES,

    // Calendar permissions
    Permission.VIEW_CALENDAR,
    Permission.MANAGE_CALENDAR,

    // Settings permissions
    Permission.VIEW_SETTINGS,
  ],

  assessor: [
    // Client permissions
    Permission.VIEW_CLIENTS,

    // Vehicle permissions
    Permission.VIEW_VEHICLES,

    // Assessment permissions
    Permission.VIEW_ASSESSMENTS,
    Permission.CREATE_ASSESSMENTS,
    Permission.EDIT_ASSESSMENTS,

    // Report permissions
    Permission.VIEW_REPORTS,
    Permission.CREATE_REPORTS,

    // AI features permissions
    Permission.USE_AI_FEATURES,

    // Calendar permissions
    Permission.VIEW_CALENDAR,
  ],

  viewer: [
    // Client permissions
    Permission.VIEW_CLIENTS,

    // Vehicle permissions
    Permission.VIEW_VEHICLES,

    // Assessment permissions
    Permission.VIEW_ASSESSMENTS,

    // Report permissions
    Permission.VIEW_REPORTS,

    // Analytics permissions
    Permission.VIEW_ANALYTICS,

    // Calendar permissions
    Permission.VIEW_CALENDAR,
  ],

  client: [
    // Limited permissions for clients
    Permission.VIEW_ASSESSMENTS,
    Permission.VIEW_REPORTS,
  ],
}

// Helper function to check if a role has a specific permission
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) || false
}

// Helper function to get all permissions for a role
export function getPermissionsForRole(role: Role): Permission[] {
  return ROLE_PERMISSIONS[role] || []
}
