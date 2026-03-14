import { db } from "./firebase";
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  writeBatch,
} from "firebase/firestore";

const DIARIES_COLLECTION = "diaries";

/**
 * Renames a tag across all diaries for a specific user.
 */
export const renameTag = async (userId: string, oldName: string, newName: string): Promise<void> => {
  if (!userId || !oldName || !newName || oldName === newName) return;

  const q = query(
    collection(db, DIARIES_COLLECTION),
    where("userId", "==", userId),
    where("tags", "array-contains", oldName)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return;

  const batch = writeBatch(db);
  querySnapshot.docs.forEach((diaryDoc) => {
    const data = diaryDoc.data();
    const updatedTags = data.tags.map((tag: string) => (tag === oldName ? newName : tag));
    // Remove duplicates if newName already existed in the tags array
    const uniqueTags = Array.from(new Set(updatedTags));
    
    batch.update(diaryDoc.ref, {
      tags: uniqueTags,
      updatedAt: Date.now(),
    });
  });

  await batch.commit();
};

/**
 * Deletes a tag from all diaries for a specific user.
 */
export const deleteTag = async (userId: string, tagName: string): Promise<void> => {
  if (!userId || !tagName) return;

  const q = query(
    collection(db, DIARIES_COLLECTION),
    where("userId", "==", userId),
    where("tags", "array-contains", tagName)
  );

  const querySnapshot = await getDocs(q);
  if (querySnapshot.empty) return;

  const batch = writeBatch(db);
  querySnapshot.docs.forEach((diaryDoc) => {
    const data = diaryDoc.data();
    const updatedTags = data.tags.filter((tag: string) => tag !== tagName);
    
    batch.update(diaryDoc.ref, {
      tags: updatedTags,
      updatedAt: Date.now(),
    });
  });

  await batch.commit();
};
