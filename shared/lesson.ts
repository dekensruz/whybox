// Types shared by the client and the API.

export type Understanding = 'clear' | 'partly' | 'lost';

/** What Whybox has learned about the learner from previous lessons. */
export interface LearnerMemory {
  recentLessons: Array<{ title: string; subject: string; predictionCorrect: boolean | null; understanding: Understanding | null }>;
  /** Wrong ideas the learner chose in recent predictions. */
  wrongIdeas: string[];
  /** How the next lesson should adapt its depth and language. */
  adapt: 'simpler' | 'same' | 'deeper';
}

export interface TourStep {
  title: string;
  text: string;
  observe: string;
  parameters: Record<string, number>;
}

/** A short guided tour built against one wrong idea of the learner. */
export interface CounterTour {
  idea: string;
  intro: string;
  steps: TourStep[];
}

export interface LearnerContext {
  role: 'student' | 'teacher';
  levels: string[];
  country: string; // ISO code
  city: string;
  language: string; // language the lesson is written in
  interests: string[];
  subjects: string[];
  deviceUsage: 'own' | 'shared' | 'classroom';
  memory?: LearnerMemory;
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

/** A safe experiment with household objects, filmed by the learner and analysed with SAM 3.1. */
export interface HomeExperiment {
  title: string;
  materials: string[];
  steps: string[];
  /** Short noun phrase for SAM to find and track, e.g. "orange ball". */
  target: string;
  /** Typical real size of the target in centimetres, used to turn pixels into centimetres. */
  targetSizeCm: number;
  motion: 'fall' | 'swing' | 'roll' | 'float' | 'other';
  /** What the learner should notice, and what the lesson predicts. */
  prediction: string;
}

/** Position of the tracked object in one video frame, in source pixels (box centre and size). */
export interface TrackPoint {
  t: number;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RealExperimentResult {
  frameWidth: number;
  frameHeight: number;
  track: TrackPoint[];
  metrics: Array<{ label: string; value: number; unit: string }>;
  verdict: 'matches' | 'close' | 'different' | 'unclear';
  explanation: string;
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
  /** A guided tour of the experiment: each step sets it to a state and says where to look. */
  steps: TourStep[];
  example: { statement: string; solution: string };
  summary: string;
  /** Null when no safe experiment with a trackable object fits the lesson. */
  homeExperiment?: HomeExperiment | null;
  simulation: {
    /** 3D only when depth or rotation is essential to understand the idea. */
    dimension?: '2d' | '3d';
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
