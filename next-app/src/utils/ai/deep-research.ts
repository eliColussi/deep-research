// /utils/ai/deep-research.ts

import { generateObject } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import { gpt4oModel, trimPrompt } from './providers';
import { systemPrompt } from './prompt';
import { OutputManager } from './output-manager';

/**
 * Track research progress for UI/terminal logging
 */
export interface ResearchProgress {
  currentDepth: number;
  totalDepth: number;
  currentBreadth: number;
  totalBreadth: number;
  totalQueries: number;
  completedQueries: number;
  currentQuery?: string;
}

/**
 * Final shape returned by deepResearch().
 */
interface ResearchResult {
  learnings: string[];
  visitedUrls: string[];
}

/**
 * Minimal interface for the data we transform from Serper’s JSON.
 */
interface SerperSearchResponse {
  data: {
    markdown: string;
    url: string;
  }[];
}

const output = new OutputManager();
function log(...args: any[]) {
  output.log(...args);
}

/**
 * A function that calls the Serper Google Search endpoint with official fields:
 * https://google.serper.dev/search
 * 
 * NOTE: We use `SERPER_API_KEY` from process.env.
 */
async function serperSearch(
  query: string,
  {
    gl = 'us',
    hl = 'en',
    autocorrect = true,
    time_range,
    num = 5,
  }: {
    gl?: string;
    hl?: string;
    autocorrect?: boolean;
    time_range?: string; // e.g. 'd', 'w', 'm', 'y'
    num?: number;
  } = {}
): Promise<SerperSearchResponse> {
  // 1) Grab from .env.local
  const serperApiKey = process.env.SERPER_API_KEY;
  if (!serperApiKey) {
    throw new Error('SERPER_API_KEY is not defined in your environment.');
  }

  // 2) Build the body object
  const requestBody: Record<string, any> = {
    q: query,
    gl,
    hl,
    autocorrect,
    num,
  };
  if (time_range) {
    requestBody.time_range = time_range;
  }

  log('Calling Serper API with:', requestBody);

  // 3) POST to the correct endpoint with the required header
  const response = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: {
      'X-API-KEY': serperApiKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(`Serper API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // 4) Transform the data into { data: { markdown, url }[] }
  return {
    data: (data.organicResults || []).map((item: any) => ({
      markdown: `${item.title}\n\n${item.snippet || ''}`,
      url: item.link,
    })),
  };
}

/**
 * Step A: Generate SERP queries using GPT
 */
async function generateSerpQueries({
  query,
  numQueries = 2,
  learnings,
}: {
  query: string;
  numQueries?: number;
  learnings?: string[];
}) {
  const res = await generateObject({
    model: gpt4oModel,
    system: systemPrompt(),
    prompt: trimPrompt(`
We have the user's wedding plan prompt:
<mainPrompt>${query}</mainPrompt>

Generate up to ${numQueries} SERP queries focusing on phone numbers, user reviews, star ratings, advanced details. 
If prior learnings exist, incorporate them:
${(learnings || []).join('\n')}
`),
    schema: z.object({
      queries: z.array(
        z.object({
          query: z.string(),
          researchGoal: z.string(),
        })
      ),
    }),
  });
  log(`Created ${res.object.queries.length} queries`, res.object.queries);
  return res.object.queries.slice(0, numQueries);
}

/**
 * Step B: Process each SERP result, extracting new learnings & follow-up questions
 */
async function processSerpResult({
  query,
  result,
  numLearnings = 3,
  numFollowUpQuestions = 2,
}: {
  query: string;
  result: SerperSearchResponse;
  numLearnings?: number;
  numFollowUpQuestions?: number;
}) {
  const contents = compact(result.data.map(item => item.markdown))
    .map(c => trimPrompt(c, 25_000));

  log(`Ran ${query}, found ${contents.length} contents`);

  const res = await generateObject({
    model: gpt4oModel,
    system: systemPrompt(),
    prompt: trimPrompt(`
Given these SERP contents for <${query}>, 
extract up to ${numLearnings} new learnings focusing on phone numbers, star ratings, user reviews, advanced wedding insights, 
and up to ${numFollowUpQuestions} follow-up questions:

<contents>
${contents.map(c => `<content>\n${c}\n</content>`).join('\n')}
</contents>
`),
    schema: z.object({
      learnings: z.array(z.string()),
      followUpQuestions: z.array(z.string()),
    }),
  });
  log(`Created ${res.object.learnings.length} learnings`, res.object.learnings);
  return res.object;
}

/**
 * Step C: Final report
 */
export async function writeFinalReport({
  prompt,
  learnings,
  visitedUrls,
}: {
  prompt: string;
  learnings: string[];
  visitedUrls: string[];
}) {
  const learningsString = trimPrompt(
    learnings.map(ln => `<learning>\n${ln}\n</learning>`).join('\n'),
    150_000
  );

  const res = await generateObject({
    model: gpt4oModel,
    system: systemPrompt(),
    prompt: trimPrompt(`
We have the user's prompt plus these combined learnings. 
Write a final wedding plan with phone numbers, user reviews, star ratings, hidden gems, advanced deals, etc.:

<prompt>${prompt}</prompt>

<allLearnings>
${learningsString}
</allLearnings>
`),
    schema: z.object({
      reportMarkdown: z.string(),
    }),
  });

  const urlsSection = `\n\n## Sources\n\n${visitedUrls
    .map(url => `- ${url}`)
    .join('\n')}`;
  return res.object.reportMarkdown + urlsSection;
}

/**
 * Step D: Orchestrate
 */
export async function deepResearch({
  query,
  breadth,
  depth,
  learnings = [],
  visitedUrls = [],
  onProgress,
}: {
  query: string;
  breadth: number;
  depth: number;
  learnings?: string[];
  visitedUrls?: string[];
  onProgress?: (progress: ResearchProgress) => void;
}): Promise<ResearchResult> {
  const progress: ResearchProgress = {
    currentDepth: depth,
    totalDepth: depth,
    currentBreadth: breadth,
    totalBreadth: breadth,
    totalQueries: 0,
    completedQueries: 0,
    currentQuery: undefined,
  };

  const reportProgress = (update: Partial<ResearchProgress>) => {
    Object.assign(progress, update);
    onProgress?.(progress);
  };

  // Step 1: Generate queries
  const serpQueries = await generateSerpQueries({
    query,
    learnings,
    numQueries: breadth,
  });
  reportProgress({
    totalQueries: serpQueries.length,
    currentQuery: serpQueries[0]?.query,
  });

  // Step 2: Concurrency limit
  const limit = pLimit(1);

  // Step 3: Process each query in parallel (with concurrency=1)
  const results = await Promise.all(
    serpQueries.map(serpQuery =>
      limit(async () => {
        try {
          // For each query, call Serper for real-time data
          const result = await serperSearch(serpQuery.query, {
            gl: 'us',
            hl: 'en',
            autocorrect: true,
            time_range: 'm', // e.g. 'd', 'w', 'm', 'y'
            num: 5,
          });

          const newUrls = compact(result.data.map(item => item.url));
          const newBreadth = Math.ceil(breadth / 2);
          const newDepth = depth - 1;

          const newLearnings = await processSerpResult({
            query: serpQuery.query,
            result,
          });
          const allLearnings = [...learnings, ...newLearnings.learnings];
          const allUrls = [...visitedUrls, ...newUrls];

          if (newDepth > 0) {
            log(
              `Researching deeper => breadth: ${newBreadth}, depth: ${newDepth}`
            );
            reportProgress({
              currentDepth: newDepth,
              currentBreadth: newBreadth,
              completedQueries: progress.completedQueries + 1,
              currentQuery: serpQuery.query,
            });

            const nextQuery = `
Previous research goal: ${serpQuery.researchGoal}
Follow-up directions:
${newLearnings.followUpQuestions.map(q => `- ${q}`).join('\n')}
`.trim();

            return deepResearch({
              query: nextQuery,
              breadth: newBreadth,
              depth: newDepth,
              learnings: allLearnings,
              visitedUrls: allUrls,
              onProgress,
            });
          } else {
            // Depth exhausted
            reportProgress({
              currentDepth: 0,
              completedQueries: progress.completedQueries + 1,
              currentQuery: serpQuery.query,
            });
            return {
              learnings: allLearnings,
              visitedUrls: allUrls,
            };
          }
        } catch (err: unknown) {
          if (err instanceof Error && err.message.includes('Timeout')) {
            log(`Timeout error running query: ${serpQuery.query}`, err);
          } else {
            log(`Error running query: ${serpQuery.query}`, err);
          }
          return { learnings: [], visitedUrls: [] };
        }
      })
    )
  );

  // Combine all results
  return {
    learnings: [...new Set(results.flatMap(r => r.learnings))],
    visitedUrls: [...new Set(results.flatMap(r => r.visitedUrls))],
  };
}
