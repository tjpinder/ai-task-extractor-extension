# Startvest Extensions - Bundles, Analytics & A/B Testing Roadmap

> **Status:** In Progress - Phase 1 partially complete
> **Created:** 2025-12-06
> **Priority:** Post-MVP

---

## 1. Extension Bundle Strategy

### Bundle Definitions

| Bundle ID | Name | Extensions | Individual Total | Bundle Price | Discount |
|-----------|------|------------|------------------|--------------|----------|
| `productivity-pack` | Productivity Pack | Task Extractor + Tabs Organizer | $33 | $25 | 24% |
| `creator-pack` | Creator Pack | Content Repurposer (1yr) + Task Extractor | $98 | $79 | 19% |
| `sales-pack` | Sales Pack | Sales Objection Handler + Task Extractor | $38 | $29 | 24% |
| `full-suite` | Full Suite | All extensions | ~$150 | $99 | 34% |

### Cross-Promotion Touchpoints

1. **Post-Purchase Upsell** - Immediately after checkout
2. **In-Extension Promo** - After 7 days of active use
3. **Email Sequence** - Drip campaign based on usage
4. **Landing Page** - Dedicated `/bundles` page
5. **Options Page Banner** - Subtle promotion in settings

### Implementation Notes

```typescript
// Backend: Bundle configuration
interface Bundle {
  id: string;
  name: string;
  extensionIds: string[];
  discountPercent: number;
  discountFixed?: number;  // Alternative: fixed price
  validFrom?: Date;
  validTo?: Date;
  abTestVariant?: string;  // For A/B testing
}

// Frontend: Cross-promo component
interface CrossPromoProps {
  currentExtension: string;
  userOwnedExtensions: string[];
  variant: 'modal' | 'banner' | 'inline';
}
```

---

## 2. Analytics Dashboard

### Dashboard Requirements

#### 2.1 Extension-Level Analytics

| Metric | Description | Granularity |
|--------|-------------|-------------|
| Total Installs | Chrome Web Store installs | Daily |
| Active Users | Users who opened extension | Daily/Weekly/Monthly |
| Feature Usage | Which features are used most | Per feature |
| Retention | Day 1, 7, 30 retention rates | Cohort |
| Conversion | Free → Pro upgrade rate | Daily |
| Revenue | Total revenue per extension | Daily |

#### 2.2 Cross-Extension Analytics

| Metric | Description |
|--------|-------------|
| Bundle Attach Rate | % who buy bundle vs individual |
| Cross-Sell Success | % who buy 2nd extension after 1st |
| Multi-Extension Users | Users with 2+ extensions |
| Lifetime Value | Revenue per user across all extensions |
| Churn Correlation | Does using multiple extensions reduce churn? |

#### 2.3 A/B Test Analytics

| Metric | Description |
|--------|-------------|
| Variant Distribution | Users per test variant |
| Conversion by Variant | Purchase rate per variant |
| Revenue by Variant | Revenue per variant |
| Statistical Significance | P-value, confidence interval |
| Winner Declaration | Automated winner detection |

### Dashboard Wireframe

