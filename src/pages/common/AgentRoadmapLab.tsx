import React, { useEffect, useMemo, useState } from 'react';
import {
  AccessTime,
  AutoAwesome,
  Psychology,
  Quiz,
  School,
  SmartDisplay
} from '@mui/icons-material';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import { API_BASE_URL } from '../../env';

interface AgentProfileSummary {
  id: string;
  studentName: string;
  major: string;
  academicYear: number;
  preferredFormats: string[];
  weeklyGoalHours: number;
}

interface RoadmapResponse {
  student: {
    id: string;
    name: string;
    major: string;
    academicYear: number;
  };
  source: 'gemini_flash' | 'deterministic_fallback';
  analysis: {
    recommendedWindow: {
      start: string;
      end: string;
    };
    averageSessionMinutes: number;
    topLoginHour: number;
    consistencyScore: number;
    activeDays: string[];
  };
  toolInvocations: Array<{
    tool: 'quiz_generator' | 'video_recommender' | 'study_qa_coach';
    purpose: string;
    reason: string;
    output: {
      title: string;
      items: string[];
    };
  }>;
  roadmap: Array<{
    day: string;
    theme: string;
    blocks: Array<{
      startTime: string;
      endTime: string;
      title: string;
      instructions: string;
      recommendedTool: string;
      durationMinutes: number;
    }>;
  }>;
  coachingNotes: string[];
}

const toolMeta = {
  video_recommender: {
    icon: <SmartDisplay fontSize="small" />,
    label: 'Video recommender'
  },
  quiz_generator: {
    icon: <Quiz fontSize="small" />,
    label: 'Quiz generator'
  },
  study_qa_coach: {
    icon: <Psychology fontSize="small" />,
    label: 'Study Q&A coach'
  }
};

