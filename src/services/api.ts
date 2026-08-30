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
  status: 'Pending' | 'Processing' | 'Ready for Pickup' | 'Completed' | 'Rejected';
  requested_at?: string;
  processed_at?: string | null;
  processed_by?: string;
  extra_fields?: string | Record<string, string>;
}

export interface Resident {
  id: number;
  first_name: string;
  middle_name?: string;
  last_name: string;
  date_of_birth?: string;
  age?: number | string;
  gender: 'Male' | 'Female' | 'Other';
  civil_status?: string;
  purok?: string;
  barangay?: string;
  address: string;
  household_id?: string;
  phone?: string;
  email?: string;
  submitted_id?: string;
  verification_status?: string;
  rejection_reason?: string | null;
}

export interface SystemUser {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: 'superadmin' | 'admin' | 'staff' | 'bhw' | 'resident';
  status: 'Active' | 'Inactive' | 'Archived';
  barangay?: string;
  phone?: string;
  last_login?: string;
  created_at?: string;
  verification_status?: string;
}

export interface PendingResident {
  id: number;
  name: string;
  first_name?: string;
  middle_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  address?: string;
  date_of_birth?: string;
  submitted_id?: string | null;
  submitted_at?: string;
  verification_status: 'Pending_Review' | 'Verified' | 'Rejected';
}

export interface ServiceCategory {
  id: number;
  name: string;
  department: 'Barangay' | 'Health Center' | string;
  description?: string;
  status: 'Active' | 'Inactive';
  updated_at?: string;
}

export interface ActivityLog {
  id: number;
  user_name: string;
  user_role: string;
  action: string;
  action_type?: string;
  barangay?: string;
  details?: string;
  timestamp: string;
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

export interface HealthAppointment {
  id: number;
  appointment_code: string;
  resident_id?: number;
  resident_name: string;
  resident_phone?: string;
  resident_email?: string;
  barangay?: string;
  service_type: string;
  preferred_date: string;
  preferred_time?: string;
  scheduled_date?: string | null;
  scheduled_time?: string | null;
  status: 'Pending' | 'Approved' | 'Completed' | 'Cancelled' | 'Rescheduled';
  bhw_notes?: string;
  resident_notes?: string;
  attending_bhw?: string;
  created_at?: string;
  updated_at?: string;
}

export interface ClinicSchedule {
  id: number;
  title: string;
  service_type: string;
  day_of_week: string;
  time_slot: string;
  location: string;
  slots_available: number;
  bhw_in_charge: string;
  status: 'Active' | 'Suspended';
  barangay?: string;
  created_by?: string;
  created_at?: string;
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
  async getAdminStats(barangay?: string) {
    const url = barangay ? `${API_BASE}/stats/admin?barangay=${encodeURIComponent(barangay)}` : `${API_BASE}/stats/admin`;
    const res = await fetch(url);
    return await res.json();
  },

  async getBhwStats(barangay?: string) {
    const url = barangay ? `${API_BASE}/stats/bhw?barangay=${encodeURIComponent(barangay)}` : `${API_BASE}/stats/bhw`;
    const res = await fetch(url);
    return await res.json();
  },

