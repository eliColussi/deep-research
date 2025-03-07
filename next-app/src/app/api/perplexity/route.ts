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
        temperature: 0.1, // Lower temperature for more factual responses
        max_tokens: 4000, // Allow for detailed responses
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Perplexity API returned status: ${response.status}, ${errorText}`);
    }

    // 3. Convert the response to JSON
    const data = await response.json();

    // 4. Return the data as NextResponse
    return NextResponse.json(data, { status: 200 });
  } catch (err: any) {
    console.error('Error calling Perplexity API:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
