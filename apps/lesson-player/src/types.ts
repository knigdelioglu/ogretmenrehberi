export type DensityKind = "large" | "comfortable" | "compact";

export type LayoutKind =
  | "question"
  | "vocabulary"
  | "process"
  | "reference"
  | "comparison"
  | "structure"
  | "assessment";

export type AnswerSections =
  | Record<string, string | string[] | Record<string, unknown>>
  | null;

export interface AnswerEntry {
  question_id: string;
  entry_type: "question_answer" | "performance_support" | "source_limited";
  printed_page: number;
  question_no?: string;
  prompt_summary: string;
  answer: string;
  guidance?: string;
  explanation?: string;
  evidence_quotes?: string[];
  answer_sections?: AnswerSections;
  source_locator: string;
}

export interface SourceRecord {
  source_record_id: string;
  printed_page_range: string;
  book_heading: string;
  task_type: string;
  prompt?: string;
  source_locator: string;
  source_status: string;
}

export interface SupplementalSection {
  title: string;
  body: string;
}

export interface StepContent {
  lead?: string;
  items?: string[];
  sections?: SupplementalSection[];
  note?: string;
}


export interface LessonStep {
  id: string;
  layout: LayoutKind;
  density: DensityKind;
  reveal_order: RevealKey[];
  display_prompt: string;
  display_prompt_mode:
    | "FLOW_OVERRIDE"
    | "VERBATIM_SHORT"
    | "VERIFIED_SUMMARY"
    | "SOURCE_PROMPT"
    | "ANSWER_SUMMARY"
    | "SOURCE_OR_CONTENT";
  source: SourceRecord;
  answer: AnswerEntry | null;
  content: StepContent | null;
}

export interface LessonData {
  schema_version: string;
  theme_id: string;
  lesson_id: string;
  lesson_slug: string;
  title: string;
  subtitle: string;
  printed_page_range: string;
  required_source_range: {
    from: string;
    to: string;
  };
  generated_at: string;
  coverage: {
    source_records: number;
    answer_entries: number;
    steps: number;
  };
  steps: LessonStep[];
}

export type RevealKey = "guidance" | "answer" | "evidence" | "explanation" | "note";
