import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // FIREBASE_SERVICE_ACCOUNT_KEY は JSON 文字列として Vercel に設定する
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    try {
      console.log("DEBUG: FIREBASE_SERVICE_ACCOUNT_KEY found. Parsing...");
      const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
      console.log("DEBUG: Service Account parsed successfully for project:", serviceAccount.projectId);
      return initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (e: any) {
      console.error("DEBUG ERROR: Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:", e.message);
    }
  }

  console.warn("DEBUG: Initializing Firebase Admin with projectId only (No Service Account Key found)");
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminApp = getAdminApp();
const adminDb = getFirestore(adminApp);

export { adminApp, adminDb };
