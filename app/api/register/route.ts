import { NextResponse } from "next/server"
import * as admin from "firebase-admin"
import { 
  createUserDb, 
  createApplicationDb, 
  isEmailPreApprovedDb, 
  markEmailAsUsedDb,
  getAllUsersDb 
} from "@/lib/storage"

// Initialize Firebase Admin for secure backend operations
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

// --- UTILS ---
const sanitizeString = (val: any) => (typeof val === 'string' ? val.trim() : '');

// Removes undefined values and Next.js proxies to prevent Firestore errors
const sanitizeForFirestore = (obj: any) => JSON.parse(JSON.stringify(obj));

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { 
      action, studentPhoto, firstName, middleName, lastName, email, password, 
      address, contactNumber, age, gender, barangay, schoolName, program, 
      yearLevel, semester, isPWD 
    } = body

    const cleanEmail = email ? email.trim().toLowerCase() : "";

    // --- HANDLE EMAIL VERIFICATION STEP ---
    if (action === "verify_email") {
      if (!cleanEmail) return NextResponse.json({ error: "Email is required" }, { status: 400 })
      
      const allUsers = await getAllUsersDb()
      const isDuplicate = allUsers.some((u: any) => u.email?.toLowerCase() === cleanEmail)
      if (isDuplicate) {
        return NextResponse.json({ error: "This email is already registered. Please sign in instead." }, { status: 409 })
      }

      const isApproved = await isEmailPreApprovedDb(cleanEmail)
      if (!isApproved) {
        return NextResponse.json({ error: "This email is not authorized to register." }, { status: 403 })
      }

      return NextResponse.json({ success: true }) 
    }

    // --- HANDLE FULL REGISTRATION SUBMISSION ---
    if (!firstName || !lastName || !cleanEmail || !password) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const allUsers = await getAllUsersDb();
    const isDuplicate = allUsers.some((u: any) => u.email?.toLowerCase() === cleanEmail);
    if (isDuplicate) {
      return NextResponse.json({ error: "This email is already registered." }, { status: 409 })
    }

    const isApproved = await isEmailPreApprovedDb(cleanEmail);
    if (!isApproved) {
      return NextResponse.json({ error: "This email is not authorized to register." }, { status: 403 })
    }

    try {
      const safeFirstName = sanitizeString(firstName);
      const safeMiddleName = sanitizeString(middleName);
      const safeLastName = sanitizeString(lastName);
      const combinedFullName = `${safeFirstName} ${safeMiddleName ? safeMiddleName + " " : ""}${safeLastName}`.trim()

      // 1. CREATE AUTH ACCOUNT 
      try {
        await admin.auth().createUser({
          email: cleanEmail,
          password: sanitizeString(password),
          displayName: combinedFullName,
        });
      } catch (authError: any) {
        console.error("Firebase Auth Error:", authError);
        
        if (authError.code === 'auth/email-already-exists') {
          try {
            const existingAuthRecord = await admin.auth().getUserByEmail(cleanEmail);
            await admin.auth().updateUser(existingAuthRecord.uid, {
              password: sanitizeString(password),
              displayName: combinedFullName
            });
            console.log("Ghost account recovered successfully.");
          } catch (updateErr) {
            return NextResponse.json({ error: "This email is stuck in the auth system." }, { status: 409 });
          }
        } else {
          return NextResponse.json({ error: authError.message || "Failed to create secure login account" }, { status: 400 });
        }
      }

      // 2. CREATE FIRESTORE USER DOCUMENT
      // Put the password back so NextAuth can verify against it
      const userPayload = sanitizeForFirestore({
        name: combinedFullName, 
        email: cleanEmail,
        password: sanitizeString(password), // 👈 Added password back here!
        role: "student",
        profileData: {
          studentPhoto: sanitizeString(studentPhoto), 
          firstName: safeFirstName,
          middleName: safeMiddleName,
          lastName: safeLastName,
          fullName: combinedFullName, 
          email: cleanEmail,
          contactNumber: sanitizeString(contactNumber),
          address: sanitizeString(address),
          age: sanitizeString(age),
          gender: sanitizeString(gender), 
          barangay: sanitizeString(barangay),
          schoolName: sanitizeString(schoolName),
          program: sanitizeString(program), 
          course: sanitizeString(program),  
          yearLevel: sanitizeString(yearLevel),
          semester: sanitizeString(semester), 
          isPWD: !!isPWD,
          studentId: `STU-${Date.now()}`,
        },
      });

      const newUser = await createUserDb(userPayload)

      // 3. CREATE FIRESTORE APPLICATION DOCUMENT
      const applicationPayload = sanitizeForFirestore({
        studentId: newUser.id,
        firstName: safeFirstName,
        middleName: safeMiddleName,
        lastName: safeLastName,
        fullName: combinedFullName, 
        email: cleanEmail,
        program: sanitizeString(program), 
        course: sanitizeString(program),  
        yearLevel: sanitizeString(yearLevel),
        semester: sanitizeString(semester), 
        school: sanitizeString(schoolName),
        barangay: sanitizeString(barangay),
        isPWD: !!isPWD,
        status: "draft",
        isSubmitted: false, 
        isApproved: false,
        isRejected: false,
        isClaimed: false,
        isArchived: false, 
      });

      await createApplicationDb(applicationPayload as any)

      // 4. MARK EMAIL AS USED
      await markEmailAsUsedDb(cleanEmail);

      return NextResponse.json({ success: true, message: "Registration successful" }, { status: 201 })
    } catch (error: any) {
      console.error("Database Error:", error)
      return NextResponse.json({ error: error.message || "User creation failed" }, { status: 400 })
    }
  } catch (error) {
    console.error("Registration route error:", error)
    return NextResponse.json({ error: "An error occurred during registration" }, { status: 500 })
  }
}
