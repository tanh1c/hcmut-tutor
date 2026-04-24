import React, { useEffect, useMemo, useState } from 'react';
import {
  AutoAwesome,
  CloudUpload,
  Description,
  Psychology,
  Quiz,
  School,
  SmartDisplay
} from '@mui/icons-material';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import MarkdownContent from '../../components/ui/MarkdownContent';
import { API_BASE_URL } from '../../env';

interface AgentProfileSummary {
  id: string;
  studentName: string;
  major: string;
  academicYear: number;
  preferredFormats: string[];
  weeklyGoalHours: number;
}

interface AgentDocument {
  id: string;
  name: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
  extractionStatus: 'pending' | 'ready';
  extractedTextPreview?: string | null;
}

interface AgentReasoningStep {
  title: string;
  detail: string;
}

interface AgentToolDecision {
  selectedTool: 'document_to_text' | 'problem_solver' | 'quiz_generator' | 'video_recommender';
  rationale: string;
  confidence: number;
  consideredSignals: string[];
  executionPlan: string[];
  reasoningTrace: AgentReasoningStep[];
  executionStatus: 'planned' | 'placeholder_pending';
  source: 'langgraph_gemini' | 'langgraph_deterministic';
  needsDocumentText: boolean;
}

interface AgentChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: string;
  meta?: Record<string, any>;
}

interface AgentChatSessionState {
  session: {
    id: string;
    title: string;
    studentId?: string | null;
    studentName?: string | null;
    createdAt: string;
    updatedAt: string;
    documentCount: number;
  };
  documents: AgentDocument[];
  messages: AgentChatMessage[];
  latestDecision?: AgentToolDecision | null;
  latestExecution?: {
    tool: AgentToolDecision['selectedTool'];
    summary: string;
    output: string;
    citations: string[];
    status: 'completed' | 'partial' | 'placeholder_pending';
  } | null;
  tutoringProgress?: {
    mode: 'guided';
    currentPart: string;
    currentStepIndex: number;
    totalSteps: number;
    awaitingConfirmation: boolean;
    nextActionHint: string;
  } | null;
}

interface AgentStreamEvent {
  type: 'status' | 'graph_update' | 'tool_selected' | 'tool_result' | 'session_state' | 'error';
  message: string;
  node?: string | null;
  decision?: AgentToolDecision | null;
  execution?: AgentChatSessionState['latestExecution'] | null;
  session?: AgentChatSessionState | null;
}

const toolBadge: Record<AgentToolDecision['selectedTool'], { label: string; icon: React.ReactNode }> = {
  document_to_text: {
    label: 'Document to text',
    icon: <Description fontSize="small" />
  },
  problem_solver: {
    label: 'Problem solver',
    icon: <Psychology fontSize="small" />
  },
  quiz_generator: {
    label: 'Quiz generator',
    icon: <Quiz fontSize="small" />
  },
  video_recommender: {
    label: 'Video recommender',
    icon: <SmartDisplay fontSize="small" />
  }
};

