import type {
  Organization,
  User,
  Membership,
  Client,
  Service,
  Proposal,
  ProposalItem,
  Attachment,
} from "@/generated/prisma/client";
import { OrgRole, ProposalStatus } from "@/generated/prisma/enums";

// Re-export Prisma types
export type {
  Organization,
  User,
  Membership,
  Client,
  Service,
  Proposal,
  ProposalItem,
  Attachment,
};
export { OrgRole, ProposalStatus };

// Extended types with relations
export type ProposalWithItems = Proposal & {
  items: ProposalItem[];
  client: Client | null;
  user: Pick<User, "id" | "name" | "email">;
};

export type UserWithMemberships = User & {
  memberships: (Membership & { organization: Organization })[];
};

// Session types
export interface SessionUser {
  id: string;
  name: string;
  email: string;
  isSuperAdmin: boolean;
  organizationId: string;
  orgRole: OrgRole;
  orgName: string;
  orgSlug: string;
}

// API response types
export interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Body image for proposal documents (legacy, kept for backward compat)
export interface ProposalBodyImage {
  id: string;
  url: string;
  caption: string;
  position: "after-client" | "after-services" | "after-observations";
  width: number; // 50-100
}

// Content block for the block editor
export interface ContentBlock {
  id: string;
  type: "text" | "image" | "services" | "client-info";
  order: number;
  content?: string;   // HTML for text blocks
  url?: string;       // URL for image blocks
  caption?: string;   // Caption for image blocks
  width?: number;     // 50-100 for image blocks
}

// Form types for proposals
export interface ProposalFormData {
  clientName: string;
  projectName: string;
  date: string;
  observations: string;
  clientId?: string;
  headerImageUrl?: string;
  footerImageUrl?: string;
  bodyImages?: ProposalBodyImage[];
  contentBlocks?: ContentBlock[];
}

export interface SelectedService {
  serviceId: string;
  hours: number;
  hourlyRate: number;
  selectedDeliverables: string[];
  customName: string;
  customDescription: string;
}

export type SelectedServices = Record<string, SelectedService>;
