# Completion audit — incomplete

Generated 2026-10-01 from all eight phase documents, master plan, execution/native logs, current gate output and actual Git history. **The original goal is not complete.** This report records delivered work and missing proof; its filename does not certify completion.

Branch `main`, audit head `ae066394f9eff99dfcfd8e038fc4adda46290a6f`; implementation changes are local commits. No push, merge to a remote branch, deployment or publication occurred. Diff from implementation baseline `54bf0f1`: **117 files, 6,008 insertions, 1,156 deletions** before this report. Reports themselves add documentation afterward. Device-test APK source is `0f84dfa`; later audit-head changes are documentation only.

## Phase status

| Phase | Result | Remaining requirement |
|---|---|---|
| 1 — Baseline | Source/artifact audit complete | Defined signed-in device/network baseline samples |
| 2 — Android size | Shrinking/profiles/reports implemented; 41.78 MiB phone | Physical install, installed/Play size, production AAB |
| 3 — Usage correctness | Implemented, meaningful regressions pass | Final native timezone/recovery matrix |
| 4 — Shared sync | Implemented, scoped cancellation/errors/retention | 20 cold + 20 warm samples/provider, call counts/RAM and live error matrix |
| 5 — Notifications | Scoped persisted settings, journal and reconciler implemented | Remaining native quiet/timezone/edited/deletion/power cases |
| 6 — Earned resets | Official contracts, typed model and labeled browser handoff | Account-bound direct transport, durable confirmed consumption and refreshed limits |
| 7 — Provider actions/UI | Functional controls, disabled/error states, reduced motion | Live cookie/account cleanup, latency and full TalkBack/layout matrix |
| 8 — Verification | Automated gates, artifact/dependency evidence, this audit | Native/live/production gates above; not closed |

## Implemented behavior

Normalization now distinguishes percent/ratio/remaining fields. Absolute reset times survive persistence/rendering; a coarse foreground clock updates age/countdowns without polling. Snapshot/connection/attempt persistence is atomic and guarded against replaced/disconnected accounts. The mounted sync runtime shares policy, deduplication, cancellation and outcomes; verified quota can commit before optional text, bridges/renderers are bounded, Antigravity discovery is cached and independent reads parallelized.

Notifications persist selected provider/account/window/cycle scopes and generic/detail choice, reconcile native intent acknowledgements, and recover failed/pending cancellation. Manual reminders require explicit timezone confirmation. Provider actions wire refresh/retry/reauthorize/disconnect; delete-all drains work, cancels owned reminders and removes the database file before its key. Native integration after committed usage is at `src/features/dashboard/sync-provider.tsx:367`; the root mounts notification handling at `app/_layout.tsx:75`.

Claude/Codex detail sections separate earned resets from ordinary countdowns. Availability remains unknown without verified account transport. The model at `src/features/connections/provider-reset.ts:19` does not establish a live read/consume client. No credit was spent or success fabricated. RESET-CONTRACTS.md explains the missing Android contract; a browser link does not fulfill direct redemption.

## Evidence and open work

QA-REPORT.md records 417 tests and exact verification scope. BASELINE.md records build checksums and same-ABI comparisons. NATIVE-QA-LOG.md includes the observed cold-route failure and successful native retest on the fixed artifact. Owner received the signed internal preview APK and will test with their account; owner account access is not workspace transport proof.

External requirements: supported authenticated Android redemption transport and eligible outcome verification; owner device/account results; production application ID/signing. Locally runnable native checks remain in progress. Public-release dependency review is unresolved, especially the router URI decoder. These are incomplete requirements, not waived acceptance criteria.

## Undo procedure and data limits

Do not revert automatically or reset the branch. Choose the concern, inspect its diff, then revert dependent changes first. The reverse chronological implementation map below is the safe starting order for code dependencies; documentation commits can be handled separately. Run source gates and rebuild after every chosen rollback. Preserve unrelated/user changes and current APKs.

Schema 3/4 are installed forward migrations. Never edit released migration 1/2 or assume a code revert downgrades schema. Cancel owned native reminders successfully before deleting intent journals/keys. An older APK must be tested against schema 4 or restored with a compatible encrypted database/key backup. Restore the whole matching backup only when appropriate; rolling back code does not restore deleted records or refund provider credits. Packaging rollback must restore durable app.config/profile settings and regenerate native configuration, not merely patch generated Gradle files.

## Actual commit map (reverse chronological)

