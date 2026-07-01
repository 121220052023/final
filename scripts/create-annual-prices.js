import Stripe from 'stripe';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, '..', '.env');

// Read existing .env
const envContent = readFileSync(envPath, 'utf-8');
const envLines = envContent.split('\n');

function getEnv(key) {
  const line = envLines.find(l => l.startsWith(key + '='));
  return line ? line.split('=').slice(1).join('=').trim() : null;
}

const stripeKey = getEnv('STRIPE_SECRET_KEY') || getEnv('VITE_STRIPE_SECRET_KEY');
const stripe = new Stripe(stripeKey);

async function createAnnualPrice(monthlyPriceId, suffix) {
  // Fetch the existing monthly price to copy details
  const monthlyPrice = await stripe.prices.retrieve(monthlyPriceId);
  const product = await stripe.products.retrieve(monthlyPrice.product);

  // Create annual price (12 months for price of 10)
  const annualAmount = Math.round(monthlyPrice.unit_amount * 10); // ~2 months free
  const annualPrice = await stripe.prices.create({
    product: monthlyPrice.product,
    unit_amount: annualAmount,
    currency: monthlyPrice.currency,
    recurring: { interval: 'year' },
    metadata: { monthly_price_id: monthlyPriceId, savings: 'Save ~17%' },
    nickname: `${product.name} Annual`,
  });

  console.log(`Created annual price for ${product.name}:`);
  console.log(`  Monthly: ${monthlyPriceId} (${monthlyPrice.unit_amount / 100} ${monthlyPrice.currency}/mo)`);
  console.log(`  Annual:  ${annualPrice.id} (${annualAmount / 100} ${monthlyPrice.currency}/yr)`);
  return annualPrice;
}

async function main() {
  const proMonthly = getEnv('STRIPE_PRO_PRICE_ID');
  const ultimateMonthly = getEnv('STRIPE_ULTIMATE_PRICE_ID');

  if (!proMonthly || !ultimateMonthly) {
    console.error('Missing STRIPE_PRO_PRICE_ID or STRIPE_ULTIMATE_PRICE_ID in .env');
    process.exit(1);
  }

  console.log('Creating annual prices...\n');

  const proAnnual = await createAnnualPrice(proMonthly, 'pro');
  const ultimateAnnual = await createAnnualPrice(ultimateMonthly, 'ultimate');

  // Add to .env
  const newVars = [
    `STRIPE_PRO_ANNUAL_PRICE_ID=${proAnnual.id}`,
    `VITE_STRIPE_PRO_ANNUAL_PRICE_ID=${proAnnual.id}`,
    `STRIPE_ULTIMATE_ANNUAL_PRICE_ID=${ultimateAnnual.id}`,
    `VITE_STRIPE_ULTIMATE_ANNUAL_PRICE_ID=${ultimateAnnual.id}`,
  ];

  const filteredLines = envLines.filter(l =>
    !l.startsWith('STRIPE_PRO_ANNUAL_PRICE_ID') &&
    !l.startsWith('VITE_STRIPE_PRO_ANNUAL_PRICE_ID') &&
    !l.startsWith('STRIPE_ULTIMATE_ANNUAL_PRICE_ID') &&
    !l.startsWith('VITE_STRIPE_ULTIMATE_ANNUAL_PRICE_ID')
  );

  // Insert after STRIPE_ULTIMATE_PRICE_ID line
  const insertAfter = filteredLines.findIndex(l => l.startsWith('VITE_STRIPE_ULTIMATE_PRICE_ID'));
  filteredLines.splice(insertAfter + 1, 0, '', '# Annual price IDs', ...newVars);
  writeFileSync(envPath, filteredLines.join('\n') + '\n');

  console.log('\n✅ Annual prices created and added to .env');
  console.log(`\nPro Annual:     ${proAnnual.id}`);
  console.log(`Ultimate Annual: ${ultimateAnnual.id}`);
}

main().catch(console.error);
