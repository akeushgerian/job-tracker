import { config } from '../../config/index.js';
import { fetchJobPosting } from '../../lib/job-fetch.js';
import { JobScoutUnconfiguredError } from '../../lib/errors.js';
import { chatCompletion, type ChatMessage } from '../assistant/assistant.llm.js';
import type { SettingsService } from '../settings/settings.service.js';
import type { ProfileRepository } from '../profile/profile.repository.js';
import type { JobResult, SearchResponse, FetchAndScoreResponse } from './job-scout.schemas.js';

// --- Serper /search response ---

interface SerperOrganicResult {
  title: string;
  link: string;
  snippet: string;
  date?: string;
}

interface SerperSearchResponse {
  organic?: SerperOrganicResult[];
  error?: string;
}

// --- LLM helpers ---

async function claudeChatCompletion(
  messages: ChatMessage[],
  apiKey: string,
  model: string,
): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, messages, temperature: 0.1, max_tokens: 512 }),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API returned ${response.status}: ${body.slice(0, 500)}`);
  }
  const data = (await response.json()) as { content?: { type: string; text?: string }[] };
  return data.content?.find((b) => b.type === 'text')?.text ?? '';
}

function stripJsonFences(raw: string): string {
  return raw.trim().replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim();
}

// --- Serper /search (free tier endpoint) ---

async function serperSearch(query: string, apiKey: string): Promise<SerperOrganicResult[]> {
  let response: Response;
  try {
    response = await fetch('https://google.serper.dev/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-KEY': apiKey },
      body: JSON.stringify({ q: query, gl: 'de', hl: 'de', num: 10 }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    console.warn(`[job-scout] network error for "${query}":`, err instanceof Error ? err.message : String(err));
    return [];
  }

  if (!response.ok) {
    const text = await response.text();
    console.warn(`[job-scout] Serper ${response.status} for "${query}": ${text.slice(0, 200)}`);
    return [];
  }

  const data = (await response.json()) as SerperSearchResponse;
  if (data.error) {
    console.warn(`[job-scout] Serper error for "${query}": ${data.error}`);
    return [];
  }

  const results = data.organic ?? [];
  console.log(`[job-scout] "${query}" → ${results.length} results`);
  return results;
}

// --- Bundesagentur für Arbeit public API (no key required) ---

interface BaArbeitsort {
  ort?: string;
  plz?: string;
  region?: string;
}

interface BaStellenangebot {
  refnr?: string;
  titel?: string;
  arbeitgeber?: string;
  arbeitsort?: BaArbeitsort;
  aktuelleVeroeffentlichungsdatum?: string;
  externeUrl?: string;
}

interface BaResponse {
  stellenangebote?: BaStellenangebot[];
  maxErgebnisse?: number;
}

async function baSearch(keywords: string, location: string): Promise<BaStellenangebot[]> {
  const params = new URLSearchParams({
    was: keywords,
    size: '25',
    angebotsart: '1', // 1 = jobs (not training/apprenticeships)
  });
  if (location) {
    params.set('wo', location);
    params.set('umkreis', '40'); // 40 km radius
  }

  let response: Response;
  try {
    response = await fetch(
      `https://rest.arbeitsagentur.de/jobboerse/jobsuche-service/pc/v4/jobs?${params.toString()}`,
      {
        headers: { 'X-API-Key': 'jobboerse-jobsuche-ui' },
        signal: AbortSignal.timeout(10_000),
      },
    );
  } catch (err) {
    console.warn('[job-scout] BA network error:', err instanceof Error ? err.message : String(err));
    return [];
  }

  if (!response.ok) {
    console.warn(`[job-scout] BA API returned ${response.status}`);
    return [];
  }

  const data = (await response.json()) as BaResponse;
  const jobs = data.stellenangebote ?? [];
  console.log(`[job-scout] BA "${keywords}" @ "${location}" → ${jobs.length} results (of ${data.maxErgebnisse ?? '?'} total)`);
  return jobs;
}

