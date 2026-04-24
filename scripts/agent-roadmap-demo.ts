import 'dotenv/config';

const agentServiceUrl = process.env.AGENT_SERVICE_URL || 'http://localhost:8001';

async function main() {
  const profilesResponse = await fetch(`${agentServiceUrl}/profiles`);
  const profilesPayload = await profilesResponse.json();

  if (!profilesResponse.ok || !profilesPayload.success) {
    throw new Error(profilesPayload.error || 'Failed to load profiles from Python agent service');
  }

  const profiles = profilesPayload.data;
  const studentId = process.argv[2] || profiles[0]?.id;
  const prompt = process.argv.slice(3).join(' ') || 'Sinh vien can roadmap hoc tap cho bai toan kho.';

  const roadmapResponse = await fetch(`${agentServiceUrl}/roadmap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ studentId, prompt })
  });
  const roadmapPayload = await roadmapResponse.json();

  if (!roadmapResponse.ok || !roadmapPayload.success) {
    throw new Error(roadmapPayload.error || roadmapPayload.detail || 'Failed to generate roadmap');
  }

  const result = roadmapPayload.data;

  console.log(`\nAI Agent demo for ${result.student.name} (${result.student.major})`);
  console.log(`Source: ${result.source}`);
  console.log(
    `Preferred study window: ${result.analysis.recommendedWindow.start}-${result.analysis.recommendedWindow.end}`
  );
  console.log(`Average session: ${result.analysis.averageSessionMinutes} minutes`);
  console.log('\nTool sequence:');

  for (const tool of result.toolInvocations) {
    console.log(`- ${tool.tool}: ${tool.purpose}`);
  }

  console.log('\nRoadmap:');

  for (const day of result.roadmap) {
    console.log(`\n${day.day} - ${day.theme}`);
    for (const block of day.blocks) {
      console.log(
        `  ${block.startTime}-${block.endTime} | ${block.title} | ${block.instructions}`
      );
    }
  }

  console.log('\nCoaching notes:');
  for (const note of result.coachingNotes) {
    console.log(`- ${note}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
