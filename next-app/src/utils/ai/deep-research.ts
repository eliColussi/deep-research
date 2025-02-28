// deep-research.ts

import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { generateObject } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import { gpt4oModel, trimPrompt } from './providers';
import { systemPrompt } from './prompt';
import { OutputManager } from './output-manager';

const output = new OutputManager();
function log(...args: any[]) {
  output.log(...args);
}

export type ResearchProgress = {
  currentDepth: number;
  totalDepth: number;
  currentBreadth: number;
  totalBreadth: number;
  currentQuery?: string;
  totalQueries: number;
  completedQueries: number;
};

type ResearchResult = {
  learnings: string[];
  visitedUrls: string[];
};

// Lower concurrency to 1 => we run only one query at a time
// to help ensure we don't exceed 10 requests/min
const ConcurrencyLimit = 1;

const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

// Step A: Generate SERP queries
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
        }),
      ),
    }),
  });
  log(`Created ${res.object.queries.length} queries`, res.object.queries);
  return res.object.queries.slice(0, numQueries);
}

// Step B: Process each SERP result
async function processSerpResult({
  query,
  result,
  numLearnings = 3,
  numFollowUpQuestions = 2,
}: {
  query: string;
  result: SearchResponse;
  numLearnings?: number;
  numFollowUpQuestions?: number;
}) {
  const contents = compact(result.data.map(item => item.markdown)).map(c =>
    trimPrompt(c, 25_000),
  );
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

// Step C: Final report
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
    150_000,
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

  const urlsSection = `\n\n## Sources\n\n${visitedUrls.map(url => `- ${url}`).join('\n')}`;
  return res.object.reportMarkdown + urlsSection;
}

// Step D: Orchestrate
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
  };

  const reportProgress = (update: Partial<ResearchProgress>) => {
    Object.assign(progress, update);
    onProgress?.(progress);
  };

  const serpQueries = await generateSerpQueries({
    query,
    learnings,
    numQueries: breadth,
  });
  reportProgress({
    totalQueries: serpQueries.length,
    currentQuery: serpQueries[0]?.query,
  });

  const limit = pLimit(ConcurrencyLimit);

  const results = await Promise.all(
    serpQueries.map(serpQuery =>
      limit(async () => {
        try {
          const result = await firecrawl.search(serpQuery.query, {
            timeout: 30000,
            limit: 5,
            scrapeOptions: { formats: ['markdown'] },
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
            log(`Researching deeper => breadth: ${newBreadth}, depth: ${newDepth}`);
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
            // done
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
        } catch (err: any) {
          if (err.message?.includes('Timeout')) {
            log(`Timeout error running query: ${serpQuery.query}`, err);
          } else {
            log(`Error running query: ${serpQuery.query}`, err);
          }
          return { learnings: [], visitedUrls: [] };
        }
      }),
    ),
  );

  return {
    learnings: [...new Set(results.flatMap(r => r.learnings))],
    visitedUrls: [...new Set(results.flatMap(r => r.visitedUrls))],
  };
}
