import 'dotenv/config';

import { readFile } from 'fs/promises';
import { join } from 'path';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { storage } from '../storage.js';

type LearningFormat = 'video' | 'quiz' | 'reading' | 'practice' | 'qa';
type TimeBucket = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_night';
type ToolName = 'quiz_generator' | 'video_recommender' | 'study_qa_coach';

interface LoginEvent {
  timestamp: string;
  durationMinutes: number;
  device: string;
}

interface RecentTask {
  subject: string;
  type: LearningFormat;
  status: 'completed' | 'in_progress' | 'pending';
}

interface LearningProfile {
  id: string;
  studentName: string;
  major: string;
  academicYear: number;
  interests: string[];
  currentCourses: string[];
  challengeAreas: string[];
  weeklyGoalHours: number;
  learningStyle: {
    preferredFormats: LearningFormat[];
    pace: string;
    likesShortBursts: boolean;
  };
  loginHistory: LoginEvent[];
  recentTasks: RecentTask[];
}

interface ToolInvocation {
  tool: ToolName;
  purpose: string;
  reason: string;
  output: {
    title: string;
    items: string[];
  };
}

interface RoadmapBlock {
  startTime: string;
  endTime: string;
  durationMinutes: number;
  title: string;
  focus: string;
  recommendedTool: ToolName;
  format: LearningFormat;
  instructions: string;
}

interface RoadmapDay {
  day: string;
  theme: string;
  blocks: RoadmapBlock[];
}

interface HabitAnalysis {
  preferredBucket: TimeBucket;
  recommendedWindow: {
    start: string;
    end: string;
  };
  averageSessionMinutes: number;
  topLoginHour: number;
  consistencyScore: number;
  bucketBreakdown: Record<TimeBucket, number>;
  activeDays: string[];
}

interface GeminiPlan {
  coachingSummary: string;
  toolSequence: ToolName[];
  focusSubjects: string[];
}