function mapBaResult(job: BaStellenangebot, idx: number): JobResult {
  const refnr = job.refnr ?? `ba-${idx}`;
  const location = [job.arbeitsort?.ort, job.arbeitsort?.region].filter(Boolean).join(', ');
  const url = job.externeUrl
    ?? `https://www.arbeitsagentur.de/jobsuche/jobdetail/${refnr}`;

  return {
    id: `ba-${refnr}`,
    title: job.titel ?? 'Unbekannte Stelle',
    company: job.arbeitgeber ?? '',
    location,
    salaryMin: null,
    salaryMax: null,
    snippet: '',
    url,
    created: job.aktuelleVeroeffentlichungsdatum ?? '',
    score: null,
    fitNote: null,
    gaps: [],
  };
}

// --- Parse a Google SERP result into a structured JobResult ---
// LinkedIn titles: "Frontend Developer bei Acme GmbH in Bielefeld | LinkedIn"
// Stepstone titles: "Frontend Entwickler (m/w/d) - Acme GmbH - Bielefeld | StepStone"
// General: "Frontend Developer (m/w/d) - Jobs bei Acme GmbH"

function parseSerperResult(result: SerperOrganicResult, idx: number): JobResult {
  // Strip trailing " | SiteName" suffixes
  let raw = result.title.replace(
    /\s*\|\s*(LinkedIn|StepStone|Indeed|Glassdoor|XING|Monster|Jobware|Karriere\.at|Jobscout24|Arbeitsagentur).*$/i,
    '',
  ).trim();

  let jobTitle = raw;
  let company = '';

  // "Title bei Company [in Location]" or "Title at Company"
  const beiMatch = raw.match(/^(.+?)\s+(?:bei|at)\s+(.+?)(?:\s+in\s+.+)?$/i);
  if (beiMatch) {
    jobTitle = (beiMatch[1] ?? '').trim();
    company = (beiMatch[2] ?? '').trim();
  } else {
    // "Title - Company - Location" or "Title - Company"
    const parts = raw.split(/\s*[-–]\s*/);
    if (parts.length >= 2) {
      jobTitle = (parts[0] ?? '').trim();
      // Second part might be company or location — use it if it doesn't look like a location
      const second = (parts[1] ?? '').trim();
      if (second && !/^\d{5}/.test(second)) company = second;
    }
  }

  // Clean up common trailing junk in company name
  company = company
    .replace(/,\s*(Deutschland|Germany|NRW|Bayern|Hamburg|Berlin|München|Bielefeld).*/i, '')
    .replace(/\s*\(m\/w\/d\)/i, '')
    .trim();

  // Derive domain as fallback company name
  if (!company) {
    try {
      company = new URL(result.link).hostname.replace(/^(www|de|jobs)\./, '');
    } catch {
      company = '';
    }
  }

  return {
    id: `s${idx}-${result.link}`.slice(0, 120),
    title: jobTitle || raw,
    company,
    location: '',
    salaryMin: null,
    salaryMax: null,
    snippet: result.snippet,
    url: result.link,
    created: result.date ?? '',
    score: null,
    fitNote: null,
    gaps: [],
  };
}

