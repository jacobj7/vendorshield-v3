export type UserRole = "admin" | "reviewer" | "vendor";

export type InvitationStatus = "pending" | "accepted" | "expired" | "revoked";

export type CredentialStatus =
  | "active"
  | "expired"
  | "revoked"
  | "pending_review";

export type AlertSeverity = "critical" | "high" | "medium" | "low" | "info";

export type AlertStatus = "open" | "acknowledged" | "resolved" | "dismissed";

export type RiskLevel = "critical" | "high" | "medium" | "low";

export type AuditAction =
  | "vendor_created"
  | "vendor_updated"
  | "vendor_deleted"
  | "credential_uploaded"
  | "credential_approved"
  | "credential_rejected"
  | "credential_revoked"
  | "invitation_sent"
  | "invitation_accepted"
  | "invitation_revoked"
  | "alert_created"
  | "alert_acknowledged"
  | "alert_resolved"
  | "alert_dismissed"
  | "risk_score_updated"
  | "review_action_created"
  | "user_login"
  | "user_logout"
  | "user_created"
  | "user_updated"
  | "user_role_changed";

export type ReviewActionType =
  | "approve"
  | "reject"
  | "request_info"
  | "escalate"
  | "flag"
  | "clear";

export interface User {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  vendorId: string | null;
  emailVerified: Date | null;
  image: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Vendor {
  id: string;
  name: string;
  description: string | null;
  website: string | null;
  contactEmail: string;
  contactPhone: string | null;
  address: string | null;
  industry: string | null;
  taxId: string | null;
  registrationNumber: string | null;
  isActive: boolean;
  onboardedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  riskScore?: RiskScore | null;
  credentials?: Credential[];
  alerts?: Alert[];
}

export interface Credential {
  id: string;
  vendorId: string;
  name: string;
  type: string;
  description: string | null;
  fileUrl: string | null;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  status: CredentialStatus;
  issuedAt: Date | null;
  expiresAt: Date | null;
  issuingAuthority: string | null;
  licenseNumber: string | null;
  notes: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  vendor?: Vendor;
  reviewer?: User | null;
}

export interface Invitation {
  id: string;
  email: string;
  vendorId: string | null;
  invitedBy: string;
  role: UserRole;
  status: InvitationStatus;
  token: string;
  expiresAt: Date;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  vendor?: Vendor | null;
  inviter?: User;
}

export interface RiskScore {
  id: string;
  vendorId: string;
  score: number;
  level: RiskLevel;
  factors: RiskFactor[];
  calculatedAt: Date;
  calculatedBy: string | null;
  notes: string | null;
  previousScore: number | null;
  createdAt: Date;
  updatedAt: Date;
  vendor?: Vendor;
}

export interface RiskFactor {
  category: string;
  label: string;
  weight: number;
  score: number;
  description: string | null;
}

export interface Alert {
  id: string;
  vendorId: string;
  title: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  category: string | null;
  source: string | null;
  metadata: Record<string, unknown> | null;
  acknowledgedBy: string | null;
  acknowledgedAt: Date | null;
  resolvedBy: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  vendor?: Vendor;
  acknowledger?: User | null;
  resolver?: User | null;
}

export interface AuditLog {
  id: string;
  userId: string | null;
  vendorId: string | null;
  action: AuditAction;
  entityType: string;
  entityId: string | null;
  description: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
  user?: User | null;
  vendor?: Vendor | null;
}

export interface ReviewAction {
  id: string;
  credentialId: string;
  reviewerId: string;
  action: ReviewActionType;
  notes: string | null;
  requestedInfo: string | null;
  createdAt: Date;
  updatedAt: Date;
  credential?: Credential;
  reviewer?: User;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface DashboardStats {
  totalVendors: number;
  activeVendors: number;
  pendingCredentials: number;
  openAlerts: number;
  criticalAlerts: number;
  highRiskVendors: number;
  recentActivity: AuditLog[];
}

export interface VendorWithDetails extends Vendor {
  riskScore: RiskScore | null;
  credentials: Credential[];
  alerts: Alert[];
  openAlertsCount: number;
  pendingCredentialsCount: number;
}

export interface CredentialWithVendor extends Credential {
  vendor: Vendor;
}

export interface AlertWithVendor extends Alert {
  vendor: Vendor;
}

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: UserRole;
  vendorId: string | null;
  image: string | null;
}
