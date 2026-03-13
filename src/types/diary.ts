export interface Diary {
  id: string; // Document ID
  userId: string; // Corresponds to Firebase Auth User ID
  content: string; // The text content of the diary
  date: number; // Stored as timestamp block or standard ISO string for querying. Using number (timestamp)
  tags?: string[]; // Optional array of strings for tagging
  createdAt: number;
}