| Commit | Concern |
|---|---|
| `ae066394f9eff99dfcfd8e038fc4adda46290a6f` | docs(qa): record device-test handoff and cold-route regression |
| `0f84dfab81eddd4514738c6265401358d28e6403` | fix(notifications): retain cold taps through startup redirect |
| `4e43effa5addb5b248114e13375c08590a967d33` | fix(notifications): respect retryable Android permission denial |
| `2a298d8421df69994fa87de17ef466fb5750c528` | fix(storage): remove database file before deleting encryption key |
| `09086c0389f45401eddae2e1b38caa53aee5859f` | docs(deps): review transitive advisories and compatible upgrade limits |
| `c8c20cd80f430074f3707fe243afc693f1a70fd1` | docs(privacy): disclose active transports notification detail and retained sign-in |
| `e69bc3c91143a7b9ccca52b36f7e53a6776a63c4` | docs(perf): record current compact phone and emulator candidates |
| `112a6573fa96ae81f91a6e41b2864e0f3ff07600` | docs(qa): record notification delivery native artifacts and remaining proof |
| `42535d2a0a22bb2748c6670077a6192239ef7427` | fix(ui): wrap large settings text and use timing-neutral reminder copy |
| `b72b004803208adf23d01f672edd7f0b48933cea` | test(sync): prove cancellation drains before database close |
| `cda318b44967aea40ec8e454bb20cd46db178caa` | docs(app): align mounted capabilities actions and release status |
| `aafc9c7c965288299b7d627130a3b0ef10e487b3` | feat(resets): model earned credits and label unsupported handoffs |
| `09ec62238873c64005d4903296ec1c224bf19dc6` | docs(resets): verify contracts and record native transport gaps |
| `fb86422ae93bc93a6d6af5932339c1a716e3bda2` | feat(provider): wire sync actions and scoped disconnect cleanup |
| `f87de41a849a2ccc4829d8e7adc96e75e5d7ea06` | feat(reminders): add manual fallback creation and timezone confirmation |
| `bac95708b2e5b9b72f7ab83c8fa6a28b8a0e78e5` | feat(notifications): persist scoped rules and reconcile committed usage |
| `5dcde2209546ff825a6cf0046333caad2ee13b48` | fix(reminders): journal native scheduling and recover interrupted operations |
| `044371391d54740e3afae777aa59bfc5b869ae8f` | docs(plan): record performance implementation and artifact evidence |
| `a102631bd10b40506866df6555485ec5d0ceab87` | chore(quality): resolve baseline lint warnings |
| `c056fcb1b8f88d47e966e24e935bdd1399eac1d4` | feat(notifications): add Android permissions channels and tap routing |
| `fe99c641019a275ef60cc7ba281339177470eaaa` | fix(alerts): scope thresholds by provider account window and cycle |
| `957e61a5df34fbad4ffccf1245420382b7c0471a` | fix(storage): record measured capture timing without fabricated zero durations |
| `15c0c0c272a0f50a9fff9edb07e9de7e07935d4b` | fix(storage): reconcile bounded usage-history retention |
| `267faebe8fedf5dcca713b654ab00c7dcb6489ed` | perf(sync): bound bridge capture and retire idle renderers |
| `722e0659d6fcbad07e81107288224abd4bef1d44` | perf(antigravity): cache discovery and parallelize independent reads |
| `a716c2eea63abff6c5bcdfef94671b060b5fd707` | perf(sync): commit verified quota without waiting for reset text |
| `d6d5244f29b34305d2e82eb9a5822061df74cc6d` | refactor(sync): centralize triggers deduplication and outcomes |
| `f190c26a882b3b02c17f5f795f6d7476e8a53c11` | fix(storage): serialize refresh writes and guard changed connections |
| `111ac747e2760b2161470e3cb753bda220f257be` | chore(perf): add reproducible Android artifact size budgets |
| `678bce9d95816824ae3809e5dff13ec454eb5396` | build(android): split compact phone and emulator artifacts |
| `742e08612177026521c1254d6ed61644706f5706` | build(android): enable reproducible release shrinking |
| `c8e54c8d829090f423e9cbd37c8555c9b48af541` | fix(reminders): require explicit reset timezone and show save errors |
| `c49d925154d4c08ff68cb8acd7da8264bdb749f6` | fix(usage): advance freshness and reset countdowns in foreground |
| `8922225d7837036acab61677d332a19a448fed03` | refactor(ui): separate production provider view types |
| `e0fbad5792470049541b1f840b01f2a37a7d5c02` | fix(resets): preserve absolute reset instants and source text |
| `8ce9f0f4db604d024b6ccfc1792f5c53c4d50cf6` | fix(storage): atomically persist session connections and snapshots |
| `4f2c77ffdd9112d83ee59a0ac103a1528af2d303` | fix(usage): normalize explicit percent and ratio units |
