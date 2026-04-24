import { describe, expect, it } from 'vitest';
import { analyzeLearningHabits } from '../lib/services/learningRoadmapAgent.js';

describe('AI roadmap agent', () => {
  it('detects evening as the preferred study bucket', () => {
    const analysis = analyzeLearningHabits({
      id: 'demo',
      studentName: 'Evening Student',
      major: 'Computer Science',
      academicYear: 3,
      interests: ['algorithms'],
      currentCourses: ['Algorithms'],
      challengeAreas: ['proof'],
      weeklyGoalHours: 8,
      learningStyle: {
        preferredFormats: ['video', 'quiz'],
        pace: 'steady',
        likesShortBursts: true
      },
      loginHistory: [
        { timestamp: '2026-04-21T19:15:00+07:00', durationMinutes: 50, device: 'laptop' },
        { timestamp: '2026-04-22T20:00:00+07:00', durationMinutes: 45, device: 'mobile' },
        { timestamp: '2026-04-23T07:10:00+07:00', durationMinutes: 15, device: 'mobile' }
      ],
      recentTasks: []
    });

    expect(analysis.preferredBucket).toBe('evening');
    expect(analysis.recommendedWindow).toEqual({ start: '19:00', end: '21:00' });
    expect(analysis.averageSessionMinutes).toBeGreaterThan(30);
  });
});
