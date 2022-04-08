import { createInterpolator } from "./createInterpolator";
import { FluidValue, getFluidValue } from "./fluids";
import type { OpaqueAnimation } from "./FrameLoop";
import { InterpolatorArgs, InterpolatorConfig } from "./Interpolation";
import { normalizeColor } from "./normalizeColor";
import { raf } from "./rafz";
import { cssVariableRegex, isSSR, noop, OneOrMore, Rafz } from "./utils";
import {colors as _colors} from './colors'

// Covers color names (transparent, blue, etc.)
let namedColorRegex: RegExp;
// Covers rgb, rgba, hsl, hsla
// Taken from https://gist.github.com/olmokramer/82ccce673f86db7cda5e
export const colorRegex =
  /(#(?:[0-9a-f]{2}){2,4}|(#[0-9a-f]{3})|(rgb|hsl)a?\((-?\d+%?[,\s]+){2,3}\s*[\d\.]+%?\))/gi;

export const numberRegex = /[+\-]?(?:0|[1-9]\d*)(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;

// Gets numbers with units when specified
export const unitRegex = new RegExp(`(${numberRegex.source})(%|[a-z]+)`, "i");

// get values of rgba string
export const rgbaRegex =
  /rgba\(([0-9\.-]+), ([0-9\.-]+), ([0-9\.-]+), ([0-9\.-]+)\)/gi;

// rgba requires that the r,g,b are integers.... so we want to round them,
// but we *dont* want to round the opacity (4th column).
const rgbaRound = (_: any, p1: number, p2: number, p3: number, p4: number) =>
  `rgba(${Math.round(p1)}, ${Math.round(p2)}, ${Math.round(p3)}, ${p4})`;

//
// Required
//

/**
 * Supports string shapes by extracting numbers so new values can be computed,
 * and recombines those values into new strings of the same shape.  Supports
 * things like:
 *
 *     "rgba(123, 42, 99, 0.36)"           // colors
 *     "-45deg"                            // values with units
 *     "0 2px 2px 0px rgba(0, 0, 0, 0.12)" // CSS box-shadows
 *     "rotate(0deg) translate(2px, 3px)"  // CSS transforms
 */
export let createStringInterpolator = (
  config: InterpolatorConfig<string>
) => {
  if (!namedColorRegex)
    namedColorRegex = colors
      ? // match color names, ignore partial matches
        new RegExp(`(${Object.keys(colors).join("|")})(?!\\w)`, "g")
      : // never match
        /^\b$/;

  // Convert colors to rgba(...)
  const output = config.output.map((value) => {
    return getFluidValue(value)
      .replace(cssVariableRegex, variableToRgba)
      .replace(colorRegex, colorToRgba)
      .replace(namedColorRegex, colorToRgba);
  });

  // Convert ["1px 2px", "0px 0px"] into [[1, 2], [0, 0]]
  const keyframes = output.map((value) =>
    value.match(numberRegex)!.map(Number)
  );

  // Convert ["1px 2px", "0px 0px"] into [[1, 0], [2, 0]]
  const outputRanges = keyframes[0].map((_, i) =>
    keyframes.map((values) => {
      if (!(i in values)) {
        throw Error('The arity of each "output" value must be equal');
      }
      return values[i];
    })
  );

  // Create an interpolator for each animated number
  const interpolators = outputRanges.map((output) =>
    createInterpolator({ ...config, output })
  );

  // Use the first `output` as a template for each call
  return (input: number) => {
    // Convert numbers to units if available (allows for ["0", "100%"])
    const missingUnit =
      !unitRegex.test(output[0]) &&
      output.find((value) => unitRegex.test(value))?.replace(numberRegex, "");

    let i = 0;
    return output[0]
      .replace(
        numberRegex,
        () => `${interpolators[i++](input)}${missingUnit || ""}`
      )
      .replace(rgbaRegex, rgbaRound);
  };
};

//
// Optional
//

export let to: <In, Out>(
  source: OneOrMore<FluidValue>,
  args: InterpolatorArgs<In, Out>
) => FluidValue<Out>;

export let colors = _colors as { [key: string]: number } | null;

export let skipAnimation = false as boolean;

export let willAdvance: (animation: OpaqueAnimation) => void = noop;

//
// Configuration
//

export interface AnimatedGlobals {
  /** Returns a new `Interpolation` object */
  to?: typeof to;
  /** Used to measure frame length. Read more [here](https://developer.mozilla.org/en-US/docs/Web/API/Performance/now) */
  now?: typeof raf.now;
  /** Provide custom color names for interpolation */
  colors?: typeof colors;
  /** Make all animations instant and skip the frameloop entirely */
  skipAnimation?: typeof skipAnimation;
  /** Provide custom logic for string interpolation */
  createStringInterpolator?: typeof createStringInterpolator;
  /** Schedule a function to run on the next frame */
  requestAnimationFrame?: (cb: () => void) => void;
  /** Event props are called with `batchedUpdates` to reduce extraneous renders */
  batchedUpdates?: typeof raf.batchedUpdates;
  /** @internal Exposed for testing purposes */
  willAdvance?: typeof willAdvance;
  /** sets the global frameLoop setting for the global raf instance */
  frameLoop?: Rafz["frameLoop"];
}

export const assign = (globals: AnimatedGlobals) => {
  if (globals.to) to = globals.to;
  if (globals.now) raf.now = globals.now;
  if (globals.colors !== undefined) colors = globals.colors;
  if (globals.skipAnimation != null) skipAnimation = globals.skipAnimation;
  if (globals.createStringInterpolator)
    createStringInterpolator = globals.createStringInterpolator;
  if (globals.requestAnimationFrame) raf.use(globals.requestAnimationFrame);
  if (globals.batchedUpdates) raf.batchedUpdates = globals.batchedUpdates;
  if (globals.willAdvance) willAdvance = globals.willAdvance;
  if (globals.frameLoop) raf.frameLoop = globals.frameLoop;
};

export const variableToRgba = (input: string): string => {
  const [token, fallback] = parseCSSVariable(input);

  if (!token || isSSR()) {
    return input;
  }

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(token);

  if (value) {
    /**
     * We have a valid variable returned
     * trim and return
     */
    return value.trim();
  } else if (fallback && fallback.startsWith("--")) {
    /**
     * fallback is something like --my-variable
     * so we try get property value
     */
    const value = window
      .getComputedStyle(document.documentElement)
      .getPropertyValue(fallback);

    /**
     * if it exists, return else nothing was found so just return the input
     */
    if (value) {
      return value;
    } else {
      return input;
    }
  } else if (fallback && cssVariableRegex.test(fallback)) {
    /**
     * We have a fallback and it's another CSS variable
     */
    return variableToRgba(fallback);
  } else if (fallback) {
    /**
     * We have a fallback and it's not a CSS variable
     */
    return fallback;
  }

  /**
   * Nothing worked so just return the input
   * like our other FluidValue replace functions do
   */
  return input;
};

const parseCSSVariable = (current: string) => {
  const match = cssVariableRegex.exec(current);
  if (!match) return [,];

  const [, token, fallback] = match;
  return [token, fallback];
};

export function colorToRgba(input: string) {
  let int32Color = normalizeColor(input);
  if (int32Color === null) return input;
  int32Color = int32Color || 0;
  let r = (int32Color & 0xff000000) >>> 24;
  let g = (int32Color & 0x00ff0000) >>> 16;
  let b = (int32Color & 0x0000ff00) >>> 8;
  let a = (int32Color & 0x000000ff) / 255;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
