import * as yaml from "yaml";
import Handlebars, { HelperOptions } from "handlebars";
import { Architecture, Platform } from "action-get-release/platform";

interface SwitchHelperContext {
  _switch_value_?: unknown;
  _switch_matched_?: boolean;
  // any other properties from your template context:
  [key: string]: unknown;
}

// in your setup code
Handlebars.registerHelper(
  "switch",
  function (this: SwitchHelperContext, value, options): string {
    // stash the switch value & reset matched flag
    this._switch_value_ = value;
    this._switch_matched_ = false;
    // render inner blocks (case/default)
    const result = options.fn(this);
    delete this._switch_value_;
    delete this._switch_matched_;
    return result;
  },
);

Handlebars.registerHelper(
  "case",
  function (this: SwitchHelperContext, value, options): string | undefined {
    // if not already matched and this case matches, render it
    if (!this._switch_matched_ && value === this._switch_value_) {
      this._switch_matched_ = true;
      return options.fn(this);
    }
    // otherwise nothing
  },
);

Handlebars.registerHelper(
  "default",
  function (
    this: SwitchHelperContext,
    options: HelperOptions,
  ): string | undefined {
    // render only if no previous case matched
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
  function (_input: unknown, _prefix: unknown): string {
    const input: string = _input != null ? String(_input) : "";
    const prefix: string = _prefix != null ? String(_prefix) : "";

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
Handlebars.registerHelper("trim", function (_input: unknown): string {
  const input: string = _input != null ? String(_input) : "";
  return input.trim();
});

export function parseAssets(rawAssets: string): string[] {
  const yamlAssets = yaml.parse(rawAssets);
  console.log(yamlAssets);
  if (Array.isArray(yamlAssets)) {
    return yamlAssets;
  } else if (typeof yamlAssets === "string") {
    return [yamlAssets];
  } else {
    throw new Error(
      `invalid assets "${rawAssets}": must be either string or stringified YAML sequence`,
    );
  }
}

export type TemplateContext = {
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
};

export function templateAsset(
  assetTemplate: string,
  context: TemplateContext,
): string {
  const template = Handlebars.compile(assetTemplate);
  return template(context).trim();
}
