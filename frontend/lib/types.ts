export type RiskType =
  | "weak_causality"
  | "vague_claim"
  | "exaggeration"
  | "inconsistency"
  | "role_mismatch";

export type KeyRisk = {
  type: RiskType;
  quote: string;
  analysis: string;
  interviewer_intent: string;
};

export type PressureQuestion = {
  question: string;
  goal: string;
};

export type AnalyzeResumeResponse = {
  key_risks: KeyRisk[];
  pressure_questions: PressureQuestion[];
};

export type ImproveQuestionRequest = {
  question: string;
  job_description?: string;
};

export type ImproveQuestionResponse = {
  is_generic: boolean;
  issues: string[];
  improved_question: string;
  follow_ups: {
    trade_off: string;
    metrics: string;
    personal_contribution: string;
  };
};
