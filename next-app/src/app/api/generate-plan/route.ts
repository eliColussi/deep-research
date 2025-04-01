// app/api/generate-plan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { generateWeddingPlan } from '@/utils/ai/perplexityClient';
import type { PlanFormData } from '@/types/plan';

// Helper function to clean markdown content and remove duplicates
function cleanMarkdownContent(markdown: string): string {
  if (!markdown) return '';
  
  // First, extract the main title
  const mainTitleMatch = markdown.match(/# [^\n]+/);
  const mainTitle = mainTitleMatch ? mainTitleMatch[0] : '# Wedding Plan';
  
  // Extract all section titles and their content
  const sections = new Map();
  const sectionMatches = Array.from(markdown.matchAll(/##\s+([^\n]+)([\s\S]*?)(?=##\s+|$)/g));
  
  for (const match of sectionMatches) {
    // Add null checks for match groups
    const title = match[1] ? match[1].trim() : '';
    const content = match[2] ? match[2].trim() : '';
    
    
    // Skip empty titles
    if (!title) continue;
    
    // Only keep the section with the most content if duplicates exist
    if (!sections.has(title) || content.length > sections.get(title).length) {
      sections.set(title, content);
    }
  }
  
  // Rebuild the content with unique sections
  let cleanedContent = mainTitle + '\n\n';
  
  // Add Key Findings Summary first if it exists
  if (sections.has('Key Findings Summary')) {
    cleanedContent += '## Key Findings Summary\n' + sections.get('Key Findings Summary') + '\n\n';
    sections.delete('Key Findings Summary');
  }
  
  // Add remaining sections in a logical order
  const sectionOrder = [
    'Venue Recommendations',
    'Vendor Recommendations',
    'Wedding Day Timeline',
    'Decor & Theme',
    'Budget Breakdown',
    'Additional Recommendations',
    'Conclusion'
  ];
  
  // First add sections in the preferred order
  for (const sectionTitle of sectionOrder) {
    if (sections.has(sectionTitle)) {
      cleanedContent += '## ' + sectionTitle + '\n' + sections.get(sectionTitle) + '\n\n';
      sections.delete(sectionTitle);
    }
  }
  
  // Then add any remaining sections
  for (const [title, sectionContent] of sections.entries()) {
    cleanedContent += '## ' + title + '\n' + sectionContent + '\n\n';
  }
  
  return cleanedContent.trim();
}

export async function POST(req: NextRequest) {
  try {
    // 1) Parse request body
    const body = (await req.json()) as PlanFormData;

    console.log('Generating wedding plan with Perplexity Sonar...');

    // 2) Generate the wedding plan using Perplexity's sonar-deep-research model
    const { plan, markdownPlan } = await generateWeddingPlan(body);

    console.log('Wedding plan generated successfully');
    
    // Clean up the markdown to remove duplicates
    const cleanedMarkdown = cleanMarkdownContent(markdownPlan);
    
    // 3) Return both the structured plan and the full markdown
    return NextResponse.json({
      plan,
      markdownPlan: cleanedMarkdown,
    });
  } catch (err: unknown) {
    console.error('Error generating plan:', err);
    // Safely handle unknown error
    let message = 'Failed to generate wedding plan';
    if (err instanceof Error) {
      message = err.message;
    }
    return new NextResponse(message, { status: 500 });
  }
}