export interface RoadmapAgentResult {
  student: {
    id: string;
    name: string;
    major: string;
    academicYear: number;
  };
  source: 'gemini_flash' | 'deterministic_fallback';
  analysis: HabitAnalysis;
  toolInvocations: ToolInvocation[];
  roadmap: RoadmapDay[];
  coachingNotes: string[];
  generatedAt: string;
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const GEMINI_MODEL = process.env.AGENT_GEMINI_MODEL || 'gemini-2.5-flash';

const WEEK_ORDER = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function getBucket(date: Date): TimeBucket {
  const hour = date.getHours();

  if (hour < 8) return 'early_morning';
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  if (hour < 22) return 'evening';
  return 'late_night';
}

function labelBucket(bucket: TimeBucket): string {
  switch (bucket) {
    case 'early_morning':
      return 'early morning';
    case 'morning':
      return 'morning';
    case 'afternoon':
      return 'afternoon';
    case 'evening':
      return 'evening';
    case 'late_night':
      return 'late night';
  }
}

function getRecommendedWindow(bucket: TimeBucket): { start: string; end: string } {
  switch (bucket) {
    case 'early_morning':
      return { start: '06:30', end: '08:00' };
    case 'morning':
      return { start: '08:00', end: '10:00' };
    case 'afternoon':
      return { start: '13:30', end: '15:30' };
    case 'evening':
      return { start: '19:00', end: '21:00' };
    case 'late_night':
      return { start: '21:30', end: '23:00' };
  }
}

function shiftTime(time: string, deltaMinutes: number): string {
  const [hours, minutes] = time.split(':').map(Number);
  const total = hours * 60 + minutes + deltaMinutes;
  const normalized = ((total % (24 * 60)) + (24 * 60)) % (24 * 60);
  const nextHours = Math.floor(normalized / 60)
    .toString()
    .padStart(2, '0');
  const nextMinutes = (normalized % 60).toString().padStart(2, '0');

  return `${nextHours}:${nextMinutes}`;
}

function roundAverage(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function listLearningProfiles(): Promise<LearningProfile[]> {
  const localPath = join(process.cwd(), 'data', 'agent-learning-profiles.json');

  try {
    const raw = await readFile(localPath, 'utf-8');
    const localProfiles = JSON.parse(raw) as LearningProfile[];

    if (localProfiles.length > 0) {
      return localProfiles;
    }
  } catch {
    // Fall back to shared storage when local mock data is unavailable.
  }

  return storage.read<LearningProfile>('agent-learning-profiles.json');
}

export async function getLearningProfile(studentId?: string): Promise<LearningProfile> {
  const profiles = await listLearningProfiles();

  if (!profiles.length) {
    throw new Error('No mock learning profiles found');
  }

  if (!studentId) {
    return profiles[0];
  }

  const profile = profiles.find((item) => item.id === studentId);

  if (!profile) {
    throw new Error(`Mock student profile "${studentId}" was not found`);
  }

  return profile;
}

export function analyzeLearningHabits(profile: LearningProfile): HabitAnalysis {
  const bucketBreakdown: Record<TimeBucket, number> = {
    early_morning: 0,
    morning: 0,
    afternoon: 0,
    evening: 0,
    late_night: 0
  };

  const activeDays = new Set<string>();
  const hours: number[] = [];
  let totalDuration = 0;

  for (const event of profile.loginHistory) {
    const date = new Date(event.timestamp);
    const bucket = getBucket(date);
    bucketBreakdown[bucket] += event.durationMinutes;
    totalDuration += event.durationMinutes;
    hours.push(date.getHours());
    activeDays.add(WEEK_ORDER[date.getDay() === 0 ? 6 : date.getDay() - 1]);
  }

  const preferredBucket = (Object.entries(bucketBreakdown) as Array<[TimeBucket, number]>)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'evening';
  const averageSessionMinutes = totalDuration / Math.max(profile.loginHistory.length, 1);
  const topLoginHour = Math.round(hours.reduce((sum, hour) => sum + hour, 0) / Math.max(hours.length, 1));
  const consistencyScore = Math.min(
    100,
    Math.round((activeDays.size / 7) * 55 + Math.min(45, averageSessionMinutes))
  );

  return {
    preferredBucket,
    recommendedWindow: getRecommendedWindow(preferredBucket),
    averageSessionMinutes: roundAverage(averageSessionMinutes),
    topLoginHour,
    consistencyScore,
    bucketBreakdown,
    activeDays: WEEK_ORDER.filter((day) => activeDays.has(day))
  };
}

function buildQuizTool(profile: LearningProfile, subject: string): ToolInvocation {
  return {
    tool: 'quiz_generator',
    purpose: `Generate a short ${subject} drill`,
    reason: `${profile.studentName} responds well to quick checks and has quiz in preferred formats.`,
    output: {
      title: `${subject} quick quiz`,
      items: [
        `5 multiple-choice questions on the hardest ${subject} concept this week.`,
        '1 timed reflection question to capture mistakes after the quiz.',
        'Auto-review note: revisit every wrong answer within 10 minutes.'
      ]
    }
  };
}

function buildVideoTool(profile: LearningProfile, subject: string): ToolInvocation {
  return {
    tool: 'video_recommender',
    purpose: `Recommend a short explainer video for ${subject}`,
    reason: `${profile.studentName} prefers visual onboarding before practice.`,
    output: {
      title: `${subject} video path`,
      items: [
        `1 overview video under 12 minutes for ${subject}.`,
        '1 worked-example clip to watch at 1.25x speed.',
        'Pause prompt: write 3 notes immediately after each segment.'
      ]
    }
  };
}

function buildQaTool(profile: LearningProfile, subject: string, prompt?: string): ToolInvocation {
  return {
    tool: 'study_qa_coach',
    purpose: `Walk through ${subject} questions step by step`,
    reason: `${profile.studentName} benefits from guided reasoning when solving tougher problems.`,
    output: {
      title: `${subject} Q&A coach`,
      items: [
        `Break the problem into givens, target, and method before solving.`,
        prompt
          ? `Use the student's prompt "${prompt}" as the first worked example.`
          : 'Start with one representative problem and explain the reasoning path.',
        'Finish with one follow-up question the student should solve alone.'
      ]
    }
  };
}

function getDefaultSubjects(profile: LearningProfile): string[] {
  return profile.currentCourses.slice(0, 3);
}

function getFallbackToolSequence(profile: LearningProfile, prompt?: string): ToolName[] {
  const preferred = profile.learningStyle.preferredFormats;
  const sequence: ToolName[] = [];

  if (preferred.includes('video')) sequence.push('video_recommender');
  if (preferred.includes('quiz') || preferred.includes('practice')) sequence.push('quiz_generator');
  if (preferred.includes('qa')) sequence.push('study_qa_coach');

  if (prompt && !sequence.includes('study_qa_coach')) {
    sequence.push('study_qa_coach');
  }

  if (!sequence.length) {
    sequence.push('video_recommender', 'quiz_generator');
  }

  return sequence.slice(0, 3);
}

function safeJsonParse<T>(input: string): T | null {
  const firstBrace = input.indexOf('{');
  const lastBrace = input.lastIndexOf('}');

  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  try {
    return JSON.parse(input.slice(firstBrace, lastBrace + 1)) as T;
  } catch {
    return null;
  }
}

async function planWithGemini(profile: LearningProfile, analysis: HabitAnalysis, prompt?: string): Promise<GeminiPlan | null> {
  if (!process.env.GEMINI_API_KEY) {
    return null;
  }

  try {
    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      generationConfig: {
        temperature: 0.4,
        topP: 0.9,
        maxOutputTokens: 700
      }
    });

    const response = await model.generateContent(`
You are an educational AI agent planner.
Return strict JSON only with this shape:
{
  "coachingSummary": "string",
  "toolSequence": ["video_recommender", "quiz_generator", "study_qa_coach"],
  "focusSubjects": ["subject 1", "subject 2"]
}

Student profile:
- Name: ${profile.studentName}
- Major: ${profile.major}
- Courses: ${profile.currentCourses.join(', ')}
- Interests: ${profile.interests.join(', ')}
- Preferred formats: ${profile.learningStyle.preferredFormats.join(', ')}
- Challenge areas: ${profile.challengeAreas.join(', ')}
- Preferred study bucket: ${labelBucket(analysis.preferredBucket)}
- Recommended window: ${analysis.recommendedWindow.start}-${analysis.recommendedWindow.end}
- Average session minutes: ${analysis.averageSessionMinutes}
- Active days: ${analysis.activeDays.join(', ')}
- Student prompt: ${prompt || 'No extra prompt'}

Choose the best 2 or 3 tools. Favor realistic study flow, not marketing language.
`);

    const text = response.response.text();
    const parsed = safeJsonParse<GeminiPlan>(text);

    if (!parsed || !Array.isArray(parsed.toolSequence) || !Array.isArray(parsed.focusSubjects)) {
      return null;
    }

    return {
      coachingSummary: parsed.coachingSummary || 'Gemini planned a structured learning flow.',
      toolSequence: parsed.toolSequence.filter((item): item is ToolName =>
        ['video_recommender', 'quiz_generator', 'study_qa_coach'].includes(item)
      ),
      focusSubjects: parsed.focusSubjects.filter(Boolean).slice(0, 3)
    };
  } catch (error) {
    console.warn('Gemini planning fallback:', error);
    return null;
  }
}