  // Documents
  async getDocuments(barangay?: string): Promise<DocumentRequest[]> {
    const url = barangay ? `${API_BASE}/documents?barangay=${encodeURIComponent(barangay)}` : `${API_BASE}/documents`;
    const res = await fetch(url);
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
  async getResidents(barangay?: string): Promise<Resident[]> {
    const url = barangay ? `${API_BASE}/residents?barangay=${encodeURIComponent(barangay)}` : `${API_BASE}/residents`;
    const res = await fetch(url);
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

  async updateUser(id: number, data: Partial<SystemUser & { password?: string }>): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async resetUserPassword(id: number, newPassword?: string): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/users/${id}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newPassword })
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
  async register(data: { name?: string; first_name?: string; middle_name?: string; last_name?: string; date_of_birth?: string; gender?: string; civil_status?: string; email: string; password?: string; role?: string; address?: string; phone?: string; submitted_id?: string; years_of_residency?: string }) {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Update Profile (password, phone, name, address, date_of_birth)
  async updateProfile(data: { id?: number; email?: string; password?: string; phone?: string; name?: string; address?: string; date_of_birth?: string }) {
    const res = await fetch(`${API_BASE}/users/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  // Pending Resident Registrations (Admin)
  async getPendingResidents(barangay?: string): Promise<PendingResident[]> {
    const url = barangay ? `${API_BASE}/residents/pending?barangay=${encodeURIComponent(barangay)}` : `${API_BASE}/residents/pending`;
    const res = await fetch(url);
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

  async rejectResident(id: number, reason?: string) {
    const res = await fetch(`${API_BASE}/residents/${id}/reject`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason })
    });
    return await res.json();
  },

  async resubmitVerification(data: { email: string; id?: number; submitted_id: string; first_name?: string; middle_name?: string; last_name?: string; address?: string; phone?: string }) {
    const res = await fetch(`${API_BASE}/residents/resubmit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    return await res.json();
  },

  async purgeResident(id: number) {
    const res = await fetch(`${API_BASE}/residents/${id}/purge`, {
      method: 'DELETE'
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

  async sendMessage(data: { sender_name: string; sender_role: string; recipient_name?: string; recipient_role?: string; barangay?: string; message: string }) {
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

  // Service / Document Categories Management
  async getCategories(): Promise<ServiceCategory[]> {
    const res = await fetch(`${API_BASE}/categories`);
    if (!res.ok) throw new Error('Failed to fetch categories');
    return await res.json();
  },

  async updateCategory(name: string, status: 'Active' | 'Inactive'): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/categories/${encodeURIComponent(name)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    if (!res.ok) throw new Error('Failed to update category');
    return await res.json();
  },

  // Audit & Activity History Logs
  async getActivityLogs(params?: { barangay?: string; action_type?: string; search?: string; role?: string }): Promise<ActivityLog[]> {
    const query = new URLSearchParams();
    if (params?.barangay) query.append('barangay', params.barangay);
    if (params?.action_type) query.append('action_type', params.action_type);
    if (params?.search) query.append('search', params.search);
    if (params?.role) query.append('role', params.role);
    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/activity-logs${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch activity logs');
    return await res.json();
  },

  async createActivityLog(data: Partial<ActivityLog>): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/activity-logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create activity log');
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
  },

  // ───────────────────────────────────────────────────────────────
  // Email Notification API
  // ───────────────────────────────────────────────────────────────

  async getEmailStatus(): Promise<{
    configured: boolean;
    host: string;
    port: string;
    user: string | null;
    mode: 'live' | 'simulation';
    message: string;
  }> {
    const res = await fetch(`${API_BASE}/email/status`);
    return await res.json();
  },

  async sendTestEmail(to: string): Promise<{ success: boolean; simulated?: boolean; messageId?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/email/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to }),
    });
    return await res.json();
  },

  async sendAnnouncementEmail(data: {
    recipients: { email: string; name?: string }[];
    title: string;
    body: string;
    sender?: string;
  }): Promise<{ total: number; sent: number; failed: number }> {
    const res = await fetch(`${API_BASE}/email/announcement`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  async sendEmail(data: { to: string; subject: string; html?: string; text?: string }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/email/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  // ───────────────────────────────────────────────────────────────
  // Automated Scheduling API
  // ───────────────────────────────────────────────────────────────

  async getVaccineSchedules(): Promise<{
    vaccine: string;
    totalDoses: number;
    doses: { dose: number; label: string; offsetDays: number }[];
  }[]> {
    const res = await fetch(`${API_BASE}/scheduling/vaccines`);
    return await res.json();
  },

  async computeNextDose(data: {
    vaccine_name: string;
    completed_dose: number;
    administered_date?: string;
  }): Promise<{
    hasNext: boolean;
    nextDose?: number;
    nextDueDate?: string;
    label?: string;
    displayDate?: string;
  }> {
    const res = await fetch(`${API_BASE}/scheduling/next-dose`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  async computeNextMaternalVisit(data: {
    pregnancy_status: string;
    last_visit?: string;
    expected_due_date?: string;
  }): Promise<{
    nextVisit: string;
    displayDate: string;
    interval: string;
    recommendation: string;
  }> {
    const res = await fetch(`${API_BASE}/scheduling/next-maternal-visit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await res.json();
  },

  async getOverdueRecords(): Promise<{
    overdueImmunizations: any[];
    overdueMaternalVisits: any[];
  }> {
    const res = await fetch(`${API_BASE}/scheduling/overdue`);
    return await res.json();
  },

  // ───────────────────────────────────────────────────────────────
  // Health Center Appointments API
  // ───────────────────────────────────────────────────────────────

  async getAppointments(params?: {
    resident_id?: number;
    email?: string;
    status?: string;
    barangay?: string;
  }): Promise<HealthAppointment[]> {
    const query = new URLSearchParams();
    if (params?.resident_id) query.append('resident_id', String(params.resident_id));
    if (params?.email) query.append('email', params.email);
    if (params?.status) query.append('status', params.status);
    if (params?.barangay) query.append('barangay', params.barangay);

    const queryString = query.toString() ? `?${query.toString()}` : '';
    const res = await fetch(`${API_BASE}/appointments${queryString}`);
    if (!res.ok) throw new Error('Failed to fetch appointments');
    return await res.json();
  },

  async createAppointment(data: Partial<HealthAppointment>): Promise<HealthAppointment> {
    const res = await fetch(`${API_BASE}/appointments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create appointment');
    return await res.json();
  },

  async updateAppointment(id: number, data: Partial<HealthAppointment> & { user_name?: string; user_role?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update appointment');
    return await res.json();
  },

  async deleteAppointment(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/appointments/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete appointment');
    return await res.json();
  },

  // ───────────────────────────────────────────────────────────────
  // Health Center Clinic Schedules API (Posted by BHW / Admin)
  // ───────────────────────────────────────────────────────────────

  async getClinicSchedules(barangay?: string): Promise<ClinicSchedule[]> {
    const query = barangay && barangay.toLowerCase() !== 'all' ? `?barangay=${encodeURIComponent(barangay)}` : '';
    const res = await fetch(`${API_BASE}/clinic-schedules${query}`);
    if (!res.ok) throw new Error('Failed to fetch clinic schedules');
    return await res.json();
  },

  async createClinicSchedule(data: Partial<ClinicSchedule>): Promise<ClinicSchedule> {
    const res = await fetch(`${API_BASE}/clinic-schedules`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create clinic schedule');
    return await res.json();
  },

  async updateClinicSchedule(id: number, data: Partial<ClinicSchedule>): Promise<any> {
    const res = await fetch(`${API_BASE}/clinic-schedules/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update clinic schedule');
    return await res.json();
  },

  async deleteClinicSchedule(id: number): Promise<any> {
    const res = await fetch(`${API_BASE}/clinic-schedules/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete clinic schedule');
    return await res.json();
  },
};

