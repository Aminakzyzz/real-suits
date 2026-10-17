> Historical research/proposal. The later user instruction authorized independent product selection and implementation. See `docs/PROJECT_STATUS.md` for the current Touchline product; the earlier implementation checkpoint below is superseded.

# Market research and product decision

Research date: 17 October 2026. Status: research completed; product direction proposed, not approved for implementation.

## Decision in one page

**Do not start by building the universal card designer in the supplied plan.** Most of its headline capabilities already exist, including visual pass design, Apple/Google issuance, updates, reusable templates, bulk operations, QR distribution, APIs, and agency branding. Both wallet platforms also provide design tools. A new product needs a buyer-specific outcome beyond generating attractive cards.

The user's reachable customers are **businesses attending job fairs, plus clubs and associations**. That makes a developer-only wallet operations tool a less attractive first route, even though this research found interesting operational weaknesses.

**Recommended opportunity to validate: an employer's job-fair follow-through workspace.** Help a small recruiting team turn a booth conversation into an assigned, permissioned next action and an application handoff. The employer can use it at different fairs alongside its existing applicant tracking system (ATS). A digital card is the entry point; the business outcome is fewer unworked candidate conversations.

This is a **market-entry hypothesis, not a proven empty market**. Withe TalentSync, EloCard, Yello, and others already address parts or much of this workflow. In particular, EloCard advertises a €19.99 event pass for QR candidate capture and follow-up. It would be misleading to call inexpensive recruiting lead capture a newly discovered gap. The question worth testing is whether accessible employers still struggle with ownership, candidate self-service, consent history, and measuring actual application handoff across these tools.

The research does **not yet establish an uncontested gap or willingness to pay for our proposed combination**. Before implementation, compare that exact workflow with prospective customers' current tools and agree the direction with the user. A service-assisted pilot could still be commercially useful in a competitive market; novelty is not required, but a reason to buy is.

**Follow-up evidence check:** HiHello explicitly advertises consent forms, audit records and source attribution, while Yello documents candidate consent/retention controls and staff evaluation assignments/reminders. These findings further weaken any feature-gap claim for the proposed workspace. Employer follow-through is the recommended **customer-discovery segment**, not a cleared build recommendation. See [the competitor validation scorecard](competitor-validation-scorecard.md) for the narrower questions that still require product access and customer evidence.

