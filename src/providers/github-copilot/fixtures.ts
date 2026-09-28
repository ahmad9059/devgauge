// Sanitized GitHub billing fixtures. No tokens, cookies, or account identifiers.

export function personalAiCreditFixture(): string {
  return JSON.stringify({
    usageItems: [
      {
        product: 'copilot',
        sku: 'copilot_premium_request',
        unitType: 'ai-credits',
        quantity: 120,
        netAmount: 0,
      },
    ],
    timePeriod: { year: 2026, month: 9 },
  });
}

export function organizationPremiumRequestFixture(): string {
  return JSON.stringify({
    usageItems: [
      {
        product: 'copilot',
        unitType: 'requests',
        quantity: 640,
        netAmount: 12.8,
      },
    ],
    timePeriod: { year: 2026, month: 9 },
  });
}

export function consumptionOnlyFixture(): string {
  return JSON.stringify({
    usageItems: [{ unitType: 'requests', quantity: 42 }],
  });
}

export function currencyOnlyFixture(): string {
  return JSON.stringify({
    usageItems: [{ unitType: 'usd', netAmount: 18.5 }],
  });
}

export function multipleItemsFixture(): string {
  return JSON.stringify({
    usageItems: [
      { unitType: 'requests', quantity: '10' },
      { unitType: 'requests', quantity: '5.5' },
    ],
  });
}

export function emptyUsageFixture(): string {
  return JSON.stringify({ usageItems: [] });
}

export function changedSchemaFixture(): string {
  return JSON.stringify({ message: 'Not Found' });
}
