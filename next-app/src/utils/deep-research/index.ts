import FirecrawlApp, { SearchResponse } from '@mendable/firecrawl-js';
import { generateObject } from 'ai';
import { compact } from 'lodash-es';
import pLimit from 'p-limit';
import { z } from 'zod';

import { o3MiniModel, trimPrompt } from './providers';
import { systemPrompt } from './prompt';
import { OutputManager } from './output-manager';

// Initialize output manager for coordinated console/progress output
const output = new OutputManager();

// Replace console.log with output.log
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

// increase this if you have higher API rate limits
const ConcurrencyLimit = 2;

// Initialize Firecrawl with optional API key and optional base url
const firecrawl = new FirecrawlApp({
  apiKey: process.env.FIRECRAWL_KEY ?? '',
  apiUrl: process.env.FIRECRAWL_BASE_URL,
});

// take en user query, return a list of SERP queries
async function generateSerpQueries({
  query,
  numQueries = 3,
  learnings,
}: {
  query: string;
  numQueries?: number;
  learnings?: string[];
}) {
  const res = await generateObject({
    model: o3MiniModel,
    system: systemPrompt(),
    prompt: `Given the following prompt from the user, generate a list of SERP queries to research the topic. Return a maximum of ${numQueries} queries, but feel free to return less if the original prompt is clear. Make sure each query is unique and not similar to each other: <prompt>${query}</prompt>\n\n${
      learnings
        ? `Here are some learnings from previous research, use them to generate more specific queries: ${learnings.join(
            '\n',
          )}`
        : ''
    }`,
    schema: z.object({
      queries: z
        .array(
          z.object({
            query: z.string().describe('The SERP query'),
            researchGoal: z
              .string()
              .describe(
                'First talk about the goal of the research that this query is meant to accomplish, then go deeper into how to advance the research once the results are found, mention additional research directions. Be as specific as possible, especially for additional research directions.',
              ),
          }),
        )
        .describe(`List of SERP queries, max of ${numQueries}`),
    }),
  });

  return res.object.queries.slice(0, numQueries);
}

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
  const limit = pLimit(ConcurrencyLimit);
  let currentDepth = 1;
  let completedQueries = 0;
  let totalQueries = 0;

  async function research(
    currentQuery: string,
    currentDepth: number,
    maxDepth: number,
  ): Promise<ResearchResult> {
    if (currentDepth > maxDepth) {
      return { learnings: [], visitedUrls: [] };
    }

    try {
      // Search for results
      const result = await firecrawl.search(currentQuery);
      
      // Process results
      const { learnings: newLearnings, visitedUrls: newUrls } = await processSerpResult({
        query: currentQuery,
        result,
        numLearnings: 3,
        numFollowUpQuestions: 3,
      });

      // Update progress
      completedQueries++;
      onProgress?.({
        currentDepth,
        totalDepth: depth,
        currentBreadth: completedQueries,
        totalBreadth: totalQueries,
        currentQuery,
        totalQueries,
        completedQueries,
      });

      // Generate follow-up queries based on learnings
      const followUpQueries = await generateSerpQueries({
        query: currentQuery,
        numQueries: breadth,
        learnings: newLearnings,
      });

      totalQueries += followUpQueries.length;

      // Recursively research follow-up queries
      const followUpResults = await Promise.all(
        followUpQueries.map((q) =>
          limit(() => research(q.query, currentDepth + 1, maxDepth)),
        ),
      );

      // Combine all results
      return {
        learnings: [...newLearnings, ...followUpResults.flatMap((r) => r.learnings)],
        visitedUrls: [...newUrls, ...followUpResults.flatMap((r) => r.visitedUrls)],
      };
    } catch (error) {
      console.error('Error in research:', error);
      return { learnings: [], visitedUrls: [] };
    }
  }

  // Start research with initial query
  const queries = await generateSerpQueries({ query, numQueries: breadth });
  totalQueries = queries.length;

  const results = await Promise.all(
    queries.map((q) => limit(() => research(q.query, currentDepth, depth))),
  );

  // Combine all results
  return {
    learnings: [...learnings, ...results.flatMap((r) => r.learnings)],
    visitedUrls: [...visitedUrls, ...results.flatMap((r) => r.visitedUrls)],
  };
}