const AgentRoadmapLab: React.FC = () => {
  const [profiles, setProfiles] = useState<AgentProfileSummary[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [prompt, setPrompt] = useState(
    'Sinh vien dang hoc vao buoi toi va muon roadmap ket hop video, quiz, va hoi dap cho mon kho.'
  );
  const [result, setResult] = useState<RoadmapResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const loadProfiles = async () => {
      const response = await fetch(`${API_BASE_URL}/agent-lab/profiles`);
      const payload = await response.json();

      if (payload.success) {
        setProfiles(payload.data);
        setSelectedProfileId(payload.data[0]?.id || '');
      } else {
        setError(payload.error || 'Khong load duoc mock profiles');
      }
    };

    loadProfiles().catch((fetchError: Error) => {
      setError(fetchError.message);
    });
  }, []);

  const selectedProfile = useMemo(
    () => profiles.find((profile) => profile.id === selectedProfileId) || null,
    [profiles, selectedProfileId]
  );

  const generateRoadmap = async () => {
    try {
      setLoading(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/agent-lab/roadmap`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: selectedProfileId,
          prompt
        })
      });
      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error || 'Khong tao duoc roadmap');
      }

      setResult(payload.data);
    } catch (requestError: any) {
      setError(requestError.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] bg-[radial-gradient(circle_at_top_left,_#fde68a,_transparent_28%),linear-gradient(135deg,_#0f172a,_#1d4ed8)] p-8 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                <AutoAwesome fontSize="small" />
                AI Agent roadmap lab
              </p>
              <h1 className="text-4xl font-semibold leading-tight">
                Demo service goi y lo trinh hoc tap dua tren thoi quen dang nhap
              </h1>
              <p className="text-sm text-blue-100">
                Ban nay dung mock data, co tool selection, co roadmap theo khung gio hoc manh nhat, va san sang de noi vao LMS sau.
              </p>
            </div>
            <Button
              onClick={generateRoadmap}
              disabled={!selectedProfileId || loading}
              style={{
                backgroundColor: '#f59e0b',
                color: '#111827',
                paddingInline: 20,
                fontWeight: 700
              }}
            >
              {loading ? 'Dang sinh roadmap...' : 'Generate roadmap'}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Card
            className="rounded-[24px] border-0 bg-white"
            style={{ borderColor: '#e2e8f0', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.08)' }}
          >
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Mock student</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Chon profile de test phan tich login pattern va roadmap.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Student profile</label>
                <select
                  value={selectedProfileId}
                  onChange={(event) => setSelectedProfileId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500"
                >
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.studentName} - {profile.major}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProfile && (
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-600 p-3 text-white">
                      <School fontSize="small" />
                    </div>
                    <div>
                      <p className="font-semibold">{selectedProfile.studentName}</p>
                      <p className="text-sm text-slate-500">
                        Year {selectedProfile.academicYear} - {selectedProfile.major}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedProfile.preferredFormats.map((format) => (
                      <span
                        key={format}
                        className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800"
                      >
                        {format}
                      </span>
                    ))}
                    <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                      {selectedProfile.weeklyGoalHours}h/week
                    </span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Agent prompt</label>
                <textarea
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  rows={6}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-blue-500"
                />
              </div>

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-6">
            {result ? (
              <>
                <div className="grid gap-4 md:grid-cols-3">
                  <Card
                    className="rounded-[24px] border-0 bg-white"
                    style={{ borderColor: '#e2e8f0', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.07)' }}
                  >
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">Recommended window</p>
                      <div className="flex items-center gap-2 text-2xl font-semibold">
                        <AccessTime />
                        {result.analysis.recommendedWindow.start} - {result.analysis.recommendedWindow.end}
                      </div>
                    </div>
                  </Card>
                  <Card
                    className="rounded-[24px] border-0 bg-white"
                    style={{ borderColor: '#e2e8f0', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.07)' }}
                  >
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">Average session</p>
                      <p className="text-2xl font-semibold">{result.analysis.averageSessionMinutes} mins</p>
                    </div>
                  </Card>
                  <Card
                    className="rounded-[24px] border-0 bg-white"
                    style={{ borderColor: '#e2e8f0', boxShadow: '0 18px 40px rgba(15, 23, 42, 0.07)' }}
                  >
                    <div className="space-y-2">
                      <p className="text-sm text-slate-500">Agent source</p>
                      <p className="text-2xl font-semibold">
                        {result.source === 'gemini_flash' ? 'Gemini Flash' : 'Fallback planner'}
                      </p>
                    </div>
                  </Card>
                </div>

                <Card
                  className="rounded-[24px] border-0 bg-white"
                  style={{ borderColor: '#e2e8f0', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.08)' }}
                >
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">Tool selection</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Agent chon tool phu hop voi thoi quen dang nhap va cach hoc cua sinh vien.
                      </p>
                    </div>
                    <div className="grid gap-4 lg:grid-cols-3">
                      {result.toolInvocations.map((tool) => (
                        <div key={tool.tool} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                            {toolMeta[tool.tool].icon}
                            {toolMeta[tool.tool].label}
                          </div>
                          <p className="mt-3 text-sm font-medium text-slate-900">{tool.purpose}</p>
                          <p className="mt-2 text-sm text-slate-600">{tool.reason}</p>
                          <ul className="mt-3 space-y-2 text-sm text-slate-700">
                            {tool.output.items.map((item) => (
                              <li key={item} className="rounded-xl bg-white px-3 py-2">
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card
                  className="rounded-[24px] border-0 bg-white"
                  style={{ borderColor: '#e2e8f0', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.08)' }}
                >
                  <div className="space-y-4">
                    <div>
                      <h2 className="text-xl font-semibold">Roadmap preview</h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Vi du: neu sinh vien thuong hoc buoi toi, roadmap se day block chinh vao 19:00-21:00.
                      </p>
                    </div>
                    <div className="grid gap-4">
                      {result.roadmap.map((day) => (
                        <div key={day.day} className="rounded-2xl border border-slate-200 p-4">
                          <div className="flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="text-lg font-semibold">{day.day}</h3>
                              <p className="text-sm text-slate-500">{day.theme}</p>
                            </div>
                            <div className="text-sm text-slate-500">
                              Active days: {result.analysis.activeDays.join(', ')}
                            </div>
                          </div>
                          <div className="mt-4 grid gap-3 md:grid-cols-2">
                            {day.blocks.map((block) => (
                              <div key={`${day.day}-${block.startTime}`} className="rounded-2xl bg-slate-50 p-4">
                                <div className="flex items-center justify-between">
                                  <p className="font-semibold">
                                    {block.startTime} - {block.endTime}
                                  </p>
                                  <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                    {block.recommendedTool}
                                  </span>
                                </div>
                                <p className="mt-2 text-base font-semibold text-slate-900">{block.title}</p>
                                <p className="mt-2 text-sm text-slate-600">{block.instructions}</p>
                                <p className="mt-3 text-xs uppercase tracking-wide text-slate-400">
                                  {block.durationMinutes} minutes
                                </p>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>

                <Card
                  className="rounded-[24px] border-0 bg-white"
                  style={{ borderColor: '#e2e8f0', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.08)' }}
                >
                  <div className="space-y-3">
                    <h2 className="text-xl font-semibold">Coaching notes</h2>
                    {result.coachingNotes.map((note) => (
                      <div key={note} className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        {note}
                      </div>
                    ))}
                  </div>
                </Card>
              </>
            ) : (
              <Card
                className="rounded-[24px] border-0 bg-white"
                style={{ borderColor: '#e2e8f0', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.08)' }}
              >
                <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
                  <div className="rounded-full bg-blue-100 p-4 text-blue-700">
                    <AutoAwesome fontSize="large" />
                  </div>
                  <h2 className="mt-6 text-2xl font-semibold">Roadmap se hien o day</h2>
                  <p className="mt-3 max-w-xl text-sm text-slate-500">
                    Chon mock profile va bam Generate roadmap de xem agent phan tich login history, chon tool, va xep lich hoc theo khung gio phu hop.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentRoadmapLab;
