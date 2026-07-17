import { collection, doc, setDoc, getDoc, getDocs, query, where, updateDoc, addDoc, deleteDoc, writeBatch, limit, orderBy, startAfter } from "firebase/firestore";
import { db } from "./firebase";

// ============================================================================
// 1. TYPE DEFINITIONS
// ============================================================================

export type AdminRole = "head_admin" | "verifier_staff" | "scanner_staff"

export const ADMIN_PERMISSIONS: Record<AdminRole, string[]> = {
  head_admin: ["dashboard", "scholars", "applications", "approved-emails", "verification", "reports", "scheduling", "staff-management", "settings"],
  verifier_staff: ["dashboard", "scholars", "applications", "verification"],
  scanner_staff: ["dashboard", "verification"],
}

export type User = {
  id: string
  name: string
  email: string
  password: string
  role: "student" | "admin"
  adminRole?: AdminRole 
  profileData?: StudentProfile | AdminProfile
  isPWD?: boolean 
  studentProfile?: any 
  profilePicture?: string
}

export type StudentProfile = {
  fullName: string
  email: string
  contactNumber: string
  address: string
  age: string
  gender: string 
  barangay: string
  bio?: string
  schoolName: string
  course: string
  yearLevel: string
  semester: string 
  studentId: string
  isPWD?: boolean 
  studentPhoto?: string 
}

export type AdminProfile = {
  fullName: string
  email: string
  contactNumber: string
  position: string
  department: string
  bio?: string
}

export type Application = {
  id: string
  studentId: string
  fullName: string
  email: string
  course: string
  yearLevel: string
  semester: string 
  school: string
  barangay: string
  status: "pending" | "approved" | "rejected"
  createdAt: string
  updatedAt: string
  submittedAt: string
  feedback?: string
  isPWD?: boolean 
  isClaimed?: boolean
  claimedAt?: string
  processedByAdmin?: string
}

export type Document = {
  id: string
  studentId: string
  name: string
  type: string
  status: "pending" | "approved" | "rejected"
  uploadedAt: string
  reviewedAt?: string
  feedback?: string
  fileSize: string
  semester: string
  academicYear: string
  url?: string 
  categoryName?: string
}

export type Notification = {
  id: string
  userId: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "announcement" | "schedule"
  isRead: boolean
  createdAt: string
  actionUrl?: string
}

export type VerificationSchedule = {
  id: string
  barangay: string
  startDate: string
  endDate: string
  dailyLimit?: number
  status: "active" | "ended" | "upcoming"
  createdAt: string
  createdBy: string
  updatedAt: string
}

export type FinancialDistributionSchedule = {
  id: string
  barangays: string[]
  startDate: string
  endDate: string
  startTime: string
  distributionAmount: number
  status: "active" | "ended" | "upcoming"
  createdAt: string
  createdBy: string
  updatedAt: string
}

export type SubmissionSchedule = {
  id: string
  academicYear: string
  semester: string
  startDate: string
  endDate: string
  status: "active" | "ended" | "upcoming"
  createdAt: string
  createdBy: string
}

// ============================================================================
// 2. USERS, AUTH & PERMISSIONS
// ============================================================================

export function hasPermission(user: User | null, permission: string): boolean {
  if (!user || user.role !== "admin") return false
  const adminRole = user.adminRole || "head_admin"
  return ADMIN_PERMISSIONS[adminRole]?.includes(permission) || false
}

export function getAdminRoleLabel(adminRole: AdminRole): string {
  switch (adminRole) {
    case "head_admin": return "Head Administrator"
    case "verifier_staff": return "Verification Staff"
    case "scanner_staff": return "QR Scanner Staff"
    default: return "Staff"
  }
}

export async function getUserDb(userId: string) {
  try {
    const docSnap = await getDoc(doc(db, "users", userId))
    return docSnap.exists() ? { id: docSnap.id, ...docSnap.data() } : null
  } catch (error) {
    console.error("Error fetching user:", error)
    return null
  }
}

