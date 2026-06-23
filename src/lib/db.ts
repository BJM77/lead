// src/lib/db.ts
import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  updateDoc,
  onSnapshot,
  query,
  getDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from './firebase';
import type { Lead, NewLead } from '@/types';

const leadsCollection = collection(db, 'leads');

// Create a new lead
export async function createLead(leadData: Omit<NewLead, 'userId' | 'createdAt'>, explicitUserId?: string): Promise<Lead> {
  const userId = explicitUserId || auth.currentUser?.uid;
  if (!userId) throw new Error("Operator authentication missing.");

  // Deduplication check by website
  if (leadData.company?.website) {
     const websiteQ = query(leadsCollection, where("userId", "==", userId), where("company.website", "==", leadData.company.website));
     const websiteDocs = await getDocs(websiteQ);
     if (!websiteDocs.empty) {
         throw new Error(`Duplicate Lead: A lead with website ${leadData.company.website} already exists in your database.`);
     }
  }

  // Removed deduplication check by sourceUrl because bulk captures from the same URL are valid.

  // Deduplication check by email
  if (leadData.email && !leadData.email.includes('no-email-')) {
     const emailQ = query(leadsCollection, where("userId", "==", userId), where("email", "==", leadData.email));
     const emailDocs = await getDocs(emailQ);
     if (!emailDocs.empty) {
         throw new Error(`Duplicate Lead: A lead with email ${leadData.email} already exists in your database.`);
     }
  }

  const docRef = await addDoc(leadsCollection, {
    ...leadData,
    userId: userId,
    createdAt: Date.now(),
  });
  const newDoc = await getDoc(docRef);
  return { id: newDoc.id, ...newDoc.data() } as Lead;
}

// Get all leads for the current user
export async function getLeads(): Promise<Lead[]> {
  const userId = auth.currentUser?.uid;
  if (!userId) return [];
  
  const q = query(leadsCollection, where("userId", "==", userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(
    (doc) => ({ id: doc.id, ...doc.data() } as Lead)
  );
}

// Reactive lead listener with session persistence
export function listenToLeads(callback: (leads: Lead[]) => void): () => void {
  const userId = auth.currentUser?.uid;
  
  if (!userId) {
      console.warn("[DB] No active operator session detected for sync.");
      callback([]);
      return () => {};
  }

  const q = query(leadsCollection, where("userId", "==", userId));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const leads = querySnapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() } as Lead)
    );
    console.log(`[DB] Sync complete. ${leads.length} tactical targets retrieved.`);
    callback(leads);
  }, (error) => {
      console.error("[DB] Intelligence sync error:", error);
      callback([]);
  });
  return unsubscribe;
}

// Delete a lead with ownership validation
export async function deleteLead(leadId: string): Promise<void> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Operator authentication required.");

  const leadDocRef = doc(db, 'leads', leadId);
  const leadDoc = await getDoc(leadDocRef);

  if (!leadDoc.exists() || leadDoc.data().userId !== userId) {
      throw new Error("Access denied: You do not own this intelligence target.");
  }
  
  await deleteDoc(leadDocRef);
}

// Update lead status
export async function updateLeadOutcome(
  leadId: string,
  outcome: 'converted' | 'lost' | 'unresponsive'
): Promise<{ success: boolean }> {
    const userId = auth.currentUser?.uid;
    if (!userId) throw new Error("Operator authentication required.");

    const leadDocRef = doc(db, 'leads', leadId);
    const leadDoc = await getDoc(leadDocRef);
    if (!leadDoc.exists() || leadDoc.data().userId !== userId) {
        throw new Error("Access denied.");
    }

    await updateDoc(leadDocRef, { status: outcome });
    return { success: true };
}

// Jobs
const jobsCollection = collection(db, 'jobs');

export async function createJob(type: string): Promise<string> {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error("Operator authentication required for jobs.");

  const docRef = await addDoc(jobsCollection, {
    userId,
    status: 'pending',
    type,
    progress: 0,
    message: 'Initializing...',
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return docRef.id;
}

export async function updateJobProgress(jobId: string, updates: { status?: 'pending' | 'processing' | 'completed' | 'failed'; progress?: number; message?: string; error?: string }) {
  const jobDocRef = doc(db, 'jobs', jobId);
  await updateDoc(jobDocRef, {
    ...updates,
    updatedAt: Date.now(),
  });
}

export function listenToJobs(callback: (jobs: any[]) => void): () => void {
  const userId = auth.currentUser?.uid;
  if (!userId) {
      callback([]);
      return () => {};
  }

  const q = query(jobsCollection, where("userId", "==", userId));
  const unsubscribe = onSnapshot(q, (querySnapshot) => {
    const jobs = querySnapshot.docs.map(
      (d) => ({ id: d.id, ...d.data() })
    );
    // Sort by newest first
    jobs.sort((a: any, b: any) => b.createdAt - a.createdAt);
    callback(jobs);
  }, (error) => {
      console.error("[DB] Job sync error:", error);
      callback([]);
  });
  return unsubscribe;
}
