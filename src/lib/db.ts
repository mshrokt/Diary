import { db } from "./firebase";
import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  arrayUnion,
} from "firebase/firestore";
import { Diary } from "@/types/diary";

const DIARIES_COLLECTION = "diaries";

export const getDiaries = async (userId: string): Promise<Diary[]> => {
  if (!userId) return [];

  const q = query(
    collection(db, DIARIES_COLLECTION),
    where("userId", "==", userId),
    orderBy("createdAt", "desc")
  );

  const querySnapshot = await getDocs(q);
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Diary[];
};

export const createDiary = async (
  userId: string,
  content: string,
  date: number,
  tags: string[] = [],
  isDraft: boolean = false,
  images: string[] = []
): Promise<string> => {
  const newDiary = {
    userId,
    content,
    date,
    tags,
    isDraft,
    images,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  const docRef = await addDoc(collection(db, DIARIES_COLLECTION), newDiary);
  return docRef.id;
};

export const updateDiary = async (
  id: string,
  content: string,
  date: number,
  tags: string[] = [],
  images?: string[],
  options: { isDraft?: boolean } = {}
): Promise<void> => {
  const diaryRef = doc(db, DIARIES_COLLECTION, id);
  const updateData: any = {
    content,
    date,
    tags,
    updatedAt: Date.now(),
    isDraft: !!options.isDraft,
  };

  if (images) {
    updateData.images = images;
  }

  if (!options.isDraft) {
    updateData.editHistory = arrayUnion(Date.now());
  }

  await updateDoc(diaryRef, updateData);
};

export const deleteDiary = async (id: string): Promise<void> => {
  const diaryRef = doc(db, DIARIES_COLLECTION, id);
  await deleteDoc(diaryRef);
};

// --- Push Notifications ---

export const saveSubscription = async (userId: string, subscription: any) => {
  const q = query(
    collection(db, "subscriptions"),
    where("userId", "==", userId),
    where("endpoint", "==", subscription.endpoint)
  );
  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    await addDoc(collection(db, "subscriptions"), {
      userId,
      subscription, // Full browser subscription object
      endpoint: subscription.endpoint,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  } else {
    // Update existing subscription in case keys changed
    const docRef = doc(db, "subscriptions", snapshot.docs[0].id);
    await updateDoc(docRef, {
      subscription,
      updatedAt: Date.now(),
    });
  }
};

export const getSubscriptions = async () => {
  const querySnapshot = await getDocs(collection(db, "subscriptions"));
  return querySnapshot.docs.map(doc => doc.data());
};

export const deleteSubscription = async (userId: string, endpoint: string = "") => {
  let q;
  if (endpoint) {
    q = query(
      collection(db, "subscriptions"),
      where("userId", "==", userId),
      where("endpoint", "==", endpoint)
    );
  } else {
    // Delete all subscriptions for the user
    q = query(
      collection(db, "subscriptions"),
      where("userId", "==", userId)
    );
  }
  const snapshot = await getDocs(q);
  const deletePromises = snapshot.docs.map(document => deleteDoc(doc(db, "subscriptions", document.id)));
  await Promise.all(deletePromises);
};
