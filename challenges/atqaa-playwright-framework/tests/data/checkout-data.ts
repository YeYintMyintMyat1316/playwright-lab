import { ShippingAddress } from '../../pages/CheckoutPage';

/** Fake guest shopper — the email is unique per run so orders are easy to find in the Admin. */
export function guestShopper(): ShippingAddress {
  return {
    firstName: 'QA',
    lastName: 'Automation',
    address: '123 Test Street',
    postalCode: '700000',
    city: 'Ho Chi Minh',
    email: `qa.automation+${Date.now()}@example.com`,
  };
}