async function fileToBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error(`Failed to read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

const AgentToolChatLab: React.FC = () => {
  const [profiles, setProfiles] = useState<AgentProfileSummary[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [sessionState, setSessionState] = useState<AgentChatSessionState | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [message, setMessage] = useState(
    'Solve question 1 for me based on the uploaded problem statement.'
  );
  const [loadingProfiles, setLoadingProfiles] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [streamEvents, setStreamEvents] = useState<AgentStreamEvent[]>([]);

  useEffect(() => {
    const loadProfiles = async () => {
      try {
        setLoadingProfiles(true);
        const response = await fetch(`${API_BASE_URL}/agent-lab/profiles`);
        const payload = await response.json();

        if (!payload.success) {
          throw new Error(payload.error || 'Failed to load agent profiles');
        }

        setProfiles(payload.data);
        setSelectedProfileId(payload.data[0]?.id || '');
      } catch (fetchError: any) {
        setError(fetchError.message || 'Failed to load profiles');
      } finally {
        setLoadingProfiles(false);
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

  const startWorkspace = async () => {
    try {
      setBusy(true);
      setError('');

      const response = await fetch(`${API_BASE_URL}/agent-lab/chat/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          studentId: selectedProfileId,
          title: selectedProfile ? `${selectedProfile.studentName} chat lab` : 'Agent chat workspace'
        })
      });
      const payload = await response.json();

      if (!payload.success) {
        throw new Error(payload.error || 'Failed to create chat workspace');
      }

      setSessionState(payload.data);
      setStreamEvents([]);
    } catch (requestError: any) {
      setError(requestError.message || 'Failed to create chat workspace');
    } finally {
      setBusy(false);
    }
  };

  const uploadDocuments = async () => {
    if (!sessionState || selectedFiles.length === 0) {
      return;
    }

    try {
      setBusy(true);
      setError('');

      console.log('Uploading documents:', { sessionId: sessionState.session.id, files: selectedFiles.map(f => f.name) });

      const response = await fetch(
        `${API_BASE_URL}/agent-lab/chat/sessions/${sessionState.session.id}/documents`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            studentId: selectedProfileId,
            documents: await Promise.all(
              selectedFiles.map(async (file) => ({
                name: file.name,
                mimeType: file.type || 'application/octet-stream',
                size: file.size,
                textContent:
                  file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)
                    ? await file.text()
                    : null,
                contentBase64:
                  file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)
                    ? null
                    : await fileToBase64(file)
              }))
            )
          })
        }
      );

      const payload = await response.json();
      console.log('Upload response:', { status: response.status, payload });

      if (!payload.success) {
        throw new Error(payload.error || 'Failed to upload documents');
      }

      setSessionState(payload.data);
      setSelectedFiles([]);
      console.log('Session state updated, documents count:', payload.data.documents.length);
    } catch (requestError: any) {
      console.error('Upload error:', requestError);
      setError(requestError.message || 'Failed to upload documents');
    } finally {
      setBusy(false);
    }
  };

  const sendMessage = async () => {
    if (!sessionState || !message.trim()) {
      return;
    }

    try {
      setBusy(true);
      setError('');
      setStreamEvents([]);

      // Auto-upload any selected files first
      if (selectedFiles.length > 0) {
        console.log('Auto-uploading files before sending message...');
        const uploadResponse = await fetch(
          `${API_BASE_URL}/agent-lab/chat/sessions/${sessionState.session.id}/documents`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              studentId: selectedProfileId,
              documents: await Promise.all(
                selectedFiles.map(async (file) => ({
                  name: file.name,
                  mimeType: file.type || 'application/octet-stream',
                  size: file.size,
                  textContent:
                    file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)
                      ? await file.text()
                      : null,
                  contentBase64:
                    file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)
                      ? null
                      : await fileToBase64(file)
                }))
              )
            })
          }
        );

        const uploadPayload = await uploadResponse.json();
        console.log('Auto-upload response:', uploadPayload);

        if (!uploadPayload.success) {
          throw new Error(uploadPayload.error || 'Failed to upload documents');
        }

        // Update session state with uploaded documents
        setSessionState(uploadPayload.data);
        setSelectedFiles([]);
      }

      // Now send the message
      const response = await fetch(
        `${API_BASE_URL}/agent-lab/chat/sessions/${sessionState.session.id}/messages/stream`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/x-ndjson'
          },
          body: JSON.stringify({
            studentId: selectedProfileId,
            message: message.trim()
          })
        }
      );

      if (!response.ok || !response.body) {
        const fallbackText = await response.text();
        throw new Error(fallbackText || 'Failed to stream agent message');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            continue;
          }

          const event = JSON.parse(trimmed) as AgentStreamEvent;
          setStreamEvents((current) => [...current, event]);

          if (event.session) {
            setSessionState(event.session);
          }
        }
      }

      // Clear message after sending
      setMessage('');
    } catch (requestError: any) {
      console.error('Send message error:', requestError);
      setError(requestError.message || 'Failed to send message');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="rounded-[28px] bg-[radial-gradient(circle_at_top_left,_#bfdbfe,_transparent_30%),linear-gradient(135deg,_#111827,_#0f766e)] p-8 text-white shadow-xl">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl space-y-3">
              <p className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                <AutoAwesome fontSize="small" />
                Agent chat workflow lab
              </p>
              <h1 className="text-4xl font-semibold leading-tight">
                Let the agent reason from the current input and choose the right tool automatically
              </h1>
              <p className="text-sm text-emerald-100">
                This lab uses a Python LangGraph workflow service. If the current input includes a PDF/image, the workflow should route to document parsing first. Otherwise it should choose the next tool from the user's prompt, such as solving a problem, generating a quiz, or planning a video response.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                onClick={startWorkspace}
                disabled={!selectedProfileId || busy || loadingProfiles}
                style={{
                  backgroundColor: '#f59e0b',
                  color: '#111827',
                  paddingInline: 18,
                  fontWeight: 700
                }}
              >
                {sessionState ? 'Reset workspace' : 'Start workspace'}
              </Button>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[320px_1fr_360px]">
          <Card
            className="rounded-[24px] border-0 bg-white"
            style={{ borderColor: '#e2e8f0', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.08)' }}
          >
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Workspace setup</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Choose a student context, then send the current input. The agent should reason from that input and decide which tool to run next.
                </p>
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Student profile</label>
                <select
                  value={selectedProfileId}
                  onChange={(event) => setSelectedProfileId(event.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500"
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
                    <div className="rounded-2xl bg-emerald-600 p-3 text-white">
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
                        className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800"
                      >
                        {format}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {sessionState && (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-slate-700">Attached documents</p>
                  <div className="space-y-2">
                    {sessionState.documents.length > 0 ? (
                      sessionState.documents.map((document) => (
                        <div key={document.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-800 truncate">{document.name}</span>
                                {document.extractionStatus === 'ready' ? (
                                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    ✓ Ready
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-700">
                                    Processing...
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 text-xs text-slate-500">
                                {document.mimeType} • {Math.ceil(document.size / 1024)} KB
                              </div>
                              {document.extractedTextPreview && (
                                <div className="mt-2 rounded-lg bg-white border border-slate-200 p-2 text-xs text-slate-600 max-h-24 overflow-y-auto">
                                  <span className="font-medium">Preview:</span> {document.extractedTextPreview}...
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500 text-center">
                        No documents attached yet.
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                  {error}
                </div>
              )}
            </div>
          </Card>

          <Card
            className="rounded-[24px] border-0 bg-white"
            style={{ borderColor: '#e2e8f0', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.08)' }}
          >
            <div className="space-y-5">
              <div>
                <h2 className="text-xl font-semibold">Chat workspace</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Example flows: "Solve question 1 for me", "Create a quiz from this topic", or "Make a short learning video plan for this concept". The LangGraph workflow should stream the selected action and then execute that tool.
                </p>
              </div>

              <div className="min-h-[420px] space-y-3 rounded-[24px] bg-slate-50 p-4">
                {sessionState ? (
                  sessionState.messages.map((chatMessage) => (
                    <div
                      key={chatMessage.id}
                      className={`max-w-3xl rounded-2xl px-4 py-3 text-sm ${
                        chatMessage.role === 'user'
                          ? 'ml-auto bg-emerald-600 text-white'
                          : chatMessage.role === 'assistant'
                            ? 'bg-white text-slate-800'
                            : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-semibold uppercase tracking-wide opacity-70">
                        {chatMessage.role}
                      </div>
                      <div className="mt-1">
                        <MarkdownContent
                          content={chatMessage.content}
                          className={chatMessage.role === 'user' ? 'text-white' : 'text-slate-800'}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <div className="rounded-full bg-emerald-100 p-4 text-emerald-700">
                      <AutoAwesome fontSize="large" />
                    </div>
                    <h3 className="mt-5 text-2xl font-semibold">No workspace yet</h3>
                    <p className="mt-3 max-w-lg text-sm text-slate-500">
                      Choose a student profile, click Start workspace, then provide the current input. The agent should reason from prompt text alone unless a PDF/image requires parsing first.
                    </p>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <label className="block text-sm font-medium text-slate-700">Message to the agent</label>
                <div className="flex gap-3">
                  <div className="flex-1 space-y-3">
                    <textarea
                      value={message}
                      onChange={(event) => setMessage(event.target.value)}
                      rows={4}
                      className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 outline-none transition focus:border-emerald-500"
                      placeholder="Describe what you want: solve a problem, generate a quiz, or create a video plan."
                    />
                    {selectedFiles.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {selectedFiles.map((file) => (
                          <div
                            key={`${file.name}-${file.size}`}
                            className="group flex items-center gap-2 rounded-full bg-emerald-100 px-3 py-1.5 text-sm text-emerald-800"
                          >
                            <CloudUpload fontSize="small" />
                            <span className="max-w-[150px] truncate">{file.name}</span>
                            <button
                              type="button"
                              onClick={() => setSelectedFiles(selectedFiles.filter(f => f !== file))}
                              className="rounded-full p-0.5 text-emerald-600 opacity-60 transition hover:opacity-100"
                              title="Remove file"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        multiple
                        accept=".pdf,image/*,.txt,.md,.csv"
                        onChange={(event) => setSelectedFiles(Array.from(event.target.files || []))}
                        className="hidden"
                      />
                      <div className="flex h-14 w-14 items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 text-slate-600 transition hover:border-emerald-500 hover:bg-emerald-50 hover:text-emerald-600">
                        <CloudUpload fontSize="large" />
                      </div>
                    </label>
                    <Button
                      onClick={uploadDocuments}
                      disabled={!sessionState || selectedFiles.length === 0 || busy}
                      variant="outlined"
                      className="h-10 w-14 p-0"
                      title="Upload files"
                    >
                      ↑
                    </Button>
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!sessionState || !message.trim() || busy}
                    style={{
                      backgroundColor: '#0f766e',
                      color: '#fff',
                      paddingInline: 18,
                      fontWeight: 700
                    }}
                  >
                    {busy ? 'Working...' : 'Send →'}
                  </Button>
                </div>
                <p className="text-xs text-slate-500">
                  PDF/image files will be parsed first. Attach files using the button above, then click "Upload files" or send a message to trigger automatic upload.
                </p>
              </div>

              {sessionState?.latestExecution && (
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-semibold text-emerald-900">
                    Latest execution: {toolBadge[sessionState.latestExecution.tool].label}
                  </p>
                  <p className="mt-2 text-sm text-emerald-900/80">{sessionState.latestExecution.summary}</p>
                  <div className="mt-3 rounded-2xl bg-white p-4 text-sm text-slate-700">
                    <MarkdownContent content={sessionState.latestExecution.output} />
                  </div>
                  {sessionState.latestExecution.citations.length > 0 && (
                    <p className="mt-3 text-xs font-medium text-emerald-800">
                      Citations: {sessionState.latestExecution.citations.join(', ')}
                    </p>
                  )}
                </div>
              )}

              {sessionState?.tutoringProgress && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-sm font-semibold text-blue-900">
                    Guided progress: part {sessionState.tutoringProgress.currentPart}) step{' '}
                    {Math.min(sessionState.tutoringProgress.currentStepIndex + 1, sessionState.tutoringProgress.totalSteps)} /{' '}
                    {sessionState.tutoringProgress.totalSteps}
                  </p>
                  <p className="mt-2 text-sm text-blue-900/80">
                    {sessionState.tutoringProgress.nextActionHint}
                  </p>
                </div>
              )}
            </div>
          </Card>

          <div className="space-y-6">
            <Card
              className="rounded-[24px] border-0 bg-white"
              style={{ borderColor: '#e2e8f0', boxShadow: '0 24px 50px rgba(15, 23, 42, 0.08)' }}
            >
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold">Visible reasoning</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    This trace streams node updates, tool selection, and execution results from the LangGraph workflow.
                  </p>
                </div>

                {streamEvents.length > 0 && (
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <p className="text-sm font-semibold text-slate-800">Live workflow stream</p>
                    <div className="mt-3 space-y-2">
                      {streamEvents.map((event, index) => (
                        <div key={`${event.type}-${index}`} className="rounded-xl bg-slate-50 px-3 py-3 text-sm">
                          <div className="font-semibold text-slate-800">
                            {event.type}
                            {event.node ? ` • ${event.node}` : ''}
                          </div>
                          <div className="mt-1 text-slate-600">{event.message}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {sessionState?.latestDecision ? (
                  <>
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
                        {toolBadge[sessionState.latestDecision.selectedTool].icon}
                        {toolBadge[sessionState.latestDecision.selectedTool].label}
                      </div>
                      <p className="mt-3 text-sm text-slate-600">{sessionState.latestDecision.rationale}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800">
                          Source: {sessionState.latestDecision.source}
                        </span>
                        <span className="rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
                          Confidence: {Math.round(sessionState.latestDecision.confidence * 100)}%
                        </span>
                        <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800">
                          Status: {sessionState.latestDecision.executionStatus}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {sessionState.latestDecision.reasoningTrace.map((step) => (
                        <div key={step.title} className="rounded-2xl border border-slate-200 p-4">
                          <p className="text-sm font-semibold text-slate-800">{step.title}</p>
                          <p className="mt-2 text-sm text-slate-600">{step.detail}</p>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-800">Execution plan</p>
                      <div className="mt-3 space-y-2">
                        {sessionState.latestDecision.executionPlan.map((step) => (
                          <div key={step} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 p-4">
                      <p className="text-sm font-semibold text-slate-800">Signals used for routing</p>
                      <div className="mt-3 space-y-2">
                        {sessionState.latestDecision.consideredSignals.map((signal) => (
                          <div key={signal} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
                            {signal}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-50 px-4 py-6 text-sm text-slate-500">
                    Ask the agent a question to see the visible tool-selection trace.
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentToolChatLab;