export async function getAllUsersDb(maxLimit = 1000) {
  const q = query(collection(db, "users"), limit(maxLimit))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function getUserByEmailDb(email: string): Promise<User | null> {
  const q = query(collection(db, "users"), where("email", "==", email.trim().toLowerCase()))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : (snapshot.docs[0].data() as User)
}

export async function getScholarsDb(maxLimit = 1000): Promise<User[]> {
  const q = query(collection(db, "users"), where("role", "==", "student"), limit(maxLimit))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as User)
}

export async function createUserDb(userData: Omit<User, "id">, profileData?: any): Promise<User> {
  const userId = `user-${Date.now()}`
  const newUser: User = { ...userData, id: userId, profileData: profileData || userData.profileData }
  await setDoc(doc(db, "users", userId), newUser)
  return newUser
}

export async function updateUser(userId: string, data: Partial<User>): Promise<boolean> {
  try {
    await updateDoc(doc(db, "users", userId), { ...data, updatedAt: new Date().toISOString() })
    return true
  } catch (error) {
    return false
  }
}

export async function updateUserPassword(userId: string, currentPass: string, newPass: string) {
  try {
    const userRef = doc(db, "users", userId)
    const userSnap = await getDoc(userRef)

    if (userSnap.exists()) {
      if (userSnap.data().password === currentPass) {
        await updateDoc(userRef, { password: newPass })
        return { success: true, message: "Password updated." }
      }
      return { success: false, message: "The current password you entered is incorrect." }
    }
    return { success: false, message: "User not found." }
  } catch (error) {
    return { success: false, message: "Database error." }
  }
}

// --- STAFF MANAGEMENT ---
export async function getStaffMembersDb(): Promise<User[]> {
  const q = query(collection(db, "users"), where("role", "==", "admin"))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as User)
}

export async function createStaffMemberDb(data: { name: string; email: string; password: string; adminRole: AdminRole }) {
  const existing = await getUserByEmailDb(data.email)
  if (existing) return { success: false, error: "Email already exists." }

  const userId = `admin-${Date.now()}`
  const newUser: User = {
    id: userId, name: data.name, email: data.email.toLowerCase(), password: data.password,
    role: "admin", adminRole: data.adminRole,
    profileData: { fullName: data.name, email: data.email.toLowerCase(), contactNumber: "", position: getAdminRoleLabel(data.adminRole), department: "Scholarship Office" }
  }
  
  await setDoc(doc(db, "users", userId), newUser)
  return { success: true, user: newUser }
}

export async function updateStaffRoleDb(userId: string, newRole: AdminRole): Promise<boolean> {
  try {
    await updateDoc(doc(db, "users", userId), { adminRole: newRole, "profileData.position": getAdminRoleLabel(newRole) })
    return true
  } catch (e) { return false }
}

export async function deleteStaffMemberDb(userId: string): Promise<boolean> {
  try { await deleteDoc(doc(db, "users", userId)); return true } catch (e) { return false }
}

// ============================================================================
// 3. APPLICATIONS & PRE-APPROVED EMAILS
// ============================================================================

export async function getApplicationsDb(maxLimit = 1000): Promise<Application[]> {
  const q = query(collection(db, "applications"), orderBy("createdAt", "desc"), limit(maxLimit))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as Application)
}

export async function getRecentApplicationsDb(limitCount = 5): Promise<Application[]> {
  const q = query(collection(db, "applications"), orderBy("createdAt", "desc"), limit(limitCount))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as Application)
}

export async function getStudentApplicationDb(studentId: string): Promise<Application | null> {
  const q = query(collection(db, "applications"), where("studentId", "==", studentId))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : (snapshot.docs[0].data() as Application)
}

export async function createApplicationDb(data: Omit<Application, "id" | "createdAt" | "updatedAt" | "submittedAt">): Promise<Application> {
  const appId = `app-${Date.now()}`
  const now = new Date().toISOString()
  const newApplication: Application = { ...data, id: appId, createdAt: now, updatedAt: now, submittedAt: now }
  await setDoc(doc(db, "applications", appId), newApplication)
  return newApplication
}

export async function updateApplicationStatusDb(id: string, status: "pending" | "approved" | "rejected", feedback?: string) {
  await updateDoc(doc(db, "applications", id), { status, feedback: feedback || "", updatedAt: new Date().toISOString() })
}

