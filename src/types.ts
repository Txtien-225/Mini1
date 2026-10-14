export const CATEGORIES = ['Hardware', 'Projector', 'AC', 'Electrical', 'Furniture'] as const;
export type Category = typeof CATEGORIES[number];
export type SurveyStatus = 'PENDING_SYNC' | 'SYNCED' | 'FAILED';

export interface Survey {
  id: string;
  building: string;
  floor: string;
  room: string;
  category: Category;
  rating: number;
  notes: string;
  photo?: string;
  createdAt: string;
  status: SurveyStatus;
}

export type Draft = Omit<Survey, 'id' | 'createdAt' | 'status'>;