function buildToolInvocations(profile: LearningProfile, subjects: string[], toolSequence: ToolName[], prompt?: string): ToolInvocation[] {
  const resolvedSubjects = subjects.length ? subjects : getDefaultSubjects(profile);

  return toolSequence.map((tool, index) => {
    const subject = resolvedSubjects[index % resolvedSubjects.length];

    switch (tool) {
      case 'video_recommender':
        return buildVideoTool(profile, subject);
      case 'quiz_generator':
        return buildQuizTool(profile, subject);
      case 'study_qa_coach':
        return buildQaTool(profile, subject, prompt);
    }
  });
}

function buildRoadmap(profile: LearningProfile, analysis: HabitAnalysis, tools: ToolInvocation[]): RoadmapDay[] {
  const windowStart = analysis.recommendedWindow.start;
  const averageBlock = Math.max(30, Math.min(75, Math.round(analysis.averageSessionMinutes)));
  const days = analysis.activeDays.length ? analysis.activeDays.slice(0, 4) : ['Monday', 'Wednesday', 'Friday'];

  return days.map((day, dayIndex) => {
    const firstTool = tools[dayIndex % tools.length];
    const secondTool = tools[(dayIndex + 1) % tools.length];
    const firstEnd = shiftTime(windowStart, Math.min(averageBlock, 45));
    const secondStart = shiftTime(firstEnd, 10);
    const secondEnd = shiftTime(secondStart, 20);

    return {
      day,
      theme: `Study around your strongest ${labelBucket(analysis.preferredBucket)} rhythm`,
      blocks: [
        {
          startTime: windowStart,
          endTime: firstEnd,
          durationMinutes: Math.min(averageBlock, 45),
          title: firstTool.output.title,
          focus: firstTool.purpose,
          recommendedTool: firstTool.tool,
          format: firstTool.tool === 'video_recommender' ? 'video' : firstTool.tool === 'quiz_generator' ? 'quiz' : 'qa',
          instructions: firstTool.output.items[0]
        },
        {
          startTime: secondStart,
          endTime: secondEnd,
          durationMinutes: 20,
          title: 'Retention wrap-up',
          focus: secondTool.purpose,
          recommendedTool: secondTool.tool,
          format: secondTool.tool === 'quiz_generator' ? 'quiz' : secondTool.tool === 'video_recommender' ? 'video' : 'qa',
          instructions: secondTool.output.items[1]
        }
      ]
    };
  });
}

export async function generateLearningRoadmap(studentId?: string, prompt?: string): Promise<RoadmapAgentResult> {
  const profile = await getLearningProfile(studentId);
  const analysis = analyzeLearningHabits(profile);
  const geminiPlan = await planWithGemini(profile, analysis, prompt);
  const toolSequence = geminiPlan?.toolSequence?.length
    ? geminiPlan.toolSequence
    : getFallbackToolSequence(profile, prompt);
  const subjects = geminiPlan?.focusSubjects?.length ? geminiPlan.focusSubjects : getDefaultSubjects(profile);
  const toolInvocations = buildToolInvocations(profile, subjects, toolSequence, prompt);
  const roadmap = buildRoadmap(profile, analysis, toolInvocations);

  return {
    student: {
      id: profile.id,
      name: profile.studentName,
      major: profile.major,
      academicYear: profile.academicYear
    },
    source: geminiPlan ? 'gemini_flash' : 'deterministic_fallback',
    analysis,
    toolInvocations,
    roadmap,
    coachingNotes: [
      geminiPlan?.coachingSummary ||
        `${profile.studentName} studies best in the ${labelBucket(analysis.preferredBucket)}, so the roadmap keeps the main work inside ${analysis.recommendedWindow.start}-${analysis.recommendedWindow.end}.`,
      `Average study session is ${analysis.averageSessionMinutes} minutes, so each plan block stays short enough to match current behavior.`,
      `Priority subjects this week: ${subjects.join(', ')}.`
    ],
    generatedAt: new Date().toISOString()
  };
}
