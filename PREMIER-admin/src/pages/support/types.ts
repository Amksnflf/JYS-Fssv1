export interface SupportTicket {
  id: number;
  ticketNo: string;
  userId: number;
  userUid?: string;
  userAccount?: string;
  source: string;
  channel: string;
  category: string;
  subcategory?: string;
  subject: string;
  priority: number;
  status: number;
  vendorTicketId?: string;
  assignedAdminId?: number | null;
  assignedGroup?: string | null;
  lastRepliedByType?: number | null;
  lastReplyAt?: string | null;
  riskLevel?: number;
  relatedOrderNo?: string | null;
  relatedSymbol?: string | null;
  relatedCoin?: string | null;
  relatedChain?: string | null;
  lang?: string | null;
  deviceInfo?: string | null;
  remark?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface SupportTicketMessage {
  id: number;
  ticketId: number;
  senderType: number;
  senderId?: number | null;
  messageType: string;
  content?: string | null;
  attachments?: string | null;
  internalOnly: number;
  createdAt?: string;
}

export interface SupportTicketDetail {
  ticket: SupportTicket;
  messages: SupportTicketMessage[];
}

export interface SupportConfigItem {
  id?: number;
  configKey: string;
  configValue: string;
  module?: string;
  remark?: string;
  updatedAt?: string;
}
