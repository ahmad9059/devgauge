# Security Policy

## Reporting a vulnerability

Report suspected vulnerabilities privately. Do not open a public issue containing exploit details, credentials, cookies, authorization codes, or private account data.

Use [GitHub private vulnerability reporting](https://github.com/ahmad9059/devgauge/security/advisories/new) when it is enabled for this repository. If that option is unavailable, contact the maintainer through [their GitHub profile](https://github.com/ahmad9059) to request a private reporting channel. Keep the initial request free of sensitive technical details.

A useful report includes:

- The affected commit, application version, and Android version.
- A description of the vulnerability and its potential impact.
- Reproduction steps or a minimal proof of concept using test data.
- Relevant code locations and sanitized logs, if available.
- Whether the issue involves credentials, website sessions, storage, notifications, or network access.

Use accounts and devices you own or are authorized to test. Do not access another person's account or disclose their data to demonstrate a problem.

## Supported code

Security fixes are currently developed against the latest code on the repository's default branch. There is no separate long-term support policy for older preview builds. Update to the latest reviewed build when a fix is available.

Production distribution status and outstanding release checks are documented in the [README](README.md#overview) and [release-readiness checklist](docs/release/release-readiness.md).

## Handling reports

Maintainers will review reports, request additional information when necessary, and coordinate a fix and disclosure when the issue is confirmed. Response time depends on maintainer availability; no guaranteed response or remediation deadline is currently published.

Please allow time for investigation and remediation before publishing technical details. A confirmed vulnerability may result in an advisory with affected code, remediation instructions, and reporter credit when requested. This project does not currently offer a bug bounty program.

## Security model

DevGauge is a local-first Android application. It reads provider usage through first-party website sessions and an Antigravity OAuth integration.

- Connection metadata, usage snapshots, settings, and notification rules are stored in a SQLCipher-encrypted SQLite database.
- Credentials and the database encryption key use Expo SecureStore backed by Android Keystore.
- Website sessions use app-private persistent WebView storage. Cookies are separate from the SQLCipher database and are not covered by its encryption.
- Provider authentication and usage requests use HTTPS in the application transports.
- Website capture uses origin restrictions and bounded capture size and duration.
- Usage history is not sent to a DevGauge backend. The application does not include an analytics or advertising SDK.
- Notifications use generic lock-screen text by default. Users can choose more descriptive notification content.

The full data inventory is documented in [privacy-data-inventory.md](docs/release/privacy-data-inventory.md).

## Credentials and configuration

Never commit provider tokens, passwords, cookies, private signing keys, authorization callbacks, or real account captures. Keep local environment files and signing material outside version control.

`EXPO_PUBLIC_` environment values are embedded in the mobile bundle. They are visible to anyone who inspects the application and must not be used for confidential backend secrets. Installed-application OAuth client configuration does not make a mobile application a confidential OAuth client.

Do not log credentials or raw authentication responses. Use sanitized fixtures and diagnostic messages that exclude account identifiers and sensitive headers.

## Disconnect and deletion boundaries

Disconnecting removes the locally stored credential and cancels the connection's refresh and reminders. Usage-history deletion depends on the action: the Connectors screen preserves history, while the provider-detail confirmation deletes the connection and its history.

Deleting all local data removes application records, stored credentials, owned reminders, and the database encryption key. Browser or WebView authentication sessions may remain. Local deletion does not guarantee sign-out from provider websites or remote token revocation.

## Scope and limitations

Protection depends on Android's application sandbox, platform key storage, and the security of the user's device. A compromised or rooted device may expose runtime data or authenticated sessions.

Provider pages, identity services, account access policies, and remote revocation behavior are controlled by their respective providers. Report provider-service vulnerabilities to the provider. Report weaknesses in how DevGauge handles those services through the private reporting process above.
