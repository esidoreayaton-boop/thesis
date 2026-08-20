// API Service Layer for Smart Barangay System

export interface DbStatusResponse {
  connected: boolean;
  mode: string;
  host?: string;
  database?: string;
  port?: number;
  error?: string;
  help?: string;
}

export interface DocumentRequest {
  id: number;
  request_code: string;
  resident_id?: number;
  resident_name: string;
  document_type: string;
  purpose?: string;
  status: 'Pending' | 'Processing' | 'Completed' | 'Rejected';
  requested_at?: string;
  processed_at?: string | null;
  processed_by?: string;
}

export interface Resident {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth: string;
  gender: 'Male' | 'Female' | 'Other';
  civil_status?: string;
  address: string;
  household_id: string;
  phone?: string;
  email?: string;
}

export interface SystemUser {
  id: number;
  name: string;
  email: string;
  role: 'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident';
  status: 'Active' | 'Inactive';
  last_login?: string;
}

export interface PendingResident {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  submitted_id?: string | null;
  submitted_at?: string;
  verification_status: 'Pending_Review' | 'Verified' | 'Rejected';
}

export interface ImmunizationRecord {
  id: number;
  resident_id?: number;
  child_name: string;
  parent_phone?: string;
  vaccine_name: string;
  dose_number: number;
  status: 'Completed' | 'Scheduled' | 'Overdue';
  date_administered?: string | null;
  due_date: string;
  days_overdue?: number;
  administered_by?: string;
}

export interface MaternalRecord {
  id: number;
  resident_id?: number;
  mother_name: string;
  age: number;
  pregnancy_status: string;
  expected_due_date?: string | null;
  last_visit: string;
  next_visit: string;
  risk_level?: 'Low' | 'Moderate' | 'High';
  notes?: string;
}

export interface SmsNotification {
  id: number;
  recipient_name: string;
  recipient_phone: string;
  type: string;
  message: string;
  status: 'Sent' | 'Failed' | 'Pending';
  sent_at?: string;
}

const API_BASE = '/api';

export const apiService = {
  // DB Health Check
  async getDbStatus(): Promise<DbStatusResponse> {
    try {
      const res = await fetch(`${API_BASE}/db-status`);
      if (!res.ok) throw new Error('Status check failed');
      return await res.json();
    } catch (err) {
      return {
        connected: false,
        mode: 'In-Memory Fallback',
        error: 'API Proxy server offline'
      };
    }
  },

  // Auth
  async login(email: string, password?: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        // Return error data but don't throw — caller checks data.success
        return { success: false, message: data.message || `Server error: ${res.status}` };
      }
      return data;
    } catch (err) {
      return { success: false, message: 'Cannot connect to server. Please check your connection.' };
    }
  },

  // Stats
  async getAdminStats() {
    const res = await fetch(`${API_BASE}/stats/admin`);
    return await res.json();
  },

  async getBhwStats() {
    const res = await fetch(`${API_BASE}/stats/bhw`);
    return await res.json();
  },

  // Documents
  async getDocuments(): Promise<DocumentRequest[]> {
    const res = await fetch(`${API_BASE}/documents`);
    return await res.json();
  },

  async createDocument(data: Partial<DocumentRequest>): Promise<DocumentRequest> {
    const res = await fetch(`${API_BASE}/documents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateDocumentStatus(id: number, status: string, processed_by?: string) {
    const res = await fetch(`${API_BASE}/documents/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, processed_by })
    });
    return await res.json();
  },

  async deleteDocument(id: number) {
    const res = await fetch(`${API_BASE}/documents/${id}`, { method: 'DELETE' });
    return await res.json();
  },

  // Residents
  async getResidents(): Promise<Resident[]> {
    const res = await fetch(`${API_BASE}/residents`);
    return await res.json();
  },

  async createResident(data: Partial<Resident>): Promise<Resident> {
    const res = await fetch(`${API_BASE}/residents`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // System Users
  async getUsers(): Promise<SystemUser[]> {
    const res = await fetch(`${API_BASE}/users`);
    return await res.json();
  },

  async createUser(data: Partial<SystemUser>): Promise<SystemUser> {
    const res = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async deleteUser(id: number) {
    const res = await fetch(`${API_BASE}/users/${id}`, { method: 'DELETE' });
    return await res.json();
  },

  // Immunizations
  async getImmunizations(): Promise<ImmunizationRecord[]> {
    const res = await fetch(`${API_BASE}/immunizations`);
    return await res.json();
  },

  async createImmunization(data: Partial<ImmunizationRecord>): Promise<ImmunizationRecord> {
    const res = await fetch(`${API_BASE}/immunizations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async updateImmunization(id: number, status: string, administered_by?: string) {
    const res = await fetch(`${API_BASE}/immunizations/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, administered_by })
    });
    return await res.json();
  },

  // Maternal
  async getMaternalRecords(): Promise<MaternalRecord[]> {
    const res = await fetch(`${API_BASE}/maternal`);
    return await res.json();
  },

  async createMaternalRecord(data: Partial<MaternalRecord>): Promise<MaternalRecord> {
    const res = await fetch(`${API_BASE}/maternal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // SMS Notifications
  async getNotifications(): Promise<SmsNotification[]> {
    const res = await fetch(`${API_BASE}/notifications`);
    return await res.json();
  },

  async sendNotification(data: Partial<SmsNotification>): Promise<SmsNotification> {
    const res = await fetch(`${API_BASE}/notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Auth Registration
  async register(data: { name: string; email: string; password?: string; role?: string; address?: string; phone?: string; submitted_id?: string }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Update Profile (password and contact number only)
  async updateProfile(data: { id?: number; email?: string; password?: string; phone?: string }) {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Pending Resident Registrations (Admin)
  async getPendingResidents(): Promise<PendingResident[]> {
    const res = await fetch(`${API_BASE}/residents/pending`);
    return await res.json();
  },

  // Check live verification status for a resident by email
  async checkVerificationStatus(email: string) {
    try {
      const res = await fetch(`${API_BASE}/auth/check-status?email=${encodeURIComponent(email)}`);
      return await res.json();
    } catch {
      return null;
    }
  },

  async approveResident(id: number, approved_by?: string) {
    const res = await fetch(`${API_BASE}/residents/${id}/approve`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ approved_by })
    });
    return await res.json();
  },

  async rejectResident(id: number) {
    const res = await fetch(`${API_BASE}/residents/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    return await res.json();
  },

  // Intra-System Messenger
  async getMessages() {
    try {
      const res = await fetch(`${API_BASE}/messages`);
      if (!res.ok) throw new Error('Failed to fetch messages');
      return await res.json();
    } catch (err) {
      console.warn('getMessages error:', err);
      return [];
    }
  },

  async sendMessage(data: { sender_name: string; sender_role: string; recipient_role?: string; message: string }) {
    const res = await fetch(`${API_BASE}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to send message');
    return await res.json();
  },

  // Resident 360 Full Profile
  async getResidentFullProfile(id: number) {
    const res = await fetch(`${API_BASE}/residents/${id}/full-profile`);
    return await res.json();
  },

  // Smart AI Chatbot
  async askChatbot(question: string) {
    const res = await fetch(`${API_BASE}/chatbot`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question })
    });
    return await res.json();
  }
};

