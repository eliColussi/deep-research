import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import Stripe from 'stripe';
import { supabase } from '@/app/lib/supabaseClient';

// Ensure these environment variables are available
if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY in environment variables.');
}
if (!process.env.STRIPE_WEBHOOK_SECRET) {
  throw new Error('Missing STRIPE_WEBHOOK_SECRET in environment variables.');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
});
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Stripe Webhook Handler (POST /api/stripe/webhook)
 * 
 * Next.js 13 route that verifies the Stripe signature, then updates
 * the user_profiles table in Supabase based on subscription events.
 */
export async function POST(req: Request) {
  // 1. Read the raw request body for Stripe signature verification
  const rawBody = await req.text();

  // 2. Retrieve the signature from the request headers
  const stripeHeaders = headers();
  const signature = stripeHeaders.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 });
  }

  let event: Stripe.Event;

  // 3. Verify the event with Stripe
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: any) {
    console.error(`❌ Error verifying Stripe webhook signature: ${err.message}`);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // 4. Handle the event
  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        // User just completed a checkout session, potentially creating a subscription
        const session = event.data.object as Stripe.Checkout.Session;

        // Retrieve full session data (including line items, etc.) if needed
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ['line_items'],
        });

        // This is the Stripe customer ID
        const customerId = fullSession.customer;

        // Retrieve the Stripe customer to get the email
        const customerObj = await stripe.customers.retrieve(customerId as string);

        if (!customerObj || !('email' in customerObj) || !customerObj.email) {
          throw new Error('No valid customer email found in Stripe session.');
        }

        const email = customerObj.email;
        // The Price ID purchased
        const priceId = fullSession.line_items?.data[0]?.price?.id;
        // If "mode=subscription" in your Checkout Session, this is the subscription ID
        const subscriptionId = fullSession.subscription;

        // Look up the user in Supabase by email
        const { data: existingProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('email', email)
          .single();

        if (profileError) {
          console.error('Error fetching user from Supabase:', profileError);
          throw new Error('Could not fetch user from DB');
        }

        if (!existingProfile) {
          // If no matching user, you could create a new user_profile
          // or just log a warning. Adjust to your business logic.
          console.warn(`No user_profile found for email: ${email}`);
        } else {
          // Mark them as having a paid subscription
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({
              payment_confirmed: true,
              payment_date: new Date().toISOString(),
              // We store either the subscription ID (for subscription) or session ID
              payment_transaction_id: subscriptionId ?? session.id,
            })
            .eq('id', existingProfile.id);

          if (updateError) {
            console.error('Error updating user subscription in Supabase:', updateError);
            throw new Error('Could not update user subscription');
          }

          console.log(`✅ User ${email} subscription set to active.`);
        }

        break;
      }

      case 'customer.subscription.deleted': {
        // Subscription canceled or ended
        const subscription = event.data.object as Stripe.Subscription;
        const subscriptionId = subscription.id;

        // We might have stored this subscription ID in payment_transaction_id
        // Alternatively, if you store the Stripe customer ID, you can query by that.
        const { data: existingProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('payment_transaction_id', subscriptionId)
          .single();

        if (profileError || !existingProfile) {
          console.error('No user found for canceled subscription:', profileError);
          break;
        }

        // Mark user as unsubscribed
        const { error: cancelError } = await supabase
          .from('user_profiles')
          .update({
            payment_confirmed: false,
            payment_transaction_id: null,
          })
          .eq('id', existingProfile.id);

        if (cancelError) {
          console.error('Error updating user subscription status:', cancelError);
          throw new Error('Could not cancel user subscription in DB');
        }

        console.log(`❌ Subscription canceled for user ${existingProfile.email}.`);
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }
  } catch (err: any) {
    console.error(`❌ Error handling Stripe webhook event [${event.type}]: ${err.message}`);
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 400 });
  }

  // 5. Return a 200 response to acknowledge receipt of the event
  return NextResponse.json({ received: true }, { status: 200 });
}