export class JobScoutService {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly profileRepo: ProfileRepository,
  ) {}

  private async llmChat(messages: ChatMessage[], userId: string): Promise<string> {
    let provider = 'local';
    let claudeApiKey: string | null = null;
    let claudeModel = 'claude-haiku-4-5-20251001';

    try {
      const aiRow = await this.settingsService.getAiSettings(userId);
      provider = aiRow?.provider ?? 'local';
      claudeModel = aiRow?.claudeModel ?? claudeModel;
      if (provider === 'claude') {
        claudeApiKey = await this.settingsService.getDecryptedApiKey(userId);
      }
    } catch {
      // DB might not have ai_settings yet — fall back to local
    }

    if (provider === 'claude' && claudeApiKey) {
      return claudeChatCompletion(messages, claudeApiKey, claudeModel);
    }
    return (await chatCompletion(messages, [])).content;
  }

  private async extractSearchParams(
    query: string,
    userId: string,
  ): Promise<{ keywords: string; location: string }> {
    const prompt = `Extract job search parameters. Return ONLY a JSON object, no markdown.

Query: "${query}"
Return: {"keywords":"role and tech skills","location":"city name only, empty string if not mentioned"}

Examples:
"frontend jobs bielefeld" → {"keywords":"frontend developer","location":"Bielefeld"}
"senior react engineer" → {"keywords":"senior react engineer","location":""}
"fullstack node bielefeld" → {"keywords":"fullstack node.js developer","location":"Bielefeld"}`;

    try {
      const content = await this.llmChat([{ role: 'user', content: prompt }], userId);
      const parsed = JSON.parse(stripJsonFences(content)) as { keywords?: string; location?: string };
      return {
        keywords: parsed.keywords?.trim() || query,
        location: parsed.location?.trim() || '',
      };
    } catch {
      return { keywords: query, location: '' };
    }
  }

  // Build 4 parallel search queries exactly like Claude does in the terminal.
  // Uses Serper /search (free tier) — 2 site-specific + 2 general, all with location embedded.
  private buildQueries(keywords: string, location: string, skills: string[]): string[] {
    const loc = location || 'Deutschland';
    const skillHint = skills.slice(0, 2).join(' ');
    const withSkills = skillHint ? `${keywords} ${skillHint}` : keywords;

    const queries = [
      `${keywords} ${loc} site:linkedin.com/jobs`,
      `${keywords} ${loc} site:stepstone.de`,
      `${withSkills} ${loc} Stellenangebot 2026`,
      `${keywords} ${loc} job Stelle`,
    ];

    console.log('[job-scout] Queries:', queries);
    return queries;
  }

  private async batchScore(
    results: JobResult[],
    profileContext: string,
    userId: string,
  ): Promise<Map<string, { score: number; fitNote: string; gaps: string[] }>> {
    const compact = results.map((r) => ({
      id: r.id,
      title: r.title,
      company: r.company,
      snippet: r.snippet.slice(0, 200),
    }));

    const prompt = `Score each job listing for this candidate (0-100). Return ONLY a JSON array, no markdown.

CANDIDATE PROFILE:
${profileContext}

JOB LISTINGS:
${JSON.stringify(compact)}

Return: [{"id":"...","score":85,"fitNote":"one sentence","gaps":["gap1"]}]

Scoring: 80-100=strong, 60-79=decent, 40-59=partial, 0-39=poor.
Penalise agency roles if candidate prefers product companies.
gaps: up to 3 items, empty array if none.`;

    const scoreMap = new Map<string, { score: number; fitNote: string; gaps: string[] }>();
    try {
      const content = await this.llmChat([{ role: 'user', content: prompt }], userId);
      const parsed = JSON.parse(stripJsonFences(content)) as Array<{
        id?: string;
        score?: number;
        fitNote?: string;
        gaps?: string[];
      }>;
      for (const item of parsed) {
        if (item.id) {
          scoreMap.set(item.id, {
            score: typeof item.score === 'number' ? Math.min(100, Math.max(0, item.score)) : 50,
            fitNote: item.fitNote ?? '',
            gaps: Array.isArray(item.gaps) ? item.gaps.slice(0, 3) : [],
          });
        }
      }
      console.log(`[job-scout] Scored ${scoreMap.size}/${results.length} results`);
    } catch (err) {
      console.warn('[job-scout] Batch scoring failed:', err instanceof Error ? err.message : String(err));
    }
    return scoreMap;
  }

  async search(userId: string, query: string): Promise<SearchResponse> {
    console.log(`[job-scout] Search: "${query}"`);

    const profile = await this.profileRepo.findByUserId(userId);
    const { keywords, location } = await this.extractSearchParams(query, userId);
    const resolvedLocation = location || profile?.location || '';

    console.log(`[job-scout] keywords="${keywords}" location="${resolvedLocation}"`);

    // --- Fire all sources in parallel ---
    const serperKey = config.SERPER_API_KEY;
    const serperQueries = serperKey
      ? this.buildQueries(keywords, resolvedLocation, profile?.skills ?? [])
      : [];

    const [serperRaw, baRaw] = await Promise.all([
      Promise.allSettled(serperQueries.map((q) => serperSearch(q, serperKey!))).then(
        (rs) => rs.flatMap((r) => (r.status === 'fulfilled' ? r.value : [])),
      ),
      baSearch(keywords, resolvedLocation),
    ]);

    console.log(`[job-scout] Serper raw: ${serperRaw.length} | BA raw: ${baRaw.length}`);

    // Deduplicate: BA results keyed by URL, Serper results also by URL.
    // BA wins on duplicates (it has proper structured company/location data).
    const seen = new Map<string, JobResult>();

    baRaw.forEach((job, idx) => {
      const mapped = mapBaResult(job, idx);
      if (mapped.url) seen.set(mapped.url, mapped);
    });

    serperRaw.forEach((r, idx) => {
      if (!r.link || seen.has(r.link)) return;
      seen.set(r.link, parseSerperResult(r, idx));
    });

    const results = Array.from(seen.values());
    console.log(`[job-scout] After dedup: ${results.length} unique results`);

    if (results.length === 0) {
      return { results: [], message: 'No jobs found — try a different search.' };
    }

    if (!profile) {
      return { results, scoringSkipped: { reason: 'no_profile' } };
    }

    const profileContext = [
      profile.targetRole && `Target role: ${profile.targetRole}`,
      profile.seniority && `Seniority: ${profile.seniority}`,
      profile.location && `Location: ${profile.location}`,
      profile.remotePref && `Remote preference: ${profile.remotePref}`,
      profile.skills.length > 0 && `Skills: ${profile.skills.join(', ')}`,
      profile.headline && `Headline: ${profile.headline}`,
      profile.summary && `Summary: ${profile.summary.slice(0, 400)}`,
      'Preference: product companies over agencies. Wants architectural ownership.',
    ]
      .filter(Boolean)
      .join('\n');

    let scoreMap: Map<string, { score: number; fitNote: string; gaps: string[] }>;
    let scoringSkipped: SearchResponse['scoringSkipped'] | undefined;

    try {
      scoreMap = await this.batchScore(results, profileContext, userId);
      if (scoreMap.size === 0) scoringSkipped = { reason: 'llm_error' };
    } catch {
      scoreMap = new Map();
      scoringSkipped = { reason: 'llm_error' };
    }

    const scored = results.map((r) => {
      const s = scoreMap.get(r.id);
      return s ? { ...r, score: s.score, fitNote: s.fitNote, gaps: s.gaps } : r;
    });

    scored.sort((a, b) => (b.score ?? -1) - (a.score ?? -1));
    return { results: scored, scoringSkipped };
  }

  async fetchAndScore(userId: string, jobUrl: string): Promise<FetchAndScoreResponse> {
    const text = await fetchJobPosting(jobUrl);
    const profile = await this.profileRepo.findByUserId(userId);
    if (!profile) return { score: null, fitNote: null, gaps: [] };

    const profileContext = [
      profile.targetRole && `Target role: ${profile.targetRole}`,
      profile.seniority && `Seniority: ${profile.seniority}`,
      profile.skills.length > 0 && `Skills: ${profile.skills.join(', ')}`,
      profile.summary && `Summary: ${profile.summary.slice(0, 400)}`,
      'Preference: product companies over agencies.',
    ]
      .filter(Boolean)
      .join('\n');

    const prompt = `Score this job posting (0-100). Return ONLY a JSON object, no markdown.

CANDIDATE PROFILE:
${profileContext}

JOB POSTING:
${text.slice(0, 3000)}

Return: {"score":85,"fitNote":"one sentence","gaps":["gap1"]}`;

    try {
      const content = await this.llmChat([{ role: 'user', content: prompt }], userId);
      const parsed = JSON.parse(stripJsonFences(content)) as {
        score?: number;
        fitNote?: string;
        gaps?: string[];
      };
      return {
        score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : null,
        fitNote: parsed.fitNote ?? null,
        gaps: Array.isArray(parsed.gaps) ? parsed.gaps.slice(0, 3) : [],
      };
    } catch {
      return { score: null, fitNote: null, gaps: [] };
    }
  }
}