Primary evidence: [Blinq pricing](https://blinq.me/pricing), [PassKit platform](https://passkit.com/platform/), [Withe TalentSync](https://withe.co/product/talent-sync), [EloCard for recruiters](https://elocard.de/fuer-recruiter/).

## Scope and evidence quality

The attached `universal_digital_card_studio_plan.md` was treated as inspiration and a set of hypotheses to examine, not as an instruction to implement its roadmap. The user's request establishes the sequence: research, identify and discuss a gap, then implementation.

This investigation covered four adjacent markets: digital business cards; wallet pass infrastructure; memberships and loyalty; and recruiting at job fairs. It also checked first-party wallet tooling and open-source alternatives. Sources are vendor product/pricing pages, support documentation, official platform documentation, and project repositories. Search results were used to discover sources; third-party ranking articles and vendor comparisons were not used as authority for competitors' prices.

Evidence labels used below:

- **Published:** the vendor or platform explicitly documents the feature, restriction, or price. This is evidence of its public offer, not an independent performance test.
- **Inference:** a strategic conclusion drawn from those offers or technical constraints.
- **Unknown:** not established from the reviewed public material. This does not mean the product lacks the feature.

No paid accounts were opened, sales teams contacted, or real devices tested. No conversion uplift, market size, revenue, customer count, or security certification was independently audited. Prices retain the published currency and billing basis; taxes, add-ons, negotiated terms, and regional differences may apply. Dynamic pricing pages can change. Conflicting page sections are identified rather than silently normalized.

## 1. What the state of the art already includes

### Business cards have become relationship and lead tools

Blinq and HiHello both include wallet sharing on free plans. Paid business offers add provisioning, brand controls, contact capture, and integrations. Popl emphasizes event lead capture, qualification, enrichment, and CRM handoff. This puts a generic contact page or QR-to-vCard tool under substantial free and low-cost competition. [Blinq](https://blinq.me/pricing), [HiHello](https://www.hihello.com/pricing), [Popl](https://popl.co/pages/pricing).

### Pass infrastructure is already a complete category

PassKit markets an end-to-end lifecycle platform. Passcreator documents drafts, validation, publishing permissions, scheduling, and conflicts between scheduled changes. PassEntry offers a builder, previews, CSV operations, scanning, and integrations. These are direct counters to treating “design once and publish to wallets” or “safe drafts” as sufficient differentiation. [PassKit](https://passkit.com/platform/), [Passcreator publishing](https://www.passcreator.com/en/docs/building-passes/templates/publishing-changes), [PassEntry features](https://passentry.com/features).

### First-party design tools raise the baseline

Apple's Pass Designer offers previews using the platform's rendering, validation, and semantic editing. Its current page labels the download beta and specifies macOS 27 or later. Google's Pass Builder previews common fields and generates class/object definitions, while explicitly excluding some customization options. A homemade browser preview should not be sold as more authoritative than native rendering. [Apple Pass Designer](https://developer.apple.com/pass-designer/), [Google's first-pass guide](https://developers.google.com/wallet/generic/getting-started/build-your-first-pass?hl=en).

### A neutral card model is useful architecture, not a moat

Open-source Passlet describes one definition producing both wallet outputs. The `y2k-network/passkit` project additionally exposes fidelity findings for information dropped or approximated between wallets. Its README also identifies beta dependencies and an unwired APNs delivery default. These are useful design references, not proof of a production-ready foundation. [Passlet](https://github.com/oscartrevio/passlet), [neutral pass IR and fidelity audit](https://github.com/y2k-network/passkit).

## 2. Competitor map: business cards and networking

The last column states a documented boundary or an unanswered question relevant to our proposed product. It does not claim an exhaustive feature absence.

| Product | Published offer | Public price observed | Boundary relevant to a new entrant |
| --- | --- | --- | --- |
| [Blinq](https://blinq.me/pricing) | Free wallet cards; paid branding, team administration, enrichment and CRM tools | Premium $9.99/month or $7.33/month annually; Business $6.99/user/month or $4.99 annually | Strong substitute for ordinary cards. Recruiting-specific consent and application-completion evidence were not established in the reviewed pricing page. |
| [HiHello](https://www.hihello.com/pricing) | Free cards and wallet support; team templates, signatures, CRM and lead capture | Professional $6/month billed yearly; Business $5/user/month billed yearly, five-user minimum | Its [lead-capture page](https://www.hihello.com/features/lead-capture) also advertises consent forms and audit records. Some card-count details differ between the pricing page's sections; those counts are not used here. |
| [Popl](https://popl.co/pages/pricing) | Event badge capture, offline capture, enrichment, CRM sync and reporting | Team pricing by quote; published FAQ describes uncapped team/event/lead usage | Do not claim lead capture or follow-up handoff is missing. A dedicated candidate consent-to-application workflow remains unverified here. |
| [Lemontaps](https://www.lemontaps.us/pricing) | Business cards, team administration, white-label profiles, signatures; higher offers add lead capture and CRM | US page: Share $3.99/user/month annually; Connect $9.99 annually for 5–19 users; enterprise quote | EU hosting and enterprise controls are already advertised. Its own competitor comparison was not used to establish rivals' offers. |
| [Uniqode Cards](https://www.uniqode.com/digital-business-card) | Branded cards, contact capture, analytics and automated team provisioning | No normalized price recorded in this review | QR analytics plus team management is an existing category, not an opening by itself. Recruiting workflow depth needs a trial. |

**Implication:** avoid a broad individual-card launch. It would require competing for attention against free products while recreating mature team and integration features.

## 3. Competitor map: wallet infrastructure and adjacent tooling

| Product | Published offer | Public price observed | Boundary or uncertainty |
| --- | --- | --- | --- |
| [PassKit](https://passkit.com/legal/rate-card/) | Platform access plus volume billing; designer, issuance and lifecycle tooling | Minimum $39.50/month, one username, allowances of 250 multi-use and 250 single-use passes; additional volume charged by tier | Per-record and per-issuance accounting must be understood for a specific workload. Its pricing model differs from an installed-device count. |
| [Passcreator](https://app.passcreator.com/en/customer/register) | Visual design, APIs, landing pages, updates, EU hosting; Apple/Google and advertised Samsung support | Five active registrations free; paid slider amounts not reliably captured | Branding and EU hosting already exist. [White-label documentation](https://www.passcreator.com/en/docs/account/white-label) also establishes a partner/reseller route. Samsung is described as an optional add-on in its template guide. |
| [WalletThat](https://www.walletthat.com/pricing/) | Designer, CSV, updates, notifications and redemption | Business from $99/month plus $0.01 per active pass record; enterprise from $1,000/month | FAQ explicitly limits an account to one brand. Custom issuance domain appears under enterprise. That is a real packaging boundary, not evidence that all rivals lack multi-client support. |
| [Passmint](https://passmint.com/pricing) | Unified API, templates, webhooks and distribution; higher plans add white-label pages | Hobby $15/month for 500 active passes; Pro $49 for 5,000; Scale $149 for 25,000 | Cheap unified issuance and an agency offer already exist. Free mode is test-only; live issuance starts on a paid plan. |
| [PassEntry](https://passentry.com/pricing) | Wallet lifecycle tools and integrations | Pilot £199/month, or £167/month annually, 500 passes; Custom from £200/month | Higher starting price is not proof of missing value. Its [feature page](https://passentry.com/features) already covers bulk operations and previewing. |
| [Pass2U](https://www.pass2u.net/pricing) | Designer/API updates and an explicit reseller route | Credits for creation, updates and delivery; monthly alternatives also displayed | The text rendering presents multiple plan figures without sufficiently clear associations. Obtain a workload quote rather than compare an invented flat monthly total. |
| [Apple Pass Designer](https://developer.apple.com/pass-designer/) | Native design, semantic data, validation and device previews | Beta download through an Apple account; issuance credentials remain separate | Apple-specific tool, not an entire multi-wallet customer operations service. |
| [Google Pass Builder](https://developers.google.com/wallet/generic/resources/pass-builder) | Interactive generic-pass building and preview | Public developer tool | Basic design is available without buying a new studio; it is not the operational backend. |
| [passkit-generator](https://github.com/alexandercerutti/passkit-generator) | MIT-licensed Node library for Apple pass generation, with an associated visual designer | Open-source library | Does not itself supply our application's tenancy, customer support, hosting or Google integration. Reuse is possible after dependency review. |
| [Passlet](https://github.com/oscartrevio/passlet) | Unified Apple and Google definitions and outputs | Open-source project; deployment costs separate | Library availability reduces the differentiation of a compiler alone. Production suitability still requires evaluation. |
| [y2k-network/passkit](https://github.com/y2k-network/passkit) | Neutral intermediate representation and explicit fidelity findings | MIT; project describes beta dependencies | Compatibility reporting is already demonstrated in source. Its README explicitly leaves live push implementation incomplete by default. |
| [Passmint validator](https://passmint.com/tools/pkpass-validator) and [Leal tools](https://www.getleal.com/tools) | Browser-side inspection and validation of Apple pass files | Advertised free | A single-file validator cannot be our paid differentiator. Runtime delivery and complete recipient-population checks are different questions. |

**Price interpretation:** neither low-cost issuance, an API, a visual preview, reseller accounts, nor a validator alone constitutes an open market gap.

## 4. Competitor map: clubs, memberships and loyalty

| Product | Published offer | Price observed | What this rules out as a novelty claim |
| --- | --- | --- | --- |
| [MPass](https://getmpass.com/us/) | Club wallet memberships, events, scanning, renewals and imports | US page: free 50 active cards/tickets; Essential $39/month; Pro $89/month, with CSV import listed on Pro | A small-club membership pass product with CSV and reminders already exists. |
| [Memberlytic](https://memberlytic.com/digital-membership-cards) | Standalone wallet cards alongside an existing member database; CSV/API, live status and QR verification | Quote based on membership count and scope | “Keep your current membership system” plus verification and renewal updates is explicitly offered. |
| [WalletWallet](https://www.walletwallet.dev/use-cases/digital-membership-cards/) | Template tokens, batch CSV, pass manager, renewals and revocation | Membership page advertises Pro at $39/month and counts content-changing operations | An inexpensive API with a membership-facing dashboard is already advertised. Actual operational allowances should be confirmed before procurement. |
| [Cuseum](https://go.cuseum.com/services) | Wallet memberships, existing CRM connections and wider cultural-organization engagement | Organization-specific quote | Museums and nonprofits already have specialist vendors. |
| [Loopy Loyalty](https://loopyloyalty.com/pricing/) | Apple/Google stamp cards, stamper app, unlimited customers | Starter $25/month; Growth $69; Ultimate $95 | Ordinary digital loyalty stamp cards are already inexpensive. Card-design and location limits still matter. |
| [Revel](https://letsrevel.io/club-membership-management) | Memberships, classes, series passes, wallet cards and scanning; advertises self-hostability | Page describes free free-events/RSVPs and payment-related fees; exact paid rate not recorded | Self-hostable membership plus wallet support cannot be called unique. |

**Implication:** clubs may be reachable pilot buyers, but an all-purpose club card builder has no demonstrated unmet need here. A club pilot should begin with the club's actual operational problem, not a presumption that digital cards are unavailable.

## 5. Competitor map: the user's job-fair market

| Product | Published offer | Price observed | Consequence for our positioning |
| --- | --- | --- | --- |
| [Yello Events](https://yello.co/recruitment-events/) | Recruitment events, candidate capture, evaluations, scheduling, follow-up campaigns and event ROI | Demo-led; no public price recorded | The whole recruiting-event lifecycle is an established category. Lack of a public price is not proof that the product is unaffordable. |
| [Withe TalentSync](https://withe.co/product/talent-sync) | Employer booth at any fair; role interest, candidate capture, later CV upload, recruiter notes, shared queue, CSV and enterprise ATS integration | First three fairs free; $400/fair; enterprise $15,000/year | Direct competitor to a lightweight employer-side event workspace. Organizer independence, deferred CV upload and candidate confirmation already exist. Currency symbol is reproduced as published; do not assume USD without confirmation. |
| [EloCard for recruiters](https://elocard.de/fuer-recruiter/) | Per-job QR codes, candidate list, team collection, automated confirmation/follow-up and structured export; advertises EU processing | €19.99 event pass for 14 days; €99/year Pro | Strong counterexample to an alleged low-price German recruiting-capture gap. Legal-compliance marketing was not independently audited. |
| [ScanFactor](https://scanfactor.com/pricing) | Candidate QR profiles and recruiter connection dashboard; host-oriented career-fair platform | Recruiters and attendees free; hosts $30/company | No-app career-fair networking is already offered. Check dependence on host participation during a trial. |
| [SpeakSoon for recruiters](https://speaksoon.app/for/recruiters) | WhatsApp capture, LinkedIn enrichment, follow-up drafts, CRM/CSV handoff | No price recorded on reviewed recruiter page | Personalized recruiting follow-up is already part of competing positioning. A requirement to avoid WhatsApp might distinguish a buyer segment, not an entire market. |
| [Minggo registration forms](https://www.minggo.io/oplossing/registratieformulier) | Candidate registration by QR/link into ATS and talent pool, without candidate account or app | No price recorded on reviewed page | Account-free QR-to-ATS capture exists. |
| [Scan2Lead](https://scan2lead.com/) | Badge/business-card capture, event lead portal, export and CRM interfaces; advertises EU hosting | No normalized quote recorded | Europe-based general lead retrieval is another substitute. Its 365 offer challenges an organizer-independence novelty claim. |

### What is genuinely still unknown

Consent collection and audit records are explicitly advertised by [HiHello](https://www.hihello.com/features/lead-capture). A [historical Yello product announcement](https://yello.co/blog/new-feature-improved-candidate-consent-management-data-privacy/) describes consent tracking, reminders, automated purging and visibility restrictions; current availability by plan requires confirmation. Its [candidate-evaluation page](https://yello.co/candidate-evaluations/) advertises staff assignment, reminders and outstanding-work reporting. These are counter-evidence to broad privacy or ownership novelty claims.

The reviewed pages still do not provide enough evidence to compare all these products on: candidate withdrawal propagating into already queued outreach; the exact privacy text/version attached to each submission; verified application completion in a particular customer's ATS; and the complete behavior of records, exports and messages after event closure. Source attribution is already advertised by [HiHello](https://www.hihello.com/solutions/attribution-gap); attribution alone is not a feature gap.

These are **trial questions**, not a checklist of features we can claim competitors lack. Some may already be supported in an enterprise offer or by configuration.

## 6. Candidate opportunities and rejection tests

These judgments are qualitative. Customer reach comes from the user's answer; commercial conclusions are hypotheses.

| Direction | Customer reach | Competitive pressure | Main uncertainty | Decision |
| --- | --- | --- | --- | --- |
| Universal business-card/canvas studio | Moderate | Very high, including free offers | Why would someone switch? | Do not lead with it |
| Club wallet memberships | Good | High, including focused and self-hostable tools | Specific unsolved club workflow and budget | Secondary discovery track |
| Employer job-fair follow-through | Good | High; direct small-team competitors exist | Does ownership/privacy/application handoff remain painful? | Recommended first validation track |
| Wallet release assurance for agencies | User access not established | Existing publishing/validation, but some specific operational boundaries documented | Repeated pain, buyer access, willingness to pay | Keep as alternative; do not choose solely for engineering novelty |

### A concrete technical opening, with limits

Passcreator documents that editing an individual pass can also deliver unpublished template changes. That creates a specific risk when someone updates a member's expiry or a person's details while a template redesign is still a draft. An alternative product could guarantee that ordinary data updates render only an approved template revision. [Passcreator single-pass updates](https://www.passcreator.com/en/docs/delivering/push/updating-a-single-pass).

This does not mean Passcreator has no publishing controls: it explicitly has drafts, publish permissions, scheduled publication and conflict warnings. Nor does it prove that no competing product enforces revision isolation. [Passcreator publishing](https://www.passcreator.com/en/docs/building-passes/templates/publishing-changes).

The broader agency hypothesis would combine immutable approvals, all-recipient data checks, test cohorts, careful shared-class updates, and recoverable publishing. It is a potentially useful product, but the user's stated customer access makes it a weaker initial business bet than employer discovery. A single fixable competitor behavior is not a defensible moat.

## 7. Recommended product hypothesis

Working descriptor: **job-fair follow-through workspace**. A final name, domain and trademark have not been chosen.

Proposed buyer: an employer's HR/recruiting lead who attends several fairs, already has an application system, and loses time coordinating candidate follow-up among a few booth staff. An organizer could later distribute the tool to exhibitors, but that is a separate sale and should not be assumed.

Proposed promise: **every candidate conversation has a clear next step, an owner, and a permission record, without replacing the employer's ATS.**

Example proposed workflow:

1. A recruiter creates a fair campaign with a company brand, roles, locations, contact, and selected languages.
2. The employer publishes a mobile page and prints a QR code. An optional physical NFC tag opens the same stable page.
3. A visitor can browse roles and save the employer's details without submitting personal data.
4. A visitor who wants follow-up chooses a role, leaves minimal contact details, and sees the employer's exact privacy information and choices.
5. The candidate receives a private continuation link to the relevant role and next action. Candidate-only information is kept separate from recruiter notes.
6. The employer sees a shared queue with an assigned owner, due action, and explicit state: awaiting action, contacted, application link opened, or application confirmed.
7. The candidate can change preferences or withdraw through self-service. Pending outreach observes the current preference state.
8. The employer exports the agreed fields and permission evidence, or connects one validated ATS integration later.
9. Event closure applies the employer's configured retention policy; it does not silently create an indefinite talent pool.

An opened link is **not** a submitted application or a hire. Application-confirmed status requires an ATS callback, documented import, or labeled manual confirmation. Wallet saves and QR scans are also not evidence of recruiting success.

### The proposed differentiating bundle

- Clear staff responsibility and unresolved-action visibility after the fair.
- Candidate self-service for continuation, preferences and withdrawal.
- Versioned capture of the employer's privacy text and choices, with lifecycle-aware outreach.
- Accurate handoff reporting, separating clicks from confirmed downstream outcomes.
- Fast local onboarding and event-based purchasing for the initial customers the user can reach.

The bundle is a **proposed purchasing reason**. Public-page research does not prove it is unavailable elsewhere. Do not sell wallet support, multilingual pages, consent, QR, or CSV as unique features. Competitor trials and customer interviews must establish which part is actually better.

### Where the card plan remains useful

Keep semantic fields, separation of design/data, stable distribution links, template revisions, and wallet adapters. Start with one recruiter/company layout and one event layout. Use the web page for interactive actions. Optional wallet cards can preserve company/event context and point back to current next steps.

Delay arbitrary front/back canvas editing, AI layout generation, Samsung/Huawei issuance, a marketplace, multiple CRM connectors, advanced scoring, and a full club-management module. These would multiply effort before establishing the buying reason. This is proposed scope, not a change already implemented.

## 8. Platform facts that change feasibility

### Issuer ownership changes onboarding

The attached plan suggests using the platform's issuer credentials for initial customer passes. Apple's current agreement restricts using a Pass Type ID to sign third-party passes and includes a limited service-provider arrangement. Treat commercial issuer setup as a real onboarding requirement and review the arrangement against the agreement. Do not assume one platform certificate can cover unrelated customer brands. [Apple Developer Program License Agreement, Attachment 5](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/).

### Demo mode is not public Google issuance

New Google Wallet issuer accounts start in demo mode with restricted recipients. Public distribution requires publishing access. A generated save link alone does not prove an arbitrary customer can install a pass. [Google publishing access](https://developers.google.com/wallet/generic/test-and-go-live/request-publishing-access).

### Updates are asynchronous

Apple's update flow involves device registration, a push prompting the device to query for changes, and downloading an updated pass. Therefore an API acceptance or queued push must not be displayed as verified on-device delivery. Critical eligibility or revocation should be checked against current server state where appropriate. [Apple update protocol](https://developer.apple.com/library/archive/documentation/UserExperience/Conceptual/PassKit_PG/Updating.html).

### Shared Google classes create a release boundary

Google documents that class changes affect all holders of that class. Full updates clear omitted fields, and patches replace supplied arrays. Design a test cohort without first changing a shared production class. Limit initial staged changes to operations proven to isolate the intended objects; test other strategies before claiming arbitrary cohort deployment. [Google class/object updates](https://developers.google.com/wallet/generic/use-cases/updates).

### NFC tags and contactless wallet credentials are different products

A physical NFC tag containing a web URL can distribute a campaign. An NFC-enabled Apple Wallet pass requires a special entitlement and compatible infrastructure. Do not promise door access or tap-to-terminal redemption from ordinary URL tags. [Apple Pass.NFC](https://developer.apple.com/documentation/walletpasses/pass/nfc-data.dictionary?changes=_6_6), [Apple contactless loyalty requirements](https://developer.apple.com/wallet/loyalty-passes/).

### Visual freedom has limits

Wallets render their own layouts. Apple also advises keeping information in text fields and semantics rather than embedding it into images, including for accessibility. A canvas image is not an equivalent accessible wallet pass. [Apple Wallet design guidance](https://developer.apple.com/design/human-interface-guidelines/wallet).

### Additional wallets add onboarding, not just adapters

Samsung documents partner/business setup, security credentials and card configuration. Huawei capability, region coverage and current issuer access were not verified sufficiently in this investigation. Neither should be a first-pilot dependency. [Samsung onboarding](https://developer.samsung.com/wallet/overview/onboardingguide.html).

## 9. Validation before a build decision

The user has requested the opportunity discussion before implementation. The following is a prepared validation plan, not completed customer research. No external messages have been sent.

Interview 8–12 reachable employers that attended a fair recently, plus 3–5 clubs as a secondary comparison. Seek specific accounts of the last event or renewal cycle, rather than opinions on a feature list.

Employer questions:

1. Walk through your last fair from first conversation to the first application. Show the actual form, spreadsheet or ATS fields if appropriate.
2. How many staff attended, how were follow-ups assigned, and which contacts were still unresolved after a week?
3. What tool did you use, what did it cost, and why did you choose it over an ordinary application link?
4. What happens when a candidate changes their mind, asks for deletion, or wants to change their preferred role?
5. How do you distinguish a scanned QR code, an interested contact, and an actual submitted application?
6. Which part requires duplicate work, and what would have to improve for you to switch?
7. Would EloCard's event offer, Withe's first free fairs, or your ATS's own form already solve the problem? If not, show the exact missing step.
8. Who can authorize a paid event pilot, and what result would make a second purchase worthwhile?

Club questions: where the member source of truth lives; what happens on renewal/revocation; how benefits are checked; who handles exceptions; annual budget; and why MPass, Memberlytic, or their current club system is insufficient.

Suggested proceed criteria, chosen as business discipline rather than industry benchmarks:

- At least five employers independently describe the same specific problem and can show their current workaround.
- At least three offer a concrete pilot opportunity with a named event, responsible buyer and agreed price or signed paid-pilot intent.
- Test at least EloCard and Withe against the proposed workflow, including withdrawal, ownership and export, before claiming differentiation.
- A pilot has an agreed measurable outcome, such as the share of opted-in contacts assigned and actioned within two working days. Establish the employer's baseline first.
- The buyer can explain why the existing product or a simple ATS form fails that outcome.

Stop or change direction if interviews show that tools already solve the problem and the real barrier is staff discipline, employer procurement, or candidate interest. A managed setup/training service may then be a better first offer than new software.

## 10. Pricing and growth scenarios

These are experiment proposals and arithmetic, not forecasts or market valuations. Competitors range from an inexpensive German event pass to much larger recruiting-platform offers; price alone is therefore a weak strategy.

Possible initial offer: **€99 per employer event** for a limited, clearly defined campaign, or **€299 including hands-on setup and post-event workflow review**. Define campaign duration, retention, messages, support and seat limits before quoting. Test whether the workflow outcome supports those prices. Never claim these are observed willingness-to-pay levels.

| Scenario | Assumptions | Revenue before all costs |
| --- | --- | --- |
| First pilot cohort | 5 employers × €99 × 1 event | €495 event revenue |
| Small repeat business | 30 employers × 4 events/year × €99 | €11,880/year, not recurring monthly revenue |
| Service-assisted cohort | 20 employers × 4 events/year × €299 | €23,920/year including substantial service work |
| Later recurring offer, if justified | 50 employers × €49/month | €2,450 MRR / €29,400 annualized, with no assumed retention |

These figures expose a commercial constraint: occasional fairs can yield modest annual software revenue. A subscription requires recurring year-round value, not an annual contract pasted onto a seasonal need. Association renewals could provide a second market later, but it should not be treated as free cross-selling.

Illustrative pilot economics: €299 collected less €20 allocated delivery/infrastructure/payment costs and two onboarding/support hours valued internally at €60/hour leaves €159 before development, acquisition, tax and overhead. At €99 with the same workload, the result is negative. All input costs here are assumptions to replace with actuals. Founder time is part of cost.

Distribution proposal: begin with reachable employers and provide setup before one real fair. Use a measured case study to approach similar employers. Organizer distribution is attractive only after testing whether organizers will introduce, bundle, or buy the offer. Do not assume a viral network or a large paid-acquisition budget.

## 11. What would count as a usable demo and a customer product

A useful demo must show the full candidate/employer workflow with persistent data, separate users and honest delivery states. A static dashboard, simulated email success, or visual wallet preview does not meet that standard.

For a first real employer pilot, require: tenant isolation and access controls; a published campaign; real QR links; minimal data capture and explicit preference state; private candidate continuation; owner assignment; functioning export; a real email provider with suppression and retries; retention/deletion behavior; backups and a restore exercise; observable errors; deployed HTTPS; and an agreed support path.

If the agreed product includes wallet issuance, it additionally requires customer-appropriate issuer credentials, real Apple/Google installation on devices, an update after installation, honest credential/approval states, and a successful recovery test. Web-only mode must be explicitly labeled as such. It cannot silently satisfy a promised wallet product.

Acceptance criteria and proposed sequencing are prepared in `docs/product/proposed-pilot-and-acceptance.md`. They remain a proposal until the user chooses the direction.

## 12. Source register and remaining work

All linked pages were reviewed or discovered through their primary-source search content on 17 October 2026. No hands-on product verdict is implied. The direct product/pricing links in the competitor tables are the supporting source register for those rows. Additional technical and counter-evidence sources are linked next to the relevant claims.

Especially decision-changing sources:

- [EloCard recruiter offer](https://elocard.de/fuer-recruiter/): counters an inexpensive German job-fair capture gap.
- [Withe TalentSync](https://withe.co/product/talent-sync): counters employer-only, any-fair, deferred-CV and candidate-confirmation novelty claims.
- [Memberlytic standalone cards](https://memberlytic.com/digital-membership-cards): counters “wallet membership without replacing the current system” as an unserved market.
- [Passcreator publishing](https://www.passcreator.com/en/docs/building-passes/templates/publishing-changes): counters a general absence of draft/publish controls.
- [Passcreator individual update behavior](https://www.passcreator.com/en/docs/delivering/push/updating-a-single-pass): identifies a narrower operational boundary worth investigating.
- [Open-source fidelity audit](https://github.com/y2k-network/passkit): counters compatibility reporting as a novel compiler concept.
- [Apple issuer agreement](https://developer.apple.com/support/terms/apple-developer-program-license-agreement/): changes the hosted-issuer assumption in the attached plan.

Unresolved: user agreement on the product direction; actual employer pain and budgets; competitor trial results; candidate follow-through behavior; exact target countries/languages; repository confirmation if a repository other than the currently connected `Aminakzyzz/real-suits` is intended; issuer access; and deployment credentials.

**Recommendation:** use the user's customer access to validate the employer follow-through problem first. Keep the card architecture as a delivery mechanism. Do not present a generic wallet studio, a club pass builder, or low-cost QR recruiting capture as a clear unmet market gap on the evidence gathered.