export async function markStudentAsClaimed(studentId: string, adminId: string) {
  try {
    const q = query(collection(db, "applications"), where("studentId", "==", studentId))
    const snapshot = await getDocs(q)
    const approvedApps = snapshot.docs.filter(doc => doc.data().status === "approved")
    
    if (approvedApps.length === 0) return { success: false, message: "No approved application found." }

    await updateDoc(doc(db, "applications", approvedApps[0].id), {
      isClaimed: true, claimedAt: new Date().toISOString(), processedByAdmin: adminId || "unknown_admin"
    })
    return { success: true, message: "Student has been successfully marked as claimed." }
  } catch (error: any) {
    return { success: false, message: `Firebase Error: ${error.message}` }
  }
}

// --- EMAILS ---
export async function getPreApprovedEmailsListDb() {
  const snapshot = await getDocs(collection(db, "pre_approved_emails"))
  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
}

export async function isEmailPreApprovedDb(email: string): Promise<boolean> {
  const q = query(collection(db, "pre_approved_emails"), where("email", "==", email.trim().toLowerCase()), where("isUsed", "==", false))
  const snapshot = await getDocs(q)
  return !snapshot.empty
}

export async function addPreApprovedEmailDb(email: string) {
  await addDoc(collection(db, "pre_approved_emails"), { email: email.toLowerCase(), isUsed: false, createdAt: new Date().toISOString(), fullName: "" })
}

export async function deletePreApprovedEmailDb(id: string) {
  await deleteDoc(doc(db, "pre_approved_emails", id))
}

export async function markEmailAsUsedDb(email: string) {
  const q = query(collection(db, "pre_approved_emails"), where("email", "==", email.trim().toLowerCase()))
  const snapshot = await getDocs(q)
  if (!snapshot.empty) await updateDoc(doc(db, "pre_approved_emails", snapshot.docs[0].id), { isUsed: true })
}

// ============================================================================
// 4. DOCUMENTS
// ============================================================================

