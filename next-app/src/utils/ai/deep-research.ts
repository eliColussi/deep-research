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
  // Log the raw response to debug
  console.log('Serper API raw response:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
  
  // Extract organic results
  const organicResults = data.organicResults || [];
  console.log(`Found ${organicResults.length} organic results`);
  
  if (organicResults.length === 0) {
    console.warn('No organic results found in Serper response');
  }
  
  // Create more detailed markdown from each result
  return {
    data: organicResults.map((item: any) => ({
      markdown: `# ${item.title || 'No Title'}

URL: ${item.link || 'No Link'}

${item.snippet || 'No Snippet'}

${item.position ? `Position: ${item.position}` : ''}
${item.rating ? `Rating: ${item.rating}` : ''}
${item.reviews ? `Reviews: ${item.reviews}` : ''}
${item.phoneNumber ? `Phone: ${item.phoneNumber}` : ''}
${item.address ? `Address: ${item.address}` : ''}
`,
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
  
  // If no contents were found, create a default learning to avoid empty results
  if (contents.length === 0) {
    console.warn('No contents found for query:', query);
    return {
      learnings: [`No specific information found for "${query}". Consider trying a different search term.`],
      followUpQuestions: [
        `What are the most popular wedding venues in Greece?`,
        `What is the average cost of a wedding in Greece?`
      ]
    };
  }

  // Log the first content to debug
  if (contents.length > 0) {
    console.log('First content sample:', contents[0].substring(0, 200) + '...');
  } else {
    console.log('No content found to sample');
  }

  const res = await generateObject({
    model: gpt4oModel,
    system: systemPrompt(),
    prompt: trimPrompt(`
You are extracting specific, detailed wedding information from search results.

Given these search results for "${query}", extract EXACTLY ${numLearnings} specific learnings.
Focus on extracting concrete details like:
- Exact phone numbers
- Specific star ratings (e.g., "4.8/5 stars based on 120 reviews")
- Direct quotes from user reviews
- Pricing information with exact numbers
- Venue capacity details
- Vendor contact information

Do NOT make up information. If you can't find enough specific details, say "Limited information available".

Also generate ${numFollowUpQuestions} follow-up questions that would help gather more specific details:

<search_results>
${contents.map(c => `<result>\n${c}\n</result>`).join('\n')}
</search_results>
`),
    schema: z.object({
      learnings: z.array(z.string()),
      followUpQuestions: z.array(z.string()),
    }),
  });
  
  // Ensure we always have at least one learning
  const learnings = res.object.learnings.length > 0 
    ? res.object.learnings 
    : [`Limited specific information found for "${query}". Will try different search terms.`];
    
  log(`Created ${learnings.length} learnings`, learnings);
  return {
    learnings,
    followUpQuestions: res.object.followUpQuestions
  };
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
  console.log(`Writing final report with ${learnings.length} learnings and ${visitedUrls.length} sources`);
  
  // Log a sample of learnings for debugging
  if (learnings.length > 0) {
    console.log('Sample learnings for final report:', learnings.slice(0, 3));
  }
  
  const learningsString = trimPrompt(
    learnings.map(ln => `<learning>\n${ln}\n</learning>`).join('\n'),
    150_000
  );

  // Parse the prompt to extract key preferences
  const preferences = extractPreferencesFromPrompt(prompt);
  console.log('Extracted preferences:', preferences);

  const res = await generateObject({
    model: gpt4oModel,
    system: systemPrompt(),
    prompt: trimPrompt(`
You are creating a DETAILED and STRUCTURED wedding plan based on the user's preferences and our research findings.

User preferences:
${prompt}

Based on these preferences and our research findings below, create a comprehensive wedding plan with the following sections:

1. Venue Recommendations (with phone numbers, ratings, and reviews)
2. Budget Breakdown (detailed cost estimates)
3. Timeline (schedule for the wedding day)
4. Recommended Vendors (with contact info and ratings)
5. Decor & Theme (specific ideas matching their style)
6. Additional Recommendations (any other helpful suggestions)

For each section, include SPECIFIC details like:
- Exact venue names with phone numbers
- Specific vendor recommendations with contact information
- Actual price ranges from real venues/vendors
- Direct quotes from reviews when available
- Star ratings when available

Make this plan EXTREMELY PRACTICAL and ACTIONABLE. Include ALL relevant contact information, prices, and specific details.

<research_findings>
${learningsString}
</research_findings>
`),
    schema: z.object({
      reportMarkdown: z.string(),
    }),
  });

  // Add sources at the end
  const urlsSection = `\n\n## Sources\n\n${visitedUrls
    .filter(url => url && url.trim().length > 0)
    .map(url => `- ${url}`)
    .join('\n')}`;
    
  const finalReport = res.object.reportMarkdown + urlsSection;
  console.log('Final report generated successfully');
  
  return finalReport;
}

// Helper function to extract key preferences from the prompt
function extractPreferencesFromPrompt(prompt: string): Record<string, string> {
  const preferences: Record<string, string> = {};
  
  // Extract budget
  const budgetMatch = prompt.match(/budget[:\s]*(\$?[\d,]+\s*-\s*\$?[\d,]+|\$?[\d,]+)/i);
  if (budgetMatch && budgetMatch[1]) {
    preferences.budget = budgetMatch[1];
  }
  
  // Extract guest count
  const guestMatch = prompt.match(/guest[s\s]*count[:\s]*(\d+)/i) || 
                    prompt.match(/guests[:\s]*(\d+)/i);
  if (guestMatch && guestMatch[1]) {
    preferences.guestCount = guestMatch[1];
  }
  
  // Extract location
  const locationMatch = prompt.match(/location[:\s]*([^\n,\.]+)/i);
  if (locationMatch && locationMatch[1]) {
    preferences.location = locationMatch[1].trim();
  }
  
  // Extract style/theme
  const styleMatch = prompt.match(/style[:\s]*([^\n,\.]+)/i) || 
                   prompt.match(/theme[:\s]*([^\n,\.]+)/i);
  if (styleMatch && styleMatch[1]) {
    preferences.style = styleMatch[1].trim();
  }
  
  return preferences;
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
  console.log('Starting deep research with:', { query, breadth, depth, existingLearnings: learnings.length });
  
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

  // Step 1: Generate queries - ensure we get at least one query
  let serpQueries = await generateSerpQueries({
    query,
    learnings,
    numQueries: breadth,
  });
  
  // If no queries were generated, create a default one
  if (serpQueries.length === 0) {
    console.warn('No queries generated, using default query');
    serpQueries = [{
      query: `wedding venues in Greece oceanfront reviews`,
      researchGoal: 'Find top-rated wedding venues in Greece with ocean views'
    }];
  }
  
  console.log('Generated queries:', serpQueries);
  
  reportProgress({
    totalQueries: serpQueries.length,
    currentQuery: serpQueries[0]?.query,
  });

  // Step 2: Concurrency limit
  const limit = pLimit(1);

  // Step 3: Process each query in parallel (with concurrency=1)
  const results = await Promise.all(
    serpQueries.map((serpQuery, index) =>
      limit(async () => {
        try {
          console.log(`Processing query ${index + 1}/${serpQueries.length}: ${serpQuery.query}`);
          reportProgress({
            currentQuery: serpQuery.query,
          });
          
          // For each query, call Serper for real-time data
          const result = await serperSearch(serpQuery.query, {
            gl: 'us',
            hl: 'en',
            autocorrect: true,
            time_range: 'm', // e.g. 'd', 'w', 'm', 'y'
            num: 10, // Increase number of results
          });

          const newUrls = compact(result.data.map(item => item.url));
          console.log(`Found ${newUrls.length} URLs for query: ${serpQuery.query}`);
          
          const newBreadth = Math.max(1, Math.ceil(breadth / 2));
          const newDepth = depth - 1;

          // Process search results to extract learnings
          const newLearningsResult = await processSerpResult({
            query: serpQuery.query,
            result,
            numLearnings: 5, // Increase number of learnings
            numFollowUpQuestions: 3, // Increase number of follow-up questions
          });
          
          console.log(`Extracted ${newLearningsResult.learnings.length} learnings for query: ${serpQuery.query}`);
          console.log('Sample learnings:', newLearningsResult.learnings.slice(0, 2));
          
          const allLearnings = [...learnings, ...newLearningsResult.learnings];
          const allUrls = [...visitedUrls, ...newUrls];

          // Only go deeper if we have meaningful results and depth remaining
          if (newDepth > 0 && newLearningsResult.learnings.length > 0) {
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
${newLearningsResult.followUpQuestions.map(q => `- ${q}`).join('\n')}
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
            // Depth exhausted or no meaningful results
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
            console.error('Error details:', err);
          }
          // Return existing learnings instead of empty array to preserve progress
          return { learnings, visitedUrls };
        }
      })
    )
  );

  // Combine all results
  const combinedLearnings = [...new Set(results.flatMap(r => r.learnings))];
  const combinedUrls = [...new Set(results.flatMap(r => r.visitedUrls))];
  
  console.log(`Deep research complete. Found ${combinedLearnings.length} learnings and ${combinedUrls.length} sources`);
  
  // If we have no learnings after all that, add a default learning
  if (combinedLearnings.length === 0) {
    console.warn('No learnings found after deep research, adding default learning');
    combinedLearnings.push('Limited specific information found. Consider refining your search criteria or exploring more general wedding planning resources for Greece.');
  }
  
  return {
    learnings: combinedLearnings,
    visitedUrls: combinedUrls,
  };
}
