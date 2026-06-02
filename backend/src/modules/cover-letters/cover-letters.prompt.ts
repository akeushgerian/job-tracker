import type { ChatMessage } from '../assistant/assistant.llm.js';
import type { ProfileDto } from '../profile/profile.schemas.js';

function profileBlock(profile: ProfileDto): string {
  const lines: string[] = [];
  if (profile.headline) lines.push(`Headline: ${profile.headline}`);
  if (profile.targetRole) lines.push(`Target role: ${profile.targetRole}`);
  if (profile.branch) lines.push(`Branch / industry: ${profile.branch}`);
  if (profile.seniority) lines.push(`Seniority: ${profile.seniority}`);
  if (profile.location) lines.push(`Location: ${profile.location}`);
  if (profile.remotePref) lines.push(`Remote preference: ${profile.remotePref}`);
  if (profile.skills.length > 0) lines.push(`Key skills: ${profile.skills.join(', ')}`);
  const links = Object.entries(profile.links)
    .filter(([, v]) => Boolean(v))
    .map(([k, v]) => `${k}: ${v}`);
  if (links.length > 0) lines.push(`Links: ${links.join(' | ')}`);
  if (profile.summary) lines.push(`\nAbout / CV summary:\n${profile.summary}`);
  return lines.join('\n') || '(the user provided no profile details)';
}

const SYSTEM_RULES = [
  'You are a cover-letter writer inside Laufbahn, a personal job-application tracker.',
  'Write a cover letter for the user applying to the job below.',
  'Ground every claim strictly in the user profile and the job posting — never invent employers, dates, degrees, or achievements that are not present.',
  'When a reference letter is provided, closely match its structure, tone, paragraphing, and approximate length. When none is provided, write a clean, professional, modern cover letter.',
  'Write in the language of the job posting.',
  'Output only the cover letter body text — no preamble, no explanations, no markdown code fences, no placeholders like "[Your Name]" unless the information is genuinely unavailable.',
].join('\n');

export function buildCoverLetterMessages(input: {
  profile: ProfileDto;
  jobText: string;
  jobTitle?: string | null;
  jobCompany?: string | null;
  referenceText?: string | null;
  tone?: string | null;
}): ChatMessage[] {
  const parts: string[] = [];
  parts.push('=== USER PROFILE ===\n' + profileBlock(input.profile));

  const header = [
    input.jobTitle ? `Title: ${input.jobTitle}` : null,
    input.jobCompany ? `Company: ${input.jobCompany}` : null,
  ]
    .filter(Boolean)
    .join('\n');
  parts.push(
    '\n=== JOB POSTING ===\n' + (header ? header + '\n\n' : '') + input.jobText,
  );

  if (input.referenceText) {
    parts.push(
      '\n=== FORMAT REFERENCE (match this style and structure) ===\n' +
        input.referenceText,
    );
  }
  if (input.tone) {
    parts.push(`\n=== TONE ===\n${input.tone}`);
  }

  parts.push('\nWrite the cover letter now.');

  return [
    { role: 'system', content: SYSTEM_RULES },
    { role: 'user', content: parts.join('\n') },
  ];
}