```
┌─────────────────────────────────────────────────────────────────┐
│  Startvest Extensions Dashboard                    [Date Range] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌─────────┐│
│  │ Total Users  │ │ Active Today │ │ Revenue MTD  │ │ Conv %  ││
│  │    12,453    │ │    1,234     │ │   $4,521     │ │  3.2%   ││
│  │   ↑ 12%      │ │   ↑ 5%       │ │   ↑ 18%      │ │  ↑ 0.3% ││
│  └──────────────┘ └──────────────┘ └──────────────┘ └─────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Revenue by Extension                                        ││
│  │ ████████████████████████░░░░░░ Task Extractor    $2,100     ││
│  │ ██████████████░░░░░░░░░░░░░░░░ Content Repurposer $1,400    ││
│  │ ████████░░░░░░░░░░░░░░░░░░░░░░ Sales Objection   $680       ││
│  │ █████░░░░░░░░░░░░░░░░░░░░░░░░░ Tabs Organizer    $341       ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Active A/B Tests                                            ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Test: Bundle Discount Amount                    [Running]   ││
│  │ Variants: 20% off vs 25% off vs $10 off                     ││
│  │ Conversions: 2.1% vs 2.8% vs 2.4%                           ││
│  │ Leader: 25% off (p=0.04)                     [End Test]     ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ Bundle Performance                                          ││
│  ├─────────────────────────────────────────────────────────────┤│
│  │ Productivity Pack:  45 sold  │ $1,125 revenue │ 3.2% conv   ││
│  │ Creator Pack:       28 sold  │ $2,212 revenue │ 2.1% conv   ││
│  │ Sales Pack:         19 sold  │ $551 revenue   │ 1.8% conv   ││
│  │ Full Suite:         12 sold  │ $1,188 revenue │ 4.5% conv   ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. A/B Testing Framework

### Test Types to Run

#### 3.1 Pricing Tests

| Test ID | Hypothesis | Variants |
|---------|------------|----------|
| `price-001` | Higher price = same conversion, more revenue | $14.99 vs $19.99 vs $24.99 |
| `price-002` | Annual discount affects upgrade rate | 2 months free vs 20% off vs $30 off |
| `bundle-001` | Bundle discount sweet spot | 15% vs 25% vs 35% off |
| `bundle-002` | Fixed vs percentage discount | $10 off vs 25% off |

#### 3.2 Messaging Tests

| Test ID | Hypothesis | Variants |
|---------|------------|----------|
| `msg-001` | Urgency increases conversion | "Limited time" vs no urgency |
| `msg-002` | Social proof matters | "1000+ users" vs no social proof |
| `msg-003` | Feature vs benefit focus | "7 integrations" vs "Save 2 hours/week" |

#### 3.3 UX Tests

| Test ID | Hypothesis | Variants |
|---------|------------|----------|
| `ux-001` | Modal vs banner for upsell | Modal popup vs inline banner |
| `ux-002` | Timing of upsell | Immediate vs after 3 uses vs after 7 days |
| `ux-003` | Bundle page layout | Grid vs list vs comparison table |

### A/B Test Implementation

```typescript
// Backend: A/B Test configuration
interface ABTest {
  id: string;
  name: string;
  description: string;
  status: 'draft' | 'running' | 'paused' | 'completed';
  variants: ABVariant[];
  targetAudience: {
    extensions?: string[];      // Only users of these extensions
    isProUser?: boolean;        // Pro vs free users
    installDaysAgo?: number;    // Min days since install
    country?: string[];         // Geographic targeting
  };
  metrics: {
    primary: string;            // e.g., 'purchase_rate'
    secondary: string[];        // e.g., ['revenue', 'clicks']
  };
  sampleSize: number;           // Target per variant
  startDate: Date;
  endDate?: Date;
  winner?: string;              // Variant ID of winner
}

interface ABVariant {
  id: string;
  name: string;
  weight: number;               // Traffic allocation (0-100)
  config: Record<string, any>;  // Variant-specific config
}

// Frontend: Get user's variant
async function getABVariant(testId: string, userId: string): Promise<ABVariant> {
  // Deterministic assignment based on userId hash
  // Returns cached variant for consistency
}

// Event tracking
function trackABEvent(testId: string, variantId: string, event: string, value?: number) {
  // Send to analytics backend
}
```

### Statistical Significance

```typescript
interface TestResults {
  testId: string;
  variants: VariantResult[];
  isSignificant: boolean;
  pValue: number;
  confidenceLevel: number;      // e.g., 0.95
  recommendedWinner?: string;
  sampleSizeReached: boolean;
}

interface VariantResult {
  variantId: string;
  sampleSize: number;
  conversions: number;
  conversionRate: number;
  revenue: number;
  revenuePerUser: number;
  confidenceInterval: [number, number];
}
```

---

## 4. Backend API Endpoints

### Analytics API

```
GET  /api/v1/analytics/dashboard           - Main dashboard data
GET  /api/v1/analytics/extensions/:id      - Per-extension metrics
GET  /api/v1/analytics/bundles             - Bundle performance
GET  /api/v1/analytics/cohorts             - Retention cohorts
POST /api/v1/analytics/events              - Track events from extensions
```

### A/B Testing API

```
GET  /api/v1/ab-tests                      - List all tests
POST /api/v1/ab-tests                      - Create new test
GET  /api/v1/ab-tests/:id                  - Get test details
PUT  /api/v1/ab-tests/:id                  - Update test
POST /api/v1/ab-tests/:id/start            - Start test
POST /api/v1/ab-tests/:id/stop             - Stop test

