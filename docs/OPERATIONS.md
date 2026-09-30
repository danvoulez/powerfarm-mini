# Operations Runbook

## Local operation

```bash
npm run migrate
npm run seed
npm run dev
```

Run the Continuity worker separately when you want asynchronous execution:

```bash
npm run worker
```

The server can also execute one ready item explicitly through the UI, CLI, or API.

## Environment

| Variable | Default | Purpose |
|---|---|---|
| `POWERFARM_HOST` | `127.0.0.1` | HTTP bind address |
| `POWERFARM_PORT` | `4545` | HTTP port |
| `POWERFARM_DB` | `./var/powerfarm.db` | SQLite operational store |
| `POWERFARM_OBJECTS` | `./var/objects` | immutable content root |
| `POWERFARM_ADMIN_TOKEN` | local dev value | bootstrap administrator token |
| `POWERFARM_PUBLIC_URL` | derived local URL | OpenAPI server URL |

## Backup / institutional export

Use the institution export rather than copying only the database:

```bash
npm run export -- ./var/export
```

The bundle contains:

- ordered `acts.jsonl`;
- content metadata;
- immutable object bytes;
- exact canonical document bytes and hashes;
- export manifest.

## Rebuild

```bash
npm run replay -- ./var/export ./var/replayed.db ./var/replayed-objects
```

After replay, start a server against the rebuilt paths and run the integration suite or application-specific verification.

## Generated surfaces

After route/operation changes:

```bash
npm run generate
```

Generated files must not be edited manually.

## Verification

```bash
npm run verify
npm test
```

The integration suite creates isolated temporary databases and content stores.
