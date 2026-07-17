import { NextResponse } from "next/server";
import { doc, setDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function GET() {
  try {
    const adminId = "admin-1";
    
    // This is the exact same admin data from your old mock database!
    const adminUser = {
      id: adminId,
      name: "Admin User",
      email: "admin@carmona.gov.ph",
      password: "Admin123",
      role: "admin",
      adminRole: "head_admin",
      profileData: {
        fullName: "Maria Elena Santos",
        email: "admin@carmona.gov.ph",
        contactNumber: "09171234567",
        position: "Scholarship Program Administrator",
        department: "Municipal Scholarship Office",
        bio: "Responsible for overseeing the BTS scholarship program.",
      },
    };

    // Save the admin to the "users" collection in Firestore
    await setDoc(doc(db, "users", adminId), adminUser);
    
    return NextResponse.json({ 
      success: true, 
      message: "Admin user successfully created in Firestore! You can now log in." 
    });
  } catch (error: any) {
    console.error("Setup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
