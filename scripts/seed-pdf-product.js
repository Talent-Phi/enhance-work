import { getUncachableStripeClient } from '../stripeClient.js';

const PRODUCT_NAME = 'The South Florida Med Spa Directory';
const PRICE_CENTS = 3500; // $35.00 USD

async function createProduct() {
  try {
    const stripe = await getUncachableStripeClient();
    console.log('Checking for existing product...');

    const existing = await stripe.products.search({
      query: `name:'${PRODUCT_NAME}' AND active:'true'`
    });

    let product;
    if (existing.data.length > 0) {
      product = existing.data[0];
      console.log(`Product already exists: ${product.id}`);
    } else {
      product = await stripe.products.create({
        name: PRODUCT_NAME,
        description: 'The complete directory of medical spas in South Florida. Includes clinic names, locations, services, and contact details across Miami-Dade, Broward, and Palm Beach counties.',
        metadata: {
          type: 'digital_pdf',
          category: 'directory'
        }
      });
      console.log(`Created product: ${product.name} (${product.id})`);
    }

    const existingPrices = await stripe.prices.list({ product: product.id, active: true });
    if (existingPrices.data.length > 0) {
      const price = existingPrices.data[0];
      console.log(`Price already exists: ${price.id} — $${price.unit_amount / 100} ${price.currency.toUpperCase()}`);
      console.log('\n=== DONE ===');
      console.log(`Product ID: ${product.id}`);
      console.log(`Price ID:   ${price.id}`);
      return;
    }

    const price = await stripe.prices.create({
      product: product.id,
      unit_amount: PRICE_CENTS,
      currency: 'usd',
    });
    console.log(`Created price: $${PRICE_CENTS / 100} USD (${price.id})`);

    console.log('\n=== DONE ===');
    console.log(`Product ID: ${product.id}`);
    console.log(`Price ID:   ${price.id}`);
    console.log('\nUpdate STRIPE_PRICE_ID in your env with the Price ID above.');
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

createProduct();
