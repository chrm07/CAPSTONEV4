import { NextResponse } from "next/server";
import * as admin from "firebase-admin";

// Initialize Firebase Admin if it hasn't been initialized yet
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Handle newline characters in the private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

export async function POST(request: Request) {
  try {
    const { email, newPassword } = await request.json();

    if (!email || !newPassword) {
      return NextResponse.json({ error: "Missing email or password" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // ==========================================
    // 1. Update in Firebase Authentication
    // ==========================================
    try {
      const userRecord = await admin.auth().getUserByEmail(cleanEmail);
      await admin.auth().updateUser(userRecord.uid, {
        password: newPassword,
      });
    } catch (authError: any) {
      console.warn("Auth update warning (User might only exist in Firestore):", authError.message);
      // We don't throw an error here so it can still update Firestore below!
    }

    // ==========================================
    // 2. Update in Firestore Database (Crucial for your Login Page)
    // ==========================================
    const db = admin.firestore();
    const usersRef = db.collection("users");
    
    // Find the user document that matches this email
    const snapshot = await usersRef.where("email", "==", cleanEmail).get();

    if (!snapshot.empty) {
      const batch = db.batch();
      
      // Update the password field for the matched user
      snapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { password: newPassword });
      });
      
      await batch.commit();
    } else {
      return NextResponse.json({ error: "User not found in database" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Password updated successfully" });
    
  } catch (error: any) {
    console.error("Error updating password:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update password" },
      { status: 500 }
    );
  }
}