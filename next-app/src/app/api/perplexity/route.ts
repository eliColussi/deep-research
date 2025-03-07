// file: app/api/perplexity/route.ts (Next.js 13 style)
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    // 1. Parse the request body
    const { messages, userId } = await req.json();

    // 2. Construct the Perplexity API call using sonar-deep-research model
    // According to https://docs.perplexity.ai/api-reference/chat-completions
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'sonar-deep-research',
        messages,
        temperature: 0.2, // Slightly higher temperature for more creative responses
        max_tokens: 8000, // Increased token limit for more comprehensive responses
        top_p: 0.9, // Focus on more likely tokens while allowing some diversity
        presence_penalty: 0.1, // Slight penalty to reduce repetition
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API returned status: ${response.status}, ${errorText}`);
    }

    // 3. Convert the response to JSON
    const data = await response.json();

    // 4. Clean up and enhance the response
    if (data.choices && data.choices[0] && data.choices[0].message) {
      // Remove any content between <think> and </think> tags
      let content = data.choices[0].message.content;
      content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
      
      // Fix common formatting issues
      content = content
        // Remove duplicate headers
        .replace(/(?:# [^\n]+\n+){2,}/g, (match: string) => match.split('\n')[0] + '\n\n')
        // Remove repeated section titles
        .replace(/(?:## [^\n]+\n+){2,}/g, (match: string) => match.split('\n')[0] + '\n\n')
        // Ensure proper spacing for headers
        .replace(/\n(#{1,3})\s/g, '\n\n$1 ')
        // Replace 3+ consecutive newlines with just 2
        .replace(/\n{3,}/g, '\n\n')
        // Ensure proper spacing for bullet points
        .replace(/\n-\s/g, '\n- ')
        // Trim whitespace
        .trim();
      
      // Ensure the content starts with a proper title if it doesn't already
      if (!content.startsWith('# ')) {
        const titleMatch = content.match(/^[^\n]+/);
        if (titleMatch) {
          const title = titleMatch[0].replace(/^#+\s*/, '');
          content = `# ${title}\n\n${content.replace(titleMatch[0], '')}`;
        }
      }
      
      data.choices[0].message.content = content;
    }

    // 5. Return the cleaned data as NextResponse
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error('Error calling Perplexity API:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
