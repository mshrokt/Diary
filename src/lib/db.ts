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
} from "firebase/firestore";
import { Diary } from "@/types/diary";

const DIARIES_COLLECTION = "diaries";

export const getDiaries = async (userId: string): Promise<Diary[]> => {
  if (!userId) return [];

  const q = query(
    collection(db, DIARIES_COLLECTION),
    where("userId", "==", userId),
    orderBy("date", "desc")
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
  imageUrl: string | null = null
): Promise<string> => {
  const newDiary = {
    userId,
    content,
    date,
    tags,
    imageUrl,
    createdAt: Date.now(),
  };
  const docRef = await addDoc(collection(db, DIARIES_COLLECTION), newDiary);
  return docRef.id;
};

export const updateDiary = async (
  id: string,
  content: string,
  date: number,
  tags: string[] = [],
  imageUrl: string | null = null
): Promise<void> => {
  const diaryRef = doc(db, DIARIES_COLLECTION, id);
  const updateData: any = {
    content,
    date,
    tags,
  };
  if (imageUrl !== undefined) {
    updateData.imageUrl = imageUrl;
  }
  await updateDoc(diaryRef, updateData);
};

export const deleteDiary = async (id: string): Promise<void> => {
  const diaryRef = doc(db, DIARIES_COLLECTION, id);
  await deleteDoc(diaryRef);
};
