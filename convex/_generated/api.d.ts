/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as actions_generate_qr_code from "../actions/generate-qr-code.js";
import type * as admin from "../admin.js";
import type * as ai_training from "../ai-training.js";
import type * as analytics from "../analytics.js";
import type * as annotations from "../annotations.js";
import type * as appointments from "../appointments.js";
import type * as assessments from "../assessments.js";
import type * as billing from "../billing.js";
import type * as calendarEvents from "../calendarEvents.js";
import type * as calendarIntegration from "../calendarIntegration.js";
import type * as clients from "../clients.js";
import type * as images from "../images.js";
import type * as notificationTemplates from "../notificationTemplates.js";
import type * as notifications from "../notifications.js";
import type * as publicAssessments from "../publicAssessments.js";
import type * as reports from "../reports.js";
import type * as scheduled_jobs from "../scheduled-jobs.js";
import type * as settings from "../settings.js";
import type * as tenants from "../tenants.js";
import type * as userClientPreferences from "../userClientPreferences.js";
import type * as utils_auth from "../utils/auth.js";
import type * as utils_client_helpers from "../utils/client-helpers.js";
import type * as utils_rate_limiter from "../utils/rate-limiter.js";
import type * as vehicles from "../vehicles.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  "actions/generate-qr-code": typeof actions_generate_qr_code;
  admin: typeof admin;
  "ai-training": typeof ai_training;
  analytics: typeof analytics;
  annotations: typeof annotations;
  appointments: typeof appointments;
  assessments: typeof assessments;
  billing: typeof billing;
  calendarEvents: typeof calendarEvents;
  calendarIntegration: typeof calendarIntegration;
  clients: typeof clients;
  images: typeof images;
  notificationTemplates: typeof notificationTemplates;
  notifications: typeof notifications;
  publicAssessments: typeof publicAssessments;
  reports: typeof reports;
  "scheduled-jobs": typeof scheduled_jobs;
  settings: typeof settings;
  tenants: typeof tenants;
  userClientPreferences: typeof userClientPreferences;
  "utils/auth": typeof utils_auth;
  "utils/client-helpers": typeof utils_client_helpers;
  "utils/rate-limiter": typeof utils_rate_limiter;
  vehicles: typeof vehicles;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
