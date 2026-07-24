## action-get-release

[<img alt="test status" src="https://img.shields.io/github/actions/workflow/status/romnn/action-release-download/test.yaml?label=test">](https://github.com/romnn/action-release-download/actions/workflows/test.yaml)
[![npm version](https://img.shields.io/npm/v/action-get-release)](https://www.npmjs.com/package/action-get-release)

Download (and cache) GitHub release assets — as a GitHub Action or a Node library.

#### GitHub Action

```yaml
- uses: romnn/action-release-download@main
  with:
    repo: cli/cli
    version: v2.40.0 # or "latest"
    assets: gh_*_linux_amd64.tar.gz
```

Matched assets are extracted and added to `PATH`. `assets` accepts a glob, a
YAML list (to fetch several), or a template — see below.

#### Asset templates

Each pattern is rendered as a [Handlebars](https://handlebarsjs.com) template,
then matched against every asset name as a
[minimatch](https://github.com/isaacs/minimatch) glob. Available values:

| value                                                    | resolves to                                  |
| -------------------------------------------------------- | -------------------------------------------- |
| `{{release.tag}}`                                        | the release tag, e.g. `v2.40.0`              |
| `{{repo.owner}}` · `{{repo.name}}` · `{{repo.fullName}}` | `cli` · `cli` · `cli/cli`                    |
| `{{platform}}`                                           | `process.platform`: `linux` `darwin` `win32` |
| `{{arch}}`                                               | `process.arch`: `x64` `arm64` `arm`          |

Helpers: `{{stripPrefix release.tag "v"}}` → `2.40.0`, `{{trim x}}`, and
`{{#switch v}}{{#case "a"}}…{{/case}}{{#default}}…{{/default}}{{/switch}}` to
remap a value. `{{~ ~}}` trims surrounding whitespace so a multi-line template
folds into one line.

```yaml
# -> mytool-2.40.0-linux-x64.tar.gz  (tag v2.40.0 on linux/x64)
assets: mytool-{{stripPrefix release.tag "v"}}-{{platform}}-{{arch}}.tar.gz
```

`platform`/`arch` are Node's raw values, so remap them to a release's naming per
OS (Linux/x64 → `*cargo-*linux_amd64*`):

```yaml
- uses: romnn/action-release-download@main
  with:
    repo: romnn/cargo-feature-combinations
    expected-matching-asset-count: 2
    # prettier-ignore
    assets: |
      - >-
        *cargo-*
        {{~#switch platform ~}}
          {{~#case "win32"~}}windows{{~/case~}}
          {{~#default~}}{{~platform~}}{{~/default~}}
        {{~/switch~}}
        _
        {{~#switch arch ~}}
          {{~#case "x64"~}}amd64{{~/case~}}
          {{~#default~}}{{~arch~}}{{~/default~}}
        {{~/switch~}}
        *
```

**Matching** is glob-based (`*`, `?`, `[abc]`, `{a,b}`). Escape a metacharacter
with `\` to match it literally (`app\*.zip`), and wrap patterns beginning with
`*` or `{` in the `- >-` block form above — bare, YAML misreads them.

#### Library

```bash
npm install action-get-release
```

```ts
import { Repo } from "action-get-release";

const repo = new Repo({ repo: "cli/cli", token: process.env.GITHUB_TOKEN });
const release = await repo.getReleaseByTag("v2.40.0"); // or repo.getLatestRelease()
const dir = await release.downloadAsset("gh_2.40.0_linux_amd64.tar.gz");
```