export async function getDocumentsByStudentIdDb(studentId: string): Promise<Document[]> {
  const q = query(collection(db, "documents"), where("studentId", "==", studentId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as Document)
}

export async function createDocumentDb(data: Omit<Document, "id" | "uploadedAt">): Promise<Document> {
  const docId = `doc-${Date.now()}`
  const newDocument: Document = { ...data, id: docId, uploadedAt: new Date().toISOString() }
  await setDoc(doc(db, "documents", docId), newDocument)
  return newDocument
}

export async function deleteDocumentDb(studentId: string, documentName: string) {
  const q = query(collection(db, "documents"), where("studentId", "==", studentId), where("name", "==", documentName))
  const snapshot = await getDocs(q)
  if (!snapshot.empty) await deleteDoc(doc(db, "documents", snapshot.docs[0].id))
}

// ============================================================================
// 5. SCHEDULING (SUBMISSION, VERIFICATION, FINANCIAL)
// ============================================================================

// --- SUBMISSION SCHEDULES ---
export async function getSubmissionSchedulesDb(): Promise<SubmissionSchedule[]> {
  const snapshot = await getDocs(collection(db, "submission_schedules"))
  return snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as SubmissionSchedule)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function getActiveSubmissionScheduleDb(): Promise<SubmissionSchedule | null> {
  const q = query(collection(db, "submission_schedules"), where("status", "==", "active"))
  const snapshot = await getDocs(q)
  return snapshot.empty ? null : { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as SubmissionSchedule
}

export async function createSubmissionScheduleDb(data: Omit<SubmissionSchedule, "id" | "status" | "createdAt">): Promise<SubmissionSchedule> {
  const docRef = doc(collection(db, "submission_schedules"))
  const schedule: SubmissionSchedule = { ...data, id: docRef.id, status: "active", createdAt: new Date().toISOString() }
  await setDoc(docRef, schedule)
  return schedule
}

export async function updateSubmissionScheduleDb(id: string, data: Partial<SubmissionSchedule>) {
  await updateDoc(doc(db, "submission_schedules", id), data)
}

export async function deleteSubmissionScheduleDb(id: string) {
  await deleteDoc(doc(db, "submission_schedules", id))
}

// --- VERIFICATION SCHEDULES ---
export async function getVerificationSchedulesDb(): Promise<VerificationSchedule[]> {
  const snapshot = await getDocs(collection(db, "verification_schedules"))
  return snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as VerificationSchedule)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

// --- FINANCIAL SCHEDULES ---
export async function getFinancialDistributionSchedulesDb(): Promise<FinancialDistributionSchedule[]> {
  const snapshot = await getDocs(collection(db, "financial_schedules"))
  return snapshot.docs.map(doc => ({...doc.data(), id: doc.id} as FinancialDistributionSchedule)).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function createFinancialDistributionScheduleDb(data: Omit<FinancialDistributionSchedule, "id" | "status" | "createdAt" | "updatedAt">): Promise<FinancialDistributionSchedule> {
  const docRef = doc(collection(db, "financial_schedules"))
  const schedule: FinancialDistributionSchedule = { ...data, id: docRef.id, status: "active", createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
  await setDoc(docRef, schedule)
  return schedule
}

export async function updateFinancialDistributionScheduleDb(id: string, data: Partial<FinancialDistributionSchedule>) {
  await updateDoc(doc(db, "financial_schedules", id), { ...data, updatedAt: new Date().toISOString() })
}

export async function deleteFinancialDistributionScheduleDb(id: string) {
  await deleteDoc(doc(db, "financial_schedules", id))
}

// ============================================================================
// 6. NOTIFICATIONS
// ============================================================================

export async function getNotificationsByUserIdDb(userId: string): Promise<Notification[]> {
  const q = query(collection(db, "notifications"), where("userId", "==", userId))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data() as Notification).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export async function createNotificationDb(data: Omit<Notification, "id" | "isRead" | "createdAt">) {
  const docRef = doc(collection(db, "notifications"))
  const notification: Notification = { ...data, id: docRef.id, isRead: false, createdAt: new Date().toISOString() }
  await setDoc(docRef, notification)
  return notification
}

export async function notifyAllStudentsDb(title: string, message: string, actionUrl: string) {
  const q = query(collection(db, "users"), where("role", "==", "student"))
  const snapshot = await getDocs(q)
  const batch = writeBatch(db)
  snapshot.docs.forEach(docSnap => {
    const notifRef = doc(collection(db, "notifications"))
    batch.set(notifRef, { id: notifRef.id, userId: docSnap.id, title, message, type: "info", actionUrl, isRead: false, createdAt: new Date().toISOString() })
  })
  await batch.commit()
}

export async function notifyAdminsDb(title: string, message: string, actionUrl: string) {
  const q = query(collection(db, "users"), where("role", "==", "admin"))
  const snapshot = await getDocs(q)
  const promises = snapshot.docs.map(docSnap => {
    const admin = docSnap.data() as User
    if (admin.adminRole === "head_admin" || admin.adminRole === "verifier_staff" || !admin.adminRole) {
      return createNotificationDb({ userId: admin.id, title, message, type: "info", actionUrl })
    }
  })
  await Promise.all(promises)
}

export async function createBarangayNotificationsDb(barangays: string[], notificationData: Omit<Notification, "id" | "userId" | "isRead" | "createdAt">) {
  const q = query(collection(db, "users"), where("role", "==", "student"))
  const snapshot = await getDocs(q)
  const batch = writeBatch(db)
  
  let count = 0;
  snapshot.docs.forEach(docSnap => {
    const student = docSnap.data() as User
    if (student.profileData && barangays.includes((student.profileData as StudentProfile).barangay)) {
      const notifRef = doc(collection(db, "notifications"))
      batch.set(notifRef, { ...notificationData, id: notifRef.id, userId: student.id, isRead: false, createdAt: new Date().toISOString() })
      count++
    }
  })
  if (count > 0) await batch.commit()
}

export async function markNotificationAsReadDb(id: string) {
  await updateDoc(doc(db, "notifications", id), { isRead: true })
}

export async function markNotificationAsUnreadDb(id: string) {
  await updateDoc(doc(db, "notifications", id), { isRead: false })
}

export async function markAllNotificationsAsReadDb(userId: string) {
  const q = query(collection(db, "notifications"), where("userId", "==", userId), where("isRead", "==", false))
  const snapshot = await getDocs(q)
  const batch = writeBatch(db)
  snapshot.docs.forEach(d => batch.update(d.ref, { isRead: true }))
  await batch.commit()
}

export async function deleteNotificationDb(id: string) {
  await deleteDoc(doc(db, "notifications", id))
}

// ============================================================================
// 7. ARCHIVING & HISTORY
// ============================================================================

export async function getApplicationHistoryDb(maxLimit = 1000): Promise<any[]> {
  const q = query(collection(db, "application_history"), orderBy("completedAt", "desc"), limit(maxLimit))
  const snapshot = await getDocs(q)
  return snapshot.docs.map(doc => doc.data())
}

export async function getStudentApplicationHistoryDb(studentId: string): Promise<any[]> {
  const q = query(collection(db, "application_history"), where("studentId", "==", studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => doc.data()).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime());
}

export async function deleteApplicationHistoryDb(id: string): Promise<void> {
  await deleteDoc(doc(db, "application_history", id))
}

export async function archiveMyApplicationDb(studentId: string) {
  const q = query(collection(db, "applications"), where("studentId", "==", studentId))
  const snapshot = await getDocs(q)
  if (snapshot.empty) return
  
  const batch = writeBatch(db)
  const historyRef = collection(db, "application_history")
  const docsRef = collection(db, "documents")

  for (const docSnap of snapshot.docs) {
    const app = docSnap.data() as Application
    const historyDocRef = doc(historyRef)
    
    batch.set(historyDocRef, {
      id: historyDocRef.id,
      studentId: app.studentId,
      fullName: app.fullName,
      email: app.email,
      course: app.course,
      yearLevel: app.yearLevel,
      school: app.school,
      barangay: app.barangay,
      semester: app.semester || "Ended",
      outcome: app.status,
      isClaimed: app.isClaimed || false,
      completedAt: new Date().toISOString(),
      archiveCycle: `${app.semester || 'Past Semester'} - ${new Date(app.createdAt).getFullYear()}`
    })
    batch.delete(docSnap.ref)
  }

  const docQ = query(docsRef, where("studentId", "==", studentId))
  const docSnapshots = await getDocs(docQ)
  docSnapshots.forEach(d => batch.delete(d.ref))
  
  await batch.commit()
}

export async function archiveAndResetStudentsDb(barangays: string[]) {
  const snapshot = await getDocs(collection(db, "applications"))
  const batch = writeBatch(db)
  const historyRef = collection(db, "application_history")
  const docsRef = collection(db, "documents")

  for (const docSnap of snapshot.docs) {
    const app = docSnap.data() as Application
    if (barangays.includes(app.barangay)) {
      const historyDocRef = doc(historyRef)
      batch.set(historyDocRef, {
        id: historyDocRef.id,
        studentId: app.studentId,
        fullName: app.fullName,
        email: app.email,
        course: app.course,
        yearLevel: app.yearLevel,
        school: app.school,
        barangay: app.barangay,
        semester: app.semester || "Ended",
        outcome: app.status,
        isClaimed: app.isClaimed || false,
        completedAt: new Date().toISOString(),
        archiveCycle: `${app.semester || 'Past Semester'} - ${new Date(app.createdAt).getFullYear()}`
      })
      batch.delete(docSnap.ref)

      const docQ = query(docsRef, where("studentId", "==", app.studentId))
      const docSnapshots = await getDocs(docQ)
      docSnapshots.forEach(d => batch.delete(d.ref))
    }
  }
  await batch.commit()
}

// ============================================================================
// 8. PASSWORD RESET TOKENS
// ============================================================================

export type ResetToken = {
  id: string; // The token string itself
  email: string;
  expires: number;
}

export async function createResetTokenDb(token: string, email: string, expires: number) {
  // Save the token using the token string as the document ID for super-fast lookups
  await setDoc(doc(db, "password_resets", token), {
    id: token,
    email,
    expires
  })
}

export async function getResetTokenDb(token: string): Promise<ResetToken | null> {
  const docSnap = await getDoc(doc(db, "password_resets", token))
  return docSnap.exists() ? (docSnap.data() as ResetToken) : null
}

export async function deleteResetTokenDb(token: string) {
  await deleteDoc(doc(db, "password_resets", token))
}