GET  /api/v1/ab-tests/:id/variant          - Get variant for user
POST /api/v1/ab-tests/:id/event            - Track test event
GET  /api/v1/ab-tests/:id/results          - Get test results
```

### Bundle API

```
GET  /api/v1/bundles                       - List available bundles
GET  /api/v1/bundles/:id                   - Get bundle details
GET  /api/v1/bundles/recommend/:userId     - Get personalized bundle recommendation
POST /api/v1/bundles/:id/purchase          - Purchase bundle
```

---

## 5. Extension Integration

### Analytics Events to Track

Each extension should track:

```typescript
// Core events (all extensions)
track('extension_installed', { version, source });
track('extension_opened', { trigger: 'icon' | 'shortcut' | 'context_menu' });
track('feature_used', { feature: string, details?: object });
track('upgrade_prompt_shown', { location, variant });
track('upgrade_prompt_clicked', { location, variant });
track('settings_changed', { setting, oldValue, newValue });

// Task Extractor specific
track('extraction_started', { pageType, contentLength });
track('extraction_completed', { taskCount, categories, duration });
track('task_edited', { field: 'title' | 'priority' | 'category' });
track('export_completed', { destination, taskCount });

// Cross-promo events
track('cross_promo_shown', { bundle, variant, location });
track('cross_promo_clicked', { bundle, variant, location });
track('cross_promo_dismissed', { bundle, variant, location });
```

### Privacy Considerations

- All analytics are **opt-in** or clearly disclosed
- No PII in events (no task content, no URLs)
- Aggregate data only in dashboard
- GDPR-compliant data handling
- User can request data deletion

---

## 6. Implementation Phases

### Phase 1: Basic Analytics (Week 1-2) ✅ COMPLETE
- [x] Event tracking in extensions (analytics.ts, bundles.ts libraries created)
- [x] Backend event ingestion API (POST /analytics/events, GET /analytics/extensions/*)
- [x] Basic dashboard with key metrics (ExtensionAnalyticsDashboard.jsx)
- [x] Daily email summary (ExtensionAnalyticsEmailService with cron job at 9 AM)
- [x] Database migration for extension_analytics_events table
- [x] Analytics libraries added to meeting-prep and sales-objection-handler extensions

### Phase 2: A/B Testing Infrastructure (Week 3-4)
- [ ] A/B test configuration API
- [ ] Variant assignment logic
- [ ] Test results calculation
- [ ] Dashboard integration

### Phase 3: Bundle System (Week 5-6)
- [x] Bundle configuration in backend (bundles.controller.ts with 4 bundles)
- [x] Cross-promo components in extensions (bundles.ts library)
- [ ] Bundle checkout flow
- [ ] Bundle-specific Stripe products

### Phase 4: Advanced Analytics (Week 7-8)
- [ ] Cohort analysis
- [ ] Funnel visualization
- [ ] Revenue attribution
- [ ] Churn prediction

### Phase 5: Optimization (Ongoing)
- [ ] Run pricing A/B tests
- [ ] Optimize bundle compositions
- [ ] Test messaging variants
- [ ] Iterate based on data

---

## 7. Tools & Technology

| Component | Technology | Notes |
|-----------|------------|-------|
| Event Ingestion | Azure Functions / API | Low latency, high throughput |
| Data Storage | PostgreSQL / TimescaleDB | Time-series optimized |
| Dashboard | React + Recharts | Internal admin tool |
| A/B Assignment | Deterministic hash | Consistent user experience |
| Statistical Analysis | Python / scipy | Significance calculations |
| Alerting | Email / Slack | Anomaly detection |

---

## 8. Success Metrics

| Metric | Current | Target | Timeline |
|--------|---------|--------|----------|
| Bundle Attach Rate | N/A | 15% | 3 months |
| Cross-Sell Rate | N/A | 10% | 3 months |
| Avg Revenue Per User | ~$15 | $25 | 6 months |
| A/B Test Velocity | 0 | 2/month | 2 months |

---

## Notes & Ideas

- Consider integrating with existing analytics (Mixpanel, Amplitude, PostHog)
- Stripe has built-in A/B testing for checkout - explore this
- Chrome Web Store provides install analytics - can we pull this?
- Look into Firebase A/B testing for potential integration

---

*This document will be updated as we learn more from initial data.*
