# API.md — Phase 0 で実機検証した ctx サービス (0.2.2-rc.5)

取得方法: `src/probe.js` (row `machines-hg-probe`) を lab profile で boot → 各 service のクラス名 + プロトタイプチェーンの公開メソッドを列挙。証跡: `~/.dsh/profiles/lab/.dsh-machines-probe.json` (2026-11-21 07:59 UTC)。

## inject 可能（lab, dsh-base + dsh-web-app 構成）

`export const inject = [...]` で宣言 → `apply(ctx)` で `ctx.<name>` が使える。

| service | ctor | 主なメソッド |
|---|---|---|
| `storageDomain` | DomainFacility | `open`, `get`, `closeAll` |
| `webServer` | WebServer | `register`, `registerUpgrade`, `registerFallback`, `match`, `port`, `host`, `getOrigin`, `readResource`, `tapIndex` |
| `tools` | ToolsService | `register`, `get`, `resolve`, `execute`, `guard`, `checkGuards`, `definitions`, `schemas`, `view`, `restrict`, `setExecutor` |
| `credentials` | LocalCredentialProvider | `resolve`, `set`, `unset`, `readRecord`, `listRecords`, `write`, `describeRecord`, `enqueue` |
| `sessionController` | SessionController | `create`, `prompt`, `follow`, `list`, `state`, `events`, `page`, `fork`, `cancel`, `control`, `rename`, `search`, `resolveAgent`, `wait`, `updateQueue`, `modelCatalog`, `selectModel`, `observeState`, `observeEvent`, `observeProjections`, `promote` |
| `agents` | AgentRegistry | `create`, `get`, `list`, `register`, `enter`, `resume`, `announce`, `runWithInitiator`, `turnBoundaryOf` |
| `agentPresets` | AgentPresetRegistry | `list`, `resolve`, `presetForSession`, `defaultId`, `select`, `acquireScope`, `composeFrom`, `composedPreset`, `mount`, `serviceFor` |
| `skills` | SkillRegistry | `list`, `collect`, `get`, `register`, `scopeId`, `snapshot`, `collectLayer` |
| `subagents` | SubagentRuntime | `startActivation`, `sendMessage`, `prompt`, `waitForTreeWork`, `interrupt`, `rootOf`, `namesOf` |
| `commands` | CommandRuntime | `register`, `execute`, `find`, `list`, `view`, `mintCommandId` |
| `attachments` | LocalAttachmentStore | `admitPromptContent`, `saveImage`, `readImage`, `validateImage`, `fileHostPath` |

## inject 不可（lab では存在しない）

- `remote` — `pending (waiting for service: remote)` で entry が activate しなかった。`ctx.remote` は client 側（Renderer）の概念で、host plugin には無い。**Dispatch は `sessionController` RPC (Typert) を remote の DSH web endpoint へ HTTP で投げる形にする**（`dsh-api-session-controller/lib/typert.remote-client.js` 参照）。
- `storage`, `sessions`, `sessionsList`, `httpClient` も同様に inject 必須かつ未提供（最初の probe で inject 宣言せず取得しようとして `cannot get property without inject` → inject 宣言したら remote で pend → 個別には切り分けていないが remote が確定で不在。残りは必要になった時に個別 inject で再検証）。

## 使い方メモ

- **Route 登録**: `ctx.webServer.register({kind:'exact'|'prefix', path, handler(req,res)})` → disposer を返す（dsh-a2a の `A2aRoutes` 参照）。
- **Domain**: `ctx.storageDomain` は `DomainFacility`。`open(name)` → domain (tables)。dsh-a2a は `openDomain(ctx.storageDomain)` で `defineDomain` spec と突き合わせていた — `dsh-storage-domain` の `defineDomain`/`domainTable` をコピーする（`research/dsh-a2a/src/server/store.ts`）。
- **Tool 登録**: `ctx.tools.register(def)` → disposer or void。plain object, `output.schema` は JSON Schema。**`required: true` on a property は activate を壊す**（skill `dsh-plain-tool-definition`）。
- **Credentials**: `ctx.credentials.resolve(envName)` → `{value}` | undefined; `set`/`unset` で保存。
- **Session**: `ctx.sessionController` は**ローカル**の controller。リモート DSH への dispatch はその DSH web の Typert HTTP エンドポイントへ直接投げる（認証は launch token / bearer）。

## 次にやること（Phase 1 への入力）

1. `domainTable` の引数型（zod schema）を `dsh-storage-domain/lib/index.js` で確認 → `src/store.js` の `machinesDomain` を書く。
2. `tools.register` の定義 shape を `dsh-tools` or dev-hg 実装（`packages/dsh-dev-hg/src/tool.js`）で再確認。
3. Typert remote client の wire format を `dsh-api-session-controller/lib/typert.remote-client.js` で読む（Phase 2）。
