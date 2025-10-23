// src/lib/supabaseTypes.ts
export interface Lesson {
  id: string;
  course_id: string;
  module_number: number;
  lesson_number: number;
  section_number: number;
  title: string;
  content: any;
  order_index: number;
  created_at: string;
}

export interface GroupedLessons {
  [moduleNumber: number]: {
    [lessonNumber: number]: Lesson[];
  };
}