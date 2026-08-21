import { EmergencyType } from '../types/er';

export interface DepartmentCategoryMapping {
  department: string;
  category: EmergencyType;
  categoryLabel: string;
}

export const DEPARTMENT_CATEGORY_MAP: DepartmentCategoryMapping[] = [
  { department: 'Cardiology', category: 'Cardiac', categoryLabel: 'Cardiac Emergency' },
  { department: 'Orthopedics', category: 'Trauma', categoryLabel: 'Trauma / Accident' },
  { department: 'Pulmonology', category: 'Respiratory', categoryLabel: 'Respiratory Distress' },
  { department: 'Neurology', category: 'Neurological', categoryLabel: 'Neurological / Stroke' },
  { department: 'Plastic Surgery', category: 'Burns', categoryLabel: 'Burns & Thermal' },
  { department: 'Pediatrics', category: 'Pediatric', categoryLabel: 'Pediatric Emergency' },
  { department: 'General Medicine', category: 'General Emergency', categoryLabel: 'General Emergency' },
  { department: 'Emergency', category: 'General Emergency', categoryLabel: 'General Emergency' },
  { department: 'Other', category: 'Other', categoryLabel: 'Other Emergency' },
];

/**
  Map Emergency Category to associated Department name
 */
export function getDepartmentForCategory(category: EmergencyType | string): string {
  const normCat = (category || '').toLowerCase();
  const match = DEPARTMENT_CATEGORY_MAP.find(
    (m) =>
      m.category.toLowerCase() === normCat ||
      m.categoryLabel.toLowerCase().includes(normCat) ||
      normCat.includes(m.category.toLowerCase())
  );
  return match ? match.department : 'General Medicine';
}

/**
  Map Department name to associated Emergency Category
 */
export function getCategoryForDepartment(department: string): EmergencyType {
  const normDept = (department || '').toLowerCase();
  const match = DEPARTMENT_CATEGORY_MAP.find((m) => m.department.toLowerCase().includes(normDept) || normDept.includes(m.department.toLowerCase()));
  return match ? match.category : 'General Emergency';
}
