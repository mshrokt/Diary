import { initializeApp, getApps, cert, type ServiceAccount } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function getAdminApp() {
  if (getApps().length > 0) {
    return getApps()[0];
  }

  // FIREBASE_SERVICE_ACCOUNT_KEY は JSON 文字列として Vercel に設定する
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (serviceAccountKey) {
    const serviceAccount: ServiceAccount = JSON.parse(serviceAccountKey);
    return initializeApp({
      credential: cert(serviceAccount),
    });
  }

  // サービスアカウントキーがない場合は、プロジェクトIDだけで初期化（ローカル開発用）
  return initializeApp({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  });
}

const adminApp = getAdminApp();
const adminDb = getFirestore(adminApp);

export { adminApp, adminDb };
