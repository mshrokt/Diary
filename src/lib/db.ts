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
  tags: string[] = []
): Promise<string> => {
  const newDiary = {
    userId,
    content,
    date,
    tags,
    createdAt: Date.now(),
  };
  const docRef = await addDoc(collection(db, DIARIES_COLLECTION), newDiary);
  return docRef.id;
};

export const updateDiary = async (
  id: string,
  content: string,
  date: number,
  tags: string[] = []
): Promise<void> => {
  const diaryRef = doc(db, DIARIES_COLLECTION, id);
  await updateDoc(diaryRef, {
    content,
    date,
    tags,
  });
};

export const deleteDiary = async (id: string): Promise<void> => {
  const diaryRef = doc(db, DIARIES_COLLECTION, id);
  await deleteDoc(diaryRef);
};
