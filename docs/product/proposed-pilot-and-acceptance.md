> Historical research/proposal. The later user instruction authorized independent product selection and implementation. See `docs/PROJECT_STATUS.md` for the current Touchline product; the earlier implementation checkpoint below is superseded.

# Proposed pilot and customer-product acceptance

Date: 17 October 2026. Status: proposal, awaiting direction after market research. No implementation has started.

## Proposed first product

An employer-owned job-fair follow-through workspace: a mobile campaign page, optional wallet/company card, candidate preferences and continuation, staff ownership, and export to the employer's existing recruiting process.

The user identified businesses attending job fairs, clubs and associations as reachable customers. Job-fair employers are the proposed first discovery segment. This proposal does not claim an unserved market: EloCard, Withe, Yello, generic lead tools and ATS forms are direct substitutes. See [the research](../research/market-research-2026-10-17.md).

## Decision checkpoint

Before implementation, discuss the research with the user and select one customer/problem pair. Agree whether the first pilot promises wallet issuance or only the web workflow; this materially changes onboarding and verification. The attached universal studio plan is inspiration, not an already approved feature specification.

Prepare and run customer discovery against the existing alternatives. Customer outreach needs an explicit user instruction before sending messages. Interview scripts are ready in the research; no outreach has been sent. User agreement to implement does not itself prove demand.

## Demo journey to prove

1. An employer signs in and creates an event with a real campaign date, company information, two roles, a recruiter and privacy text.
2. The employer publishes a revision and opens its mobile page from an exported QR code on another device.
3. A visitor browses roles without being forced to surrender contact information.
4. An interested visitor submits minimal details and deliberate choices; the record retains event, role, source, text version and timestamp.
5. Refreshing and restarting the application preserves the data. Duplicate/retried requests do not create duplicate submissions or duplicate outbound messages.
6. The candidate receives an actual private continuation email. A message accepted by a provider is labeled accordingly; delivery and bounce states use real provider events.
7. A recruiter assigns a follow-up owner, records the next action and sees unresolved contacts. Another tenant cannot read these records.
8. The candidate changes a preference or withdraws. Queued sends check current permission immediately before dispatch and honor suppression.
9. The employer exports correctly escaped CSV with agreed fields and evidence. Export is tested in the destination workflow; a CSV file is not described as a native ATS integration.
10. The employer can close a campaign and apply the agreed retention/deletion policy. A revoked or expired private link fails safely.
11. If wallets are in agreed scope, create an actual signed Apple pass and Google save flow with appropriate issuer access. Install both, change a published field, observe the updates, and record real device/OS results.
12. A draft design change remains unpublished while an independent candidate/company data update occurs. Published rendering uses the approved revision.

## Implementation sequence after agreement

### A. Prove the hard external dependencies

Use a single hard-coded campaign to prove deployed URLs, email delivery, and, if in scope, Apple/Google issuance and updates. Identify issuer/approval requirements early. Do not build a large editor before these work. Never expose private keys to the browser, log secrets, or commit certificates.

### B. Establish the data and permission model

Suggested entities: Organization, User, Membership, Campaign, CampaignRevision, Role, Submission, PermissionRecord, CandidateLink, FollowUpTask, OutboundMessage, AuditEvent, WalletBinding and DeliveryAttempt.

Separate public company information, candidate personal data, and recruiter-private notes. Keep permissions scoped to an organization and role. Public share URLs and private candidate tokens serve different purposes and cannot be interchangeable.

### C. Build the complete customer journey

Use one maintainable web application and a relational database, with durable background work for email/wallet delivery. Choose exact current dependencies at implementation time. A form-based campaign editor with strong defaults is sufficient initially. Persist jobs and retries; do not rely on an in-memory queue for real customer delivery.

Implement campaign publishing, visitor capture, private continuation, follow-up assignment and export before adding broad design tooling. Translate the actual interface and messages for agreed pilot languages; a language selector alone is not multilingual support.

### D. Validate and run a limited real pilot

Test the actual workflows and important failure cases. Deploy to an agreed environment. Verify backup restoration, tenant boundaries, message suppression, publish isolation and any promised wallets. Give the pilot customer an onboarding guide and a support path. Record observations and defects in a pilot log.

## Acceptance evidence required

| Requirement | Evidence that would prove it | Current state |
| --- | --- | --- |
| Product direction agreed | User decision recorded in project status | Pending |
| Reason to buy established | Repeated concrete customer problem and competitor comparison | Pending |
| Working application | Reproducible startup and deployed end-to-end journey | Not built |
| Persistent data | Restart/refresh demonstration and migration checks | Not built |
| Access boundaries | Unauthenticated, wrong-role and cross-tenant requests denied | Not built |
| Candidate privacy | Private notes excluded from public/candidate responses; token expiry/revocation verified | Not built |
| Permission-aware outreach | Withdrawal-versus-queued-send and retry scenarios pass | Not built |
| Accurate exports | Real imported sample, escaping and spreadsheet-formula handling checked | Not built |
| Honest reporting | Views, submissions, sends, clicks and confirmed applications distinguished | Not built |
| Published revision isolation | Data update cannot render an unpublished revision | Not built |
| Real email | Actual provider acceptance plus observed delivery/bounce behavior | Credentials and implementation pending |
| Wallet installation, if promised | Actual Apple/Google device saves with issuer access | Credentials and implementation pending |
| Wallet update, if promised | Installed cards visibly receive changed published data | Not verified |
| Recovery | Failed delivery retries and tested template/config recovery without restoring withdrawn permissions | Not built |
| Customer deployment | HTTPS, secrets configuration, monitoring and backup restoration verified | Pending |
| Customer usability | Pilot user completes agreed tasks and receives operating instructions | Pending |

## Important product rules

- A successful HTTP response from a wallet provider is not proof that a device displayed the update.
- A QR scan or application-link click is not a completed application. Report outcomes according to their evidence.
- Wallet content must not expose candidate personal data or recruiter notes by default. A company/event card can contain public information and a link back to the web journey.
- A design rollback creates a new controlled publication. It does not restore old consent, re-enable deleted contacts, replay messages or undo an external hiring action.
- If a feature depends on missing credentials or approval, show its real state. Mock success does not satisfy acceptance.
- Versioned privacy text and EU hosting support customer operations; they do not independently establish legal compliance. The employer must approve its processing purpose, notices and retention policy for the actual deployment.

## Deferred decisions

Brand/name, exact stack, hosting, country/language scope, issuer arrangement, billing provider, message limits, ATS integration target and pricing await product agreement and pilot requirements. Samsung/Huawei, a freeform card canvas, AI generation, candidate ranking and a full association-management suite are not justified first-pilot dependencies.
