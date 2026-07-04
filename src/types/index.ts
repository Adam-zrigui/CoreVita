export type StudyStatus = "PENDING" | "READING" | "REPORTED";

export type StudySummary = {
  id: string;
  studyUid: string;
  patientName?: string | null;
  title?: string | null;
  modality?: string | null;
  slices: number;
  status: StudyStatus;
};
