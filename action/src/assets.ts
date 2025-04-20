import * as core from "@actions/core";
import * as yaml from "yaml";
import Handlebars, { type HelperOptions } from "handlebars";
import type { Architecture, Platform } from "action-get-release/platform";
import { minimatch } from "minimatch";
import { ensureString } from "./utils.js";

interface SwitchHelperContext {
  _switch_value_?: unknown;
  _switch_matched_?: boolean;
  // Any other properties from your template context:
  [key: string]: unknown;
}

// In your setup code
Handlebars.registerHelper(
  "switch",
  function(
    this: SwitchHelperContext,
    value: unknown,
    options: HelperOptions,
  ): string {
    // Stash the switch value & reset matched flag
    this._switch_value_ = value;
    this._switch_matched_ = false;
    // Render inner blocks (case/default)
    const result = options.fn(this);
    delete this._switch_value_;
    delete this._switch_matched_;
    return result;
  },
);

Handlebars.registerHelper(
  "case",
  function(
    this: SwitchHelperContext,
    value: unknown,
    options: HelperOptions,
  ): string | undefined {
    // If not already matched and this case matches, render it
    if (!this._switch_matched_ && value === this._switch_value_) {
      this._switch_matched_ = true;
      return options.fn(this);
    }
    // Otherwise nothing
  },
);

Handlebars.registerHelper(
  "default",
  function(
    this: SwitchHelperContext,
    options: HelperOptions,
  ): string | undefined {
    // Render only if no previous case matched
    if (!this._switch_matched_) {
      return options.fn(this);
    }
  },
);

/**
 * {{stripPrefix input prefix}}
 *
 * If `input` starts with `prefix`, returns the remainder of the string;
 * otherwise returns `input` unchanged.
 */
Handlebars.registerHelper(
  "stripPrefix",
  (_input: unknown, _prefix: unknown): string => {
    const input: string = ensureString(_input);
    const prefix: string = ensureString(_prefix);

    if (input.startsWith(prefix)) {
      return input.slice(prefix.length);
    }
    return input;
  },
);

/**
 * {{trim input }}
 *
 * Trim leading and trailing whitespace from `input`.
 */
Handlebars.registerHelper("trim", (_input: unknown): string => {
  const input = ensureString(_input);
  return input.trim();
});

export function parseAssets(rawAssets: string): string[] {
  const yamlAssets: unknown = yaml.parse(rawAssets);
  if (Array.isArray(yamlAssets)) {
    return yamlAssets.map((asset) => ensureString(asset));
  } else if (typeof yamlAssets === "string") {
    return [yamlAssets];
  }
  throw new Error(
    `invalid assets "${rawAssets}": must be either string or stringified YAML sequence`,
  );
}

export interface TemplateContext {
  release: {
    tag: string;
    id: string;
  };
  repo: {
    owner: string;
    name: string;
    fullName: string;
  };
  arch: Architecture;
  platform: Platform;
}

export function templateAsset(
  assetTemplate: string,
  context: TemplateContext,
): string {
  const template = Handlebars.compile(assetTemplate);
  return template(context).trim();
}

export function matchAssets<A extends { name: () => string }>(
  assets: A[],
  pattern: string,
): A[] {
  return assets.filter((asset) => {
    const matches = minimatch(asset.name(), pattern);
    core.debug(`"${pattern}" matches "${asset.name()}" = ${matches}`);
    return matches;
  });
}
