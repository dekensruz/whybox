// Types shared by the client and the API.

export interface LearnerContext {
  role: 'student' | 'teacher';
  levels: string[];
  country: string; // ISO code
  city: string;
  language: string; // language the lesson is written in
  interests: string[];
  subjects: string[];
  deviceUsage: 'own' | 'shared' | 'classroom';
}

export interface LessonRequest {
  learner: LearnerContext;
  question?: string;
  /** JPEG data URL of a notebook page, blackboard or textbook page. */
  image?: string;
}

export interface SimulationParameter {
  name: string; // identifier used by window.whybox, e.g. "voltage"
  label: string;
  unit: string;
  min: number;
  max: number;
  default: number;
  step: number;
}

export interface SimulationMeasurement {
  name: string;
  label: string;
  unit: string;
  /** Arithmetic expression of parameter names giving the exact expected value, e.g. "voltage / resistance". */
  formula: string;
}

export interface LessonPlan {
  title: string;
  subject: string;
  /** Concrete question from the learner's everyday life that the lesson answers. */
  hook: string;
  prediction: {
    question: string;
    options: string[];
    answerIndex: number;
    explanation: string;
  };
  concepts: Array<{ term: string; definition: string; analogy: string }>;
  steps: Array<{ title: string; text: string }>;
  example: { statement: string; solution: string };
  summary: string;
  simulation: {
    description: string;
    parameters: SimulationParameter[];
    measurements: SimulationMeasurement[];
  };
}

export interface CheckFailure {
  parameters: Record<string, number>;
  measurement: string;
  expected: number;
  received: number | null;
}

export interface Usage {
  inputTokens: number;
  outputTokens: number;
}
