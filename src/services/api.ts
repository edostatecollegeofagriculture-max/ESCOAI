const configuredApiBase = (import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/$/, '');
const API_BASE = configuredApiBase ? `${configuredApiBase}/api/v1` : '/api/v1';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('edocasti_token') || localStorage.getItem('edocas_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('edocasti_token', token);
    } else {
      localStorage.removeItem('edocasti_token');
      localStorage.removeItem('edocas_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || `Request failed with status ${response.status}`);
    }

    return data as T;
  }

  // Upload images/documents through Flask to Cloudinary. Files never pass through Vercel.
  uploadFile(file: File, folder = 'general') {
    const form = new FormData();
    form.append('file', file);
    form.append('folder', folder);
    return this.request<{ success: boolean; url: string; publicId: string; resourceType: string; format: string; bytes: number; private?: boolean; expiresAt?: number }>('/uploads', {
      method: 'POST',
      body: form,
    });
  }

  // Private documents return a short-lived URL. Persist publicId/format, not the expiring URL.
  getPrivateDownloadUrl(publicId: string, format: string) {
    return this.request<{ success: boolean; url: string; expiresAt: number }>('/uploads/download-url', {
      method: 'POST',
      body: JSON.stringify({ publicId, format }),
    });
  }

  // Auth
  login(email: string, password: string) {
    return this.request<{ success: boolean; token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  devQuickLogin(role: 'SUPER_ADMIN' | 'ADMIN' | 'USER' | 'INSTITUTION_ADMIN' | 'RECTOR' | 'REGISTRAR' | 'ADMISSIONS_OFFICER' | 'DEAN' | 'HOD' | 'LECTURER' | 'EXAM_OFFICER' | 'BURSAR' | 'CONTENT_EDITOR' | 'ICT_ADMIN' | 'SUPPORT_OFFICER' | 'STUDENT' | 'APPLICANT') {
    return this.request<{ success: boolean; token: string; user: any }>('/auth/dev-quick-login', {
      method: 'POST',
      body: JSON.stringify({ role }),
    });
  }

  registerApplicant(payload: { email: string; password: string; fullName: string; phone?: string }) {
    return this.request<{ success: boolean; token: string; user: any }>('/auth/register-applicant', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getMe() {
    return this.request<{ success: boolean; user: any }>('/auth/me');
  }

  changePassword(currentPassword: string, newPassword: string) {
    return this.request<{ success: boolean; message: string }>('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  }

  // Settings
  getSettings() {
    return this.request<{ success: boolean; settings: any }>('/settings');
  }

  updateSettings(payload: any) {
    return this.request<{ success: boolean; settings: any }>('/settings', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  // Users
  getUsers(params?: { role?: string; search?: string }) {
    const q = new URLSearchParams(params as any).toString();
    return this.request<{ success: boolean; users: any[] }>(`/users${q ? `?${q}` : ''}`);
  }

  createUser(payload: any) {
    return this.request<{ success: boolean; user: any }>('/users', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  toggleUserStatus(id: string, payload: { isActive?: boolean; isLocked?: boolean }) {
    return this.request<{ success: boolean; message: string }>(`/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  // Academics
  getSchools() {
    return this.request<{ success: boolean; schools: any[] }>('/academics/schools');
  }

  getDepartments() {
    return this.request<{ success: boolean; departments: any[] }>('/academics/departments');
  }

  createDepartment(payload: {
    schoolId: string;
    code: string;
    name: string;
    description?: string;
  }) {
    return this.request<{ success: boolean; department: any }>('/academics/departments', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getProgrammes() {
    return this.request<{ success: boolean; programmes: any[] }>('/academics/programmes');
  }

  createProgramme(payload: {
    departmentId: string;
    code: string;
    name: string;
    qualification: 'ND' | 'HND' | 'Certificate';
    durationYears: number;
    description?: string;
    requirements?: string[];
  }) {
    return this.request<{ success: boolean; programme: any }>('/academics/programmes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  getCourses(params?: any) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; courses: any[] }>(`/academics/courses${q ? `?${q}` : ''}`);
  }


  getLecturerCourses() {
    return this.request<{ success: boolean; courses: any[] }>('/lecturer/courses');
  }

  getLecturerCourseRoster(courseId: string) {
    const q = new URLSearchParams({ courseId }).toString();
    return this.request<{ success: boolean; students: any[] }>(`/lecturer/course-roster?${q}`);
  }
  createCourse(payload: any) {
    return this.request<{ success: boolean; course: any }>('/academics/courses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Admissions
  getApplications(params?: any) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; applications: any[] }>(`/admissions${q ? `?${q}` : ''}`);
  }

  getMyApplication() {
    return this.request<{ success: boolean; application: any }>('/admissions/my-application');
  }

  submitApplication(payload: any) {
    return this.request<{ success: boolean; application: any }>('/admissions/apply', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  reviewApplication(id: string, payload: { status: string; screeningNotes?: string }) {
    return this.request<{ success: boolean; application: any }>(`/admissions/${id}/decision`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  }

  acceptOffer(id: string) {
    return this.request<{ success: boolean; message: string; student: any }>(`/admissions/${id}/accept-offer`, {
      method: 'POST',
    });
  }

  // Students
  getStudents(params?: any) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; students: any[] }>(`/students${q ? `?${q}` : ''}`);
  }

  updateStudent(id: string, payload: any) {
    return this.request<{ success: boolean; message: string; student: any }>(`/students/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  deleteStudent(id: string) {
    return this.request<{ success: boolean; message: string }>(`/students/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  updateApplication(id: string, payload: any) {
    return this.request<{ success: boolean; message: string; application: any }>(`/admissions/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  deleteApplication(id: string) {
    return this.request<{ success: boolean; message: string }>(`/admissions/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  }

  getMyStudentProfile() {
    return this.request<{ success: boolean; student: any }>('/students/me');
  }

  // Registrations
  getRegistrations(params?: any) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; registrations: any[] }>(`/registrations${q ? `?${q}` : ''}`);
  }

  getMyRegistration() {
    return this.request<{ success: boolean; registration: any }>('/registrations/me');
  }

  registerCourses(courseIds: string[]) {
    return this.request<{ success: boolean; registration: any }>('/registrations', {
      method: 'POST',
      body: JSON.stringify({ courseIds }),
    });
  }

  approveRegistration(id: string, status: 'APPROVED' | 'REJECTED' = 'APPROVED') {
    return this.request<{ success: boolean; registration: any }>(`/registrations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status })
    });
  }

  // Results
  getResults(params?: any) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; results: any[] }>(`/results${q ? `?${q}` : ''}`);
  }

  getMyResults() {
    return this.request<{ success: boolean; results: any[] }>('/results/my-results');
  }

  submitScore(payload: any) {
    return this.request<{ success: boolean; result: any }>('/results/score-entry', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  publishResult(id: string) {
    return this.request<{ success: boolean; result: any }>(`/results/${id}/publish`, {
      method: 'PATCH',
    });
  }

  // Finance
  getFeeSchedules() {
    return this.request<{ success: boolean; feeSchedules: any[] }>('/finance/fee-schedules');
  }

  getInvoices(params?: any) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; invoices: any[] }>(`/finance/invoices${q ? `?${q}` : ''}`);
  }

  payInvoice(invoiceId: string, channel?: string) {
    return this.request<{ success: boolean; transaction: any; invoice: any }>('/finance/pay', {
      method: 'POST',
      body: JSON.stringify({ invoiceId, channel }),
    });
  }

  getPayments() {
    return this.request<{ success: boolean; payments: any[] }>('/finance/payments');
  }

  // Attendance
  getAttendance(params?: any) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; attendance: any[] }>(`/attendance${q ? `?${q}` : ''}`);
  }

  recordAttendance(payload: any) {
    return this.request<{ success: boolean; session: any }>('/attendance', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  // Support
  getSupportTickets() {
    return this.request<{ success: boolean; tickets: any[] }>('/support');
  }

  createSupportTicket(payload: any) {
    return this.request<{ success: boolean; ticket: any }>('/support', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  replySupportTicket(id: string, message: string) {
    return this.request<{ success: boolean; ticket: any }>(`/support/${id}/reply`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  // Audit
  getAuditLogs(params?: any) {
    const q = new URLSearchParams(params).toString();
    return this.request<{ success: boolean; logs: any[] }>(`/audit${q ? `?${q}` : ''}`);
  }

  // Dashboard Stats
  getDashboardStats() {
    return this.request<{ success: boolean; stats: any }>('/dashboard/stats');
  }

  // Global Search
  globalSearch(q: string) {
    return this.request<{
      success: boolean;
      query: string;
      results: {
        students: any[];
        applicants: any[];
        courses: any[];
        documents: any[];
        sections: any[];
      };
    }>(`/search?q=${encodeURIComponent(q)}`);
  }

  // Content Management System (CMS) - News
  getNews(params?: { category?: string; status?: string; sliderOnly?: boolean; search?: string }) {
    const queryParams = Object.fromEntries(
      Object.entries(params || {}).filter(
        ([, value]) => value !== undefined && value !== null && value !== ''
      )
    );
    const q = new URLSearchParams(queryParams as any).toString();
    return this.request<{ success: boolean; articles: any[] }>(`/cms/news${q ? `?${q}` : ''}`);
  }

  getNewsArticle(id: string) {
    return this.request<{ success: boolean; article: any }>(`/cms/news/${id}`);
  }

  createNewsArticle(payload: any) {
    return this.request<{ success: boolean; article: any }>('/cms/news', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateNewsArticle(id: string, payload: any) {
    return this.request<{ success: boolean; article: any }>(`/cms/news/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  deleteNewsArticle(id: string) {
    return this.request<{ success: boolean; message: string }>(`/cms/news/${id}`, {
      method: 'DELETE',
    });
  }

  toggleNewsSlider(id: string) {
    return this.request<{ success: boolean; isFeaturedInSlider: boolean }>(`/cms/news/${id}/toggle-slider`, {
      method: 'PATCH',
    });
  }

  // Content Management System (CMS) - Slides
  getSlides(params?: { activeOnly?: boolean }) {
    const q = new URLSearchParams(params as any).toString();
    return this.request<{ success: boolean; slides: any[] }>(`/cms/slides${q ? `?${q}` : ''}`);
  }

  createSlide(payload: any) {
    return this.request<{ success: boolean; slide: any }>('/cms/slides', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateSlide(id: string, payload: any) {
    return this.request<{ success: boolean; slide: any }>(`/cms/slides/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  deleteSlide(id: string) {
    return this.request<{ success: boolean; message: string }>(`/cms/slides/${id}`, {
      method: 'DELETE',
    });
  }

  // CMS - Institutional Leadership Profiles
  getLeadership(params?: any) {
    const q = new URLSearchParams(params as any).toString();
    return this.request<{ success: boolean; leadership: any[] }>(
      `/cms/leadership${q ? `?${q}` : ''}`
    );
  }

  createLeadership(payload: any) {
    return this.request<{ success: boolean; record: any }>('/cms/leadership', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateLeadership(id: string, payload: any) {
    return this.request<{ success: boolean; record: any }>(`/cms/leadership/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  deleteLeadership(id: string) {
    return this.request<{ success: boolean; message: string }>(`/cms/leadership/${id}`, {
      method: 'DELETE',
    });
  }

  // CMS - Frequently Asked Questions
  getFaqs(params?: any) {
    const q = new URLSearchParams(params as any).toString();
    return this.request<{ success: boolean; faqs: any[] }>(
      `/cms/faqs${q ? `?${q}` : ''}`
    );
  }

  createFaq(payload: any) {
    return this.request<{ success: boolean; record: any }>('/cms/faqs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateFaq(id: string, payload: any) {
    return this.request<{ success: boolean; record: any }>(`/cms/faqs/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  deleteFaq(id: string) {
    return this.request<{ success: boolean; message: string }>(`/cms/faqs/${id}`, {
      method: 'DELETE',
    });
  }

  // CMS - Academic Calendar
  getAcademicCalendar(params?: any) {
    const q = new URLSearchParams(params as any).toString();
    return this.request<{ success: boolean; calendar: any[] }>(
      `/cms/calendar${q ? `?${q}` : ''}`
    );
  }

  createCalendarEvent(payload: any) {
    return this.request<{ success: boolean; record: any }>('/cms/calendar', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  updateCalendarEvent(id: string, payload: any) {
    return this.request<{ success: boolean; record: any }>(`/cms/calendar/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  deleteCalendarEvent(id: string) {
    return this.request<{ success: boolean; message: string }>(`/cms/calendar/${id}`, {
      method: 'DELETE',
    });
  }

  logout() {
    return this.request<{ success: boolean; message?: string }>('/auth/logout', {
      method: 'POST',
    });
  }
}

export const api = new ApiService();


