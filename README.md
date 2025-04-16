## action-get-release

```bash
npm install action-get-release
```

#### Usage in github action

```yaml

```

#### Usage as a library

#### TODO

- write a little readme
- tests for parsing github versions

#### Development sanity

```bash
npx npm-packlist # check what is included in the NPM package
npm publish --dry-run # dry run publishing to NPM
```

"build:package": "rimraf ./build/ && tsc -p tsconfig.lib.json",
"build:action": "rimraf ./dist/ && ncc build ./action.ts --minify --out ./dist --target es2020",

```json
"@actions/cache": "^4.0.3",
    "@octokit/core": "^6.1.5",
    "@types/node": "^22.14.1",
    "toml": "^3.0.0",
    "yaml": "^2.7.1"

"@eslint/eslintrc": "^3.3.1",
    "@eslint/js": "^9.24.0",
    "@types/tmp": "^0.2.6",
    "@typescript-eslint/eslint-plugin": "^8.30.1",
    "@typescript-eslint/parser": "^8.30.1",
    "@vercel/ncc": "^0.38.3",
    "eslint": "^9.24.0",
    "globals": "^16.0.0",
    "jest": "^29.7.0",
    "prettier": "^3.5.3",
    "rimraf": "^6.0.1",
    "tmp": "^0.2.3",
    "tsup": "^8.4.0",
    "typescript": "^5.8.3",
    "typescript-eslint": "^8.30.1",
    "vitest": "^3.1.1"

// "@actions/cache": "^4.0.3",
// "@actions/tool-cache": "^2.0.2",
// "@octokit/core": "^6.1.5",
// "@types/node": "^22.14.1",
// "toml": "^3.0.0",

// "@eslint/eslintrc": "^3.3.1",
// "@eslint/js": "^9.24.0",
// "@types/tmp": "^0.2.6",
// "@typescript-eslint/eslint-plugin": "^8.30.1",
// "@typescript-eslint/parser": "^8.30.1",
// "@vercel/ncc": "^0.38.3",
// "eslint": "^9.24.0",
// "globals": "^16.0.0",
// "jest": "^29.7.0",
// "prettier": "^3.5.3",
// "rimraf": "^6.0.1",
// "tmp": "^0.2.3",
// "tsup": "^8.4.0",
// "typescript": "^5.8.3",
// "typescript-eslint": "^8.30.1",
// "vitest": "^3.1.1"
```
