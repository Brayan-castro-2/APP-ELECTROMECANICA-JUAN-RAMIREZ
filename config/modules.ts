/**
 * Feature Flags Configuration
 * Control which modules are enabled in the application
 */

export const FEATURE_FLAGS = {
  // Analytics module with charts and advanced metrics
  showAnalytics: true,
  
  // Appointment scheduling module
  showAgenda: true,
  
  // Debt alert system in reception
  showDebtAlert: true,
  
  // Show visit history when searching for a vehicle
  showHistoryInReception: true,
  
  // Welcome banner for version 2.0
  showWelcomeBanner: true,
  
  // "NUEVO" badges on new features
  showNewBadges: true,
} as const;

export type FeatureFlags = typeof FEATURE_FLAGS;
