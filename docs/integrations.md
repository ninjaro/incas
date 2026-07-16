# Integration Adapter Contracts

Payment and social publishing default to explicit mock modes. The mocks use
the same application-facing interfaces, persisted states, retries, and audit
paths as future production adapters, but they never move real money or publish
to a real social account.

## Payments

Select the mode with `PAYMENT_PROVIDER=mock`. The active provider is exposed
by `/api/v1/public/config`, and every mock transaction is returned with
`isSimulated: true`.

A `PaymentProvider` implementation must:

- create an idempotent checkout session for a persisted pending transaction;
- resume the same active checkout without creating another transaction;
- validate and handle provider webhooks;
- map provider outcomes to the shared pending, paid, failed, and cancelled
  states;
- use `record_payment_transition()` for status audit rows;
- leave event amount, capacity, and registration eligibility decisions in the
  application layer.

`PAYMENT_PROVIDER=stripe` currently fails fast because a production Stripe
adapter has not been implemented. Mock mode must not be presented as a real
payment option.

## Social Publishing

Select the mode with `SOCIAL_PROVIDER_MODE=mock`. Mock publications persist
provider IDs and permalinks that are visibly marked simulated in public and
admin responses.

A `SocialPublisher` implementation must:

- return `PublishResult` from `publish_post()`;
- identify retryable versus permanent failures;
- avoid duplicate publication when the post/provider row is already
  published;
- use the shared scheduling worker and bounded retry policy;
- persist provider IDs, permalinks, media URLs, errors, attempt counts, and
  simulation state through `_apply_result()`.

`SOCIAL_PROVIDER_MODE=graph` currently fails fast because real Facebook and
Instagram Graph API adapters have not been implemented.

## Workers

Run both workers in production:

```bash
flask --app run:app social-worker --interval 30
flask --app run:app reservation-worker --interval 30
```

The first publishes due social jobs. The second cancels expired unpaid event
registrations and promotes waiting-list entries. Both operations are safe to
run repeatedly.
