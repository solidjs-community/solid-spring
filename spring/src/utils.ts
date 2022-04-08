import * as G from "./globals";
import { FluidValue, FluidProps, getFluidValue } from "./fluids";
import { Arrify, Constrain } from "./Interpolation";
import { SpringValue } from "./SpringValue";
import { Controller, ControllerQueue } from "./Controller";
import { SpringRef } from "./SpringRef";
import { AnimatedArray } from "./AnimatedArray";
import { AnimatedString } from "./AnimatedString";
import { AnimatedValue, getAnimated } from "./animated";
import { InferState } from "./runAsync";
import { Component } from "solid-js";

// types
export class Any {
  // @ts-ignore
  private _: never;
}

export type VelocityProp<T = any> = T extends ReadonlyArray<number | string>
  ? number[]
  : number;

/** The flush function that handles `start` calls */
export type ControllerFlushFn<T extends Controller<any> = Controller> = (
  ctrl: T,
  queue: ControllerQueue<InferState<T>>
) => AsyncResult<T>;

/** Override the property types of `A` with `B` and merge any new properties */
export type Merge<A, B> = Remap<
  { [P in keyof A]: P extends keyof B ? B[P] : A[P] } & Omit<B, keyof A>
>;

/**
 * Move all non-reserved props into the `to` prop.
 */
export type InferTo<T extends object> = Merge<
  { to: ForwardProps<T> },
  Pick<T, keyof T & keyof ReservedProps>
>;

/** Unwrap any `FluidValue` object types */
export type RawValues<T extends object> = {
  [P in keyof T]: T[P] extends FluidValue<infer U> ? U : T[P];
};

export type NonObject<T> =
  | Extract<T, string | number | ReadonlyArray<string | number>>
  | Exclude<T, object | void>

/** The promised result of an animation. */
export type AsyncResult<T extends Readable = any> = Promise<AnimationResult<T>>;

type IsType<U> = <T>(arg: T & any) => arg is Narrow<T, U>;
type Narrow<T, U> = [T] extends [Any] ? U : [T] extends [U] ? Extract<T, U> : U;

export interface Lookup<T = any> {
  [key: string]: T;
}

type PlainObject<T> = Exclude<T & Lookup, Function | readonly any[]>;

/**
 * This function updates animation state with the delta time.
 */
export type FrameUpdateFn = (dt: number) => boolean | void;

/**
 * Return true to be called again next frame.
 */
export type FrameFn = () => boolean | void;

type AnyFn = (...args: any[]) => any;
type VoidFn = (...args: any[]) => undefined | void;

/** Convert a union to an intersection */
type Intersect<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I
) => void
  ? I
  : never;

/** Intersect a union of objects but merge property types with _unions_ */
export type ObjectFromUnion<T extends object> = Remap<
  {
    [P in keyof Intersect<T>]: T extends infer U
      ? P extends keyof U
        ? U[P]
        : never
      : never;
  }
>;

/** Ensure the given type is an object type */
export type ObjectType<T> = T extends object ? T : {};

/** The phases of a `useTransition` item */
export type TransitionKey = "initial" | "enter" | "update" | "leave";

/**
 * Extract a union of animated values from a set of `useTransition` props.
 */
export type TransitionValues<Props extends object> = unknown &
  ForwardProps<
    ObjectFromUnion<
      Constrain<
        ObjectType<
          Props[TransitionKey & keyof Props] extends infer T
            ? T extends ReadonlyArray<infer Element>
              ? Element
              : T extends (...args: any[]) => infer Return
              ? Return extends ReadonlyArray<infer ReturnElement>
                ? ReturnElement
                : Return
              : T
            : never
        >,
        {}
      >
    >
  >;

/**
 * Pick the values of the `to` prop. Forward props are *not* included.
 */
type ToValues<Props extends object, AndForward = true> = unknown &
  (AndForward extends true ? ForwardProps<Props> : unknown) &
  (Props extends { to?: any }
    ? Exclude<Props["to"], Function | ReadonlyArray<any>> extends infer To
      ? ForwardProps<[To] extends [object] ? To : Partial<Extract<To, object>>>
      : never
    : unknown);

/**
 * Pick the properties of these object props...
 *
 *     "to", "from", "initial", "enter", "update", "leave"
 *
 * ...as well as any forward props.
 */
export type PickAnimated<Props extends object, Fwd = true> = unknown &
  ([Props] extends [Any]
    ? Lookup // Preserve "any" instead of resolving to "{}"
    : [object] extends [Props]
    ? Lookup
    : ObjectFromUnion<
        Props extends { from: infer From } // extract prop from the `from` prop if it exists
          ? From extends () => any
            ? ReturnType<From>
            : ObjectType<From>
          : TransitionKey & keyof Props extends never
          ? ToValues<Props, Fwd>
          : TransitionValues<Props>
      >);

/** Return a union type of every key whose `T` value is incompatible with its `U` value */
type InvalidKeys<T, U> = {
  [P in keyof T & keyof U]: T[P] extends U[P] ? never : P
}[keyof T & keyof U]

/** Replace the type of each `P` property with `never` */
type NeverProps<T, P extends keyof T> = Remap<
  Pick<T, Exclude<keyof T, P>> & { [K in P]: never }
>

/** Replace the type of each `T` property with `never` (unless compatible with `U`) */
export type Valid<T, U> = NeverProps<T, InvalidKeys<T, U>>

export interface Timeout {
  time: number;
  handler: () => void;
  cancel: () => void;
}

export type Throttled<T extends VoidFn> = T & {
  handler: T;
  cancel: () => void;
};

export interface Rafz {
  (update: FrameUpdateFn): void;

  /**
   * How should the frameLoop run, when we call .advance or naturally?
   */
  frameLoop: "always" | "demand";

  /**
   * Prevent a queued `raf(...)` or `raf.write(...)` call.
   */
  cancel: (fn: AnyFn) => void;

  /**
   * To avoid performance issues, all mutations are batched with this function.
   * If the update loop is dormant, it will be started when you call this.
   */
  write: (fn: FrameFn) => void;

  /**
   * Run a function before updates are flushed.
   */
  onStart: (fn: FrameFn) => void;

  /**
   * Run a function before writes are flushed.
   */
  onFrame: (fn: FrameFn) => void;

  /**
   * Run a function after writes are flushed.
   */
  onFinish: (fn: FrameFn) => void;

  /**
   * Run a function on the soonest frame after the given time has passed,
   * and before any updates on that particular frame.
   */
  setTimeout: (handler: () => void, ms: number) => Timeout;

  /**
   * Any function scheduled within the given callback is run immediately.
   * This escape hatch should only be used if you know what you're doing.
   */
  sync: (fn: () => void) => void;

  /**
   * Wrap a function so its execution is limited to once per frame. If called
   * more than once in a single frame, the last call's arguments are used.
   */
  throttle: <T extends VoidFn>(fn: T) => Throttled<T>;

  /**
   * Override the native `requestAnimationFrame` implementation.
   *
   * You must call this if your environment never defines
   * `window.requestAnimationFrame` for you.
   */
  use: <T extends NativeRaf>(impl: T) => T;

  /**
   * This is responsible for providing the current time,
   * which is used when calculating the elapsed time.
   *
   * It defaults to `performance.now` when it exists,
   * otherwise `Date.now` is used.
   */
  now: () => number;

  /**
   * For update batching in React. Does nothing by default.
   */
  batchedUpdates: (cb: () => void) => void;

  /**
   * The error handler used when a queued function throws.
   */
  catch: (error: Error) => void;

  /**
   * Manual advancement of the frameLoop, calls our update function
   * only if `.frameLoop === 'demand'`
   */
  advance: () => void;
}

export type EasingFunction = (t: number) => number;

export const config = {
  default: { tension: 170, friction: 26 },
  gentle: { tension: 120, friction: 14 },
  wobbly: { tension: 180, friction: 12 },
  stiff: { tension: 210, friction: 20 },
  slow: { tension: 280, friction: 60 },
  molasses: { tension: 280, friction: 120 },
} as const;

interface EasingDictionary {
  linear: (t: number) => number;
  easeInQuad: (t: number) => number;
  easeOutQuad: (t: number) => number;
  easeInOutQuad: (t: number) => number;
  easeInCubic: (t: number) => number;
  easeOutCubic: (t: number) => number;
  easeInOutCubic: (t: number) => number;
  easeInQuart: (t: number) => number;
  easeOutQuart: (t: number) => number;
  easeInOutQuart: (t: number) => number;
  easeInQuint: (t: number) => number;
  easeOutQuint: (t: number) => number;
  easeInOutQuint: (t: number) => number;
  easeInSine: (t: number) => number;
  easeOutSine: (t: number) => number;
  easeInOutSine: (t: number) => number;
  easeInExpo: (t: number) => number;
  easeOutExpo: (t: number) => number;
  easeInOutExpo: (t: number) => number;
  easeInCirc: (t: number) => number;
  easeOutCirc: (t: number) => number;
  easeInOutCirc: (t: number) => number;
  easeInBack: (t: number) => number;
  easeOutBack: (t: number) => number;
  easeInOutBack: (t: number) => number;
  easeInElastic: (t: number) => number;
  easeOutElastic: (t: number) => number;
  easeInOutElastic: (t: number) => number;
  easeInBounce: (t: number) => number;
  easeOutBounce: (t: number) => number;
  easeInOutBounce: (t: number) => number;
}

const c1 = 1.70158;
const c2 = c1 * 1.525;
const c3 = c1 + 1;
const c4 = (2 * Math.PI) / 3;
const c5 = (2 * Math.PI) / 4.5;

const bounceOut: EasingFunction = (x) => {
  const n1 = 7.5625;
  const d1 = 2.75;

  if (x < 1 / d1) {
    return n1 * x * x;
  } else if (x < 2 / d1) {
    return n1 * (x -= 1.5 / d1) * x + 0.75;
  } else if (x < 2.5 / d1) {
    return n1 * (x -= 2.25 / d1) * x + 0.9375;
  } else {
    return n1 * (x -= 2.625 / d1) * x + 0.984375;
  }
};

export const easings: EasingDictionary = {
  linear: (x) => x,
  easeInQuad: (x) => x * x,
  easeOutQuad: (x) => 1 - (1 - x) * (1 - x),
  easeInOutQuad: (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2),
  easeInCubic: (x) => x * x * x,
  easeOutCubic: (x) => 1 - Math.pow(1 - x, 3),
  easeInOutCubic: (x) =>
    x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2,
  easeInQuart: (x) => x * x * x * x,
  easeOutQuart: (x) => 1 - Math.pow(1 - x, 4),
  easeInOutQuart: (x) =>
    x < 0.5 ? 8 * x * x * x * x : 1 - Math.pow(-2 * x + 2, 4) / 2,
  easeInQuint: (x) => x * x * x * x * x,
  easeOutQuint: (x) => 1 - Math.pow(1 - x, 5),
  easeInOutQuint: (x) =>
    x < 0.5 ? 16 * x * x * x * x * x : 1 - Math.pow(-2 * x + 2, 5) / 2,
  easeInSine: (x) => 1 - Math.cos((x * Math.PI) / 2),
  easeOutSine: (x) => Math.sin((x * Math.PI) / 2),
  easeInOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
  easeInExpo: (x) => (x === 0 ? 0 : Math.pow(2, 10 * x - 10)),
  easeOutExpo: (x) => (x === 1 ? 1 : 1 - Math.pow(2, -10 * x)),
  easeInOutExpo: (x) =>
    x === 0
      ? 0
      : x === 1
      ? 1
      : x < 0.5
      ? Math.pow(2, 20 * x - 10) / 2
      : (2 - Math.pow(2, -20 * x + 10)) / 2,
  easeInCirc: (x) => 1 - Math.sqrt(1 - Math.pow(x, 2)),
  easeOutCirc: (x) => Math.sqrt(1 - Math.pow(x - 1, 2)),
  easeInOutCirc: (x) =>
    x < 0.5
      ? (1 - Math.sqrt(1 - Math.pow(2 * x, 2))) / 2
      : (Math.sqrt(1 - Math.pow(-2 * x + 2, 2)) + 1) / 2,
  easeInBack: (x) => c3 * x * x * x - c1 * x * x,
  easeOutBack: (x) => 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2),
  easeInOutBack: (x) =>
    x < 0.5
      ? (Math.pow(2 * x, 2) * ((c2 + 1) * 2 * x - c2)) / 2
      : (Math.pow(2 * x - 2, 2) * ((c2 + 1) * (x * 2 - 2) + c2) + 2) / 2,
  easeInElastic: (x) =>
    x === 0
      ? 0
      : x === 1
      ? 1
      : -Math.pow(2, 10 * x - 10) * Math.sin((x * 10 - 10.75) * c4),
  easeOutElastic: (x) =>
    x === 0
      ? 0
      : x === 1
      ? 1
      : Math.pow(2, -10 * x) * Math.sin((x * 10 - 0.75) * c4) + 1,
  easeInOutElastic: (x) =>
    x === 0
      ? 0
      : x === 1
      ? 1
      : x < 0.5
      ? -(Math.pow(2, 20 * x - 10) * Math.sin((20 * x - 11.125) * c5)) / 2
      : (Math.pow(2, -20 * x + 10) * Math.sin((20 * x - 11.125) * c5)) / 2 + 1,
  easeInBounce: (x) => 1 - bounceOut(1 - x),
  easeOutBounce: bounceOut,
  easeInOutBounce: (x) =>
    x < 0.5 ? (1 - bounceOut(1 - 2 * x)) / 2 : (1 + bounceOut(2 * x - 1)) / 2,
} as const;

const defaults: any = {
  ...config.default,
  mass: 1,
  damping: 1,
  easing: easings.linear,
  clamp: false,
};

export class AnimationConfig {
  /**
   * With higher tension, the spring will resist bouncing and try harder to stop at its end value.
   *
   * When tension is zero, no animation occurs.
   */
  tension!: number;

  /**
   * The damping ratio coefficient, or just the damping ratio when `speed` is defined.
   *
   * When `speed` is defined, this value should be between 0 and 1.
   *
   * Higher friction means the spring will slow down faster.
   */
  friction!: number;

  /**
   * The natural frequency (in seconds), which dictates the number of bounces
   * per second when no damping exists.
   *
   * When defined, `tension` is derived from this, and `friction` is derived
   * from `tension` and `damping`.
   */
  frequency?: number;

  /**
   * The damping ratio, which dictates how the spring slows down.
   *
   * Set to `0` to never slow down. Set to `1` to slow down without bouncing.
   * Between `0` and `1` is for you to explore.
   *
   * Only works when `frequency` is defined.
   *
   * Defaults to 1
   */
  damping!: number;

  /**
   * Higher mass means more friction is required to slow down.
   *
   * Defaults to 1, which works fine most of the time.
   */
  mass!: number;

  /**
   * The initial velocity of one or more values.
   */
  velocity: number | number[] = 0;

  /**
   * The smallest velocity before the animation is considered "not moving".
   *
   * When undefined, `precision` is used instead.
   */
  restVelocity?: number;

  /**
   * The smallest distance from a value before that distance is essentially zero.
   *
   * This helps in deciding when a spring is "at rest". The spring must be within
   * this distance from its final value, and its velocity must be lower than this
   * value too (unless `restVelocity` is defined).
   */
  precision?: number;

  /**
   * For `duration` animations only. Note: The `duration` is not affected
   * by this property.
   *
   * Defaults to `0`, which means "start from the beginning".
   *
   * Setting to `1+` makes an immediate animation.
   *
   * Setting to `0.5` means "start from the middle of the easing function".
   *
   * Any number `>= 0` and `<= 1` makes sense here.
   */
  progress?: number;

  /**
   * Animation length in number of milliseconds.
   */
  duration?: number;

  /**
   * The animation curve. Only used when `duration` is defined.
   *
   * Defaults to quadratic ease-in-out.
   */
  easing!: EasingFunction;

  /**
   * Avoid overshooting by ending abruptly at the goal value.
   */
  clamp!: boolean;

  /**
   * When above zero, the spring will bounce instead of overshooting when
   * exceeding its goal value. Its velocity is multiplied by `-1 + bounce`
   * whenever its current value equals or exceeds its goal. For example,
   * setting `bounce` to `0.5` chops the velocity in half on each bounce,
   * in addition to any friction.
   */
  bounce?: number;

  /**
   * "Decay animations" decelerate without an explicit goal value.
   * Useful for scrolling animations.
   *
   * Use `true` for the default exponential decay factor (`0.998`).
   *
   * When a `number` between `0` and `1` is given, a lower number makes the
   * animation slow down faster. And setting to `1` would make an unending
   * animation.
   */
  decay?: boolean | number;

  /**
   * While animating, round to the nearest multiple of this number.
   * The `from` and `to` values are never rounded, as well as any value
   * passed to the `set` method of an animated value.
   */
  round?: number;

  constructor() {
    Object.assign(this, defaults);
  }
}

/** The object type of the `config` prop. */
export type SpringConfig = Partial<AnimationConfig>;

/**
 * For testing whether a type is an object but not an array.
 *
 *     T extends IsPlainObject<T> ? true : false
 *
 * When `any` is passed, the resolved type is `true | false`.
 */
export type IsPlainObject<T> = T extends ReadonlyArray<any>
  ? Any
  : T extends object
  ? object
  : Any;

export type StringKeys<T> = T extends IsPlainObject<T>
  ? string & keyof T
  : string;

export type OneOrMore<T> = T | readonly T[];

/** For props that can be set on a per-key basis. */
export type MatchProp<T> =
  | boolean
  | OneOrMore<StringKeys<T>>
  | ((key: StringKeys<T>) => boolean);

export interface AnimationProps<T = any> {
  /**
   * Configure the spring behavior for each key.
   */
  config?: SpringConfig | ((key: StringKeys<T>) => SpringConfig);
  /**
   * Milliseconds to wait before applying the other props.
   */
  delay?: number | ((key: StringKeys<T>) => number);
  /**
   * When true, props jump to their goal values instead of animating.
   */
  immediate?: MatchProp<T>;
  /**
   * Cancel all animations by using `true`, or some animations by using a key
   * or an array of keys.
   */
  cancel?: MatchProp<T>;
  /**
   * Pause all animations by using `true`, or some animations by using a key
   * or an array of keys.
   */
  pause?: MatchProp<T>;
  /**
   * Start the next animations at their values in the `from` prop.
   */
  reset?: MatchProp<T>;
  /**
   * Swap the `to` and `from` props.
   */
  reverse?: boolean;
  /**
   * Override the default props with this update.
   */
  default?: boolean | SpringProps<T>;
}

/** Intersected with other object types to allow for unknown properties */
export interface UnknownProps extends Lookup<unknown> {}

export type GoalValue<T> = T | FluidValue<T> | UnknownProps | null | undefined;

/** A set of values for a `Controller` to animate from/to. */
export type GoalValues<T extends Lookup> = FluidProps<T> extends infer Props
  ? { [P in keyof Props]?: Props[P] | null }
  : never;

export type Falsy = false | null | undefined;

/**
 * A value or set of values that can be animated from/to.
 *
 * The `T` parameter can be a set of animated values (as an object type)
 * or a primitive type for a single animated value.
 */
export type GoalProp<T> = [T] extends [IsPlainObject<T>]
  ? GoalValues<T> | Falsy
  : GoalValue<T>;

/** Try to simplify `&` out of an object type */
export type Remap<T> = {} & {
  [P in keyof T]: T[P];
};
/**
 * Where `to` is inferred from non-reserved props
 *
 * The `T` parameter can be a set of animated values (as an object type)
 * or a primitive type for a single animated value.
 */
export type InlineToProps<T = any> = Remap<GoalValues<T> & { to?: undefined }>;

type StartFn<T> = InferTarget<T> extends { start: infer T } ? T : never;
type StopFn<T> = InferTarget<T> extends { stop: infer T } ? T : never;
/**
 * An async function that can update or stop the animations of a spring.
 * Typically defined as the `to` prop.
 *
 * The `T` parameter can be a set of animated values (as an object type)
 * or a primitive type for a single animated value.
 */
export interface SpringToFn<T = any> {
  (start: StartFn<T>, stop: StopFn<T>): Promise<any> | void;
}

/**
 * Props for `Controller` methods and constructor.
 */
export interface ControllerProps<
  State extends Lookup = Lookup,
  Item = undefined
> extends AnimationProps<State> {
  ref?: SpringRef<State>;
  from?: GoalValues<State> | Falsy;
  // FIXME: Use "ControllerUpdate<T>" once type recursion is good enough.
  loop?: LoopProp<ControllerUpdate>;
  /**
   * Called when the # of animating values exceeds 0
   *
   * Also accepts an object for per-key events
   */
  onStart?:
    | OnStart<SpringValue<State>, Controller<State>, Item>
    | {
        [P in keyof State]?: OnStart<
          SpringValue<State[P]>,
          Controller<State>,
          Item
        >;
      };
  /**
   * Called when the # of animating values hits 0
   *
   * Also accepts an object for per-key events
   */
  onRest?:
    | OnRest<SpringValue<State>, Controller<State>, Item>
    | {
        [P in keyof State]?: OnRest<
          SpringValue<State[P]>,
          Controller<State>,
          Item
        >;
      };
  /**
   * Called once per frame when animations are active
   *
   * Also accepts an object for per-key events
   */
  onChange?:
    | OnChange<SpringValue<State>, Controller<State>, Item>
    | {
        [P in keyof State]?: OnChange<
          SpringValue<State[P]>,
          Controller<State>,
          Item
        >;
      };

  onPause?:
    | OnPause<SpringValue<State>, Controller<State>, Item>
    | {
        [P in keyof State]?: OnPause<
          SpringValue<State[P]>,
          Controller<State>,
          Item
        >;
      };
  onResume?:
    | OnResume<SpringValue<State>, Controller<State>, Item>
    | {
        [P in keyof State]?: OnResume<
          SpringValue<State[P]>,
          Controller<State>,
          Item
        >;
      };
  /**
   * Called after an animation is updated by new props.
   * Useful for manipulation
   *
   * Also accepts an object for per-key events
   */
  onProps?: OnProps<State> | { [P in keyof State]?: OnProps<State[P]> };
  /**
   * Called when the promise for this update is resolved.
   */
  onResolve?: OnResolve<SpringValue<State>, Controller<State>, Item>;
}

export type ControllerUpdate<
  State extends Lookup = Lookup,
  Item = undefined
> = unknown & ToProps<State> & ControllerProps<State, Item>;

/** A value that any `SpringValue` or `Controller` can animate to. */
export type SpringTo<T = any> =
  | ([T] extends [IsPlainObject<T>] ? never : T | FluidValue<T>)
  | SpringChain<T>
  | SpringToFn<T>
  | Falsy;

/** A serial queue of spring updates. */
export interface SpringChain<T = any>
  extends Array<
    [T] extends [IsPlainObject<T>]
      ? ControllerUpdate<T>
      : SpringTo<T> | SpringUpdate<T>
  > {}
/**
 * A union type of all possible `to` prop values.
 *
 * This is not recommended for function types. Instead, you should declare
 * an overload for each `to` type. See `SpringUpdateFn` for an example.
 *
 * The `T` parameter can be a set of animated values (as an object type)
 * or a primitive type for a single animated value.
 */
export type ToProps<T = any> =
  | { to?: GoalProp<T> | SpringToFn<T> | SpringChain<T> }
  | ([T] extends [IsPlainObject<T>] ? InlineToProps<T> : never);

export type SpringUpdate<T = any> = ToProps<T> & SpringProps<T>;

export type LoopProp<T extends object> = boolean | T | (() => boolean | T);

/** Event props can be customized per-key. */
export type EventProp<T> = T | Lookup<T | undefined>;

// Wrap a type with `SpringValue`
type SpringWrap<T> = [
  Exclude<T, FluidValue>,
  Extract<T, readonly any[]> // Arrays are animated.
] extends [object | void, never]
  ? never // Object literals cannot be animated.
  : SpringValue<Exclude<T, FluidValue | void>> | Extract<T, void>;

export type SpringValues<T extends Lookup = any> = [T] extends [Any]
  ? Lookup<SpringValue<unknown> | undefined> // Special case: "any"
  : { [P in keyof T]: SpringWrap<T[P]> };

export interface ReservedEventProps {
  onProps?: any;
  onStart?: any;
  onChange?: any;
  onPause?: any;
  onResume?: any;
  onRest?: any;
  onResolve?: any;
  onDestroyed?: any;
}
/** @internal */
export interface AnimationRange<T> {
  to: T | FluidValue<T> | undefined;
  from: T | FluidValue<T> | undefined;
}

/** @internal */
export type AnimationResolver<T extends Readable> = (
  result: AnimationResult<T> | AsyncResult<T>
) => void;

/** @internal */
export type PickEventFns<T> = {
  [P in Extract<keyof T, EventKey>]?: Extract<T[P], Function>;
};

/** @internal */
export type EventKey = Exclude<
  keyof ReservedEventProps,
  "onResolve" | "onDestroyed"
>;

/** @internal */
export interface AnimationTarget<T = any> extends Readable<T> {
  start(props: any): AsyncResult<this>;
  stop: Function;
  item?: unknown;
}

/** @internal */
export type InferTarget<T> = T extends object
  ? T extends ReadonlyArray<number | string>
    ? SpringValue<T>
    : Controller<T>
  : SpringValue<T>;

/** @internal */
export interface Readable<T = any> {
  get(): T;
}

/**
 * Called after an animation is updated by new props,
 * even if the animation remains idle.
 */
export type OnProps<T = unknown> = (
  props: Readonly<SpringProps<T>>,
  spring: SpringValue<T>
) => void;

/** The object given to the `onRest` prop and `start` promise. */
export interface AnimationResult<T extends Readable = any> {
  value: T extends Readable<infer U> ? U : never;
  /** When true, no animation ever started. */
  noop?: boolean;
  /** When true, the animation was neither cancelled nor stopped prematurely. */
  finished?: boolean;
  /** When true, the animation was cancelled before it could finish. */
  cancelled?: boolean;
}

type EventHandler<
  TResult extends Readable = any,
  TSource = unknown,
  Item = undefined
> = Item extends undefined
  ? (result: AnimationResult<TResult>, ctrl: TSource, item?: Item) => void
  : (result: AnimationResult<TResult>, ctrl: TSource, item: Item) => void;

/**
 * Called before the first frame of every animation.
 * From inside the `requestAnimationFrame` callback.
 */
export type OnStart<
  TResult extends Readable,
  TSource,
  Item = undefined
> = EventHandler<TResult, TSource, Item>;

/** Called when a `SpringValue` changes */
export type OnChange<
  TResult extends Readable,
  TSource,
  Item = undefined
> = EventHandler<TResult, TSource, Item>;

export type OnPause<
  TResult extends Readable,
  TSource,
  Item = undefined
> = EventHandler<TResult, TSource, Item>;

export type OnResume<
  TResult extends Readable,
  TSource,
  Item = undefined
> = EventHandler<TResult, TSource, Item>;

/** Called once the animation comes to a halt */
export type OnRest<
  TResult extends Readable,
  TSource,
  Item = undefined
> = EventHandler<TResult, TSource, Item>;

export type OnResolve<
  TResult extends Readable,
  TSource,
  Item = undefined
> = EventHandler<TResult, TSource, Item>;

/**
 * Use the `SpringUpdate` type if you need the `to` prop to exist.
 * For function types, prefer one overload per possible `to` prop
 * type (for better type inference).
 *
 * The `T` parameter can be a set of animated values (as an object type)
 * or a primitive type for a single animated value.
 */
export interface SpringProps<T = any> extends AnimationProps<T> {
  from?: GoalValue<T>;
  // FIXME: Use "SpringUpdate<T>" once type recursion is good enough.
  loop?: LoopProp<SpringUpdate>;
  /**
   * Called after an animation is updated by new props,
   * even if the animation remains idle.
   */
  onProps?: EventProp<OnProps<T>>;
  /**
   * Called when an animation moves for the first time.
   */
  onStart?: EventProp<OnStart<SpringValue<T>, SpringValue<T>>>;
  /**
   * Called when a spring has its value changed.
   */
  onChange?: EventProp<OnChange<SpringValue<T>, SpringValue<T>>>;
  onPause?: EventProp<OnPause<SpringValue<T>, SpringValue<T>>>;
  onResume?: EventProp<OnResume<SpringValue<T>, SpringValue<T>>>;
  /**
   * Called when all animations come to a stand-still.
   */
  onRest?: EventProp<OnRest<SpringValue<T>, SpringValue<T>>>;
}

export type NativeRaf = (cb: () => void) => void;

// funcs

export const is = {
  arr: Array.isArray as IsType<readonly any[]>,
  obj: <T extends any>(a: T & any): a is PlainObject<T> =>
    !!a && a.constructor.name === "Object",
  fun: ((a: unknown) => typeof a === "function") as IsType<Function>,
  str: (a: unknown): a is string => typeof a === "string",
  num: (a: unknown): a is number => typeof a === "number",
  und: (a: unknown): a is undefined => a === undefined,
};

export const defineHidden = (obj: any, key: any, value: any) =>
  Object.defineProperty(obj, key, {
    value,
    writable: true,
    configurable: true,
  });

export function noop() {}

/** Compare animatable values */
export function isEqual(a: any, b: any) {
  if (is.arr(a)) {
    if (!is.arr(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] !== b[i]) return false;
    }
    return true;
  }
  return a === b;
}

type EachFn<Value, Key, This> = (this: This, value: Value, key: Key) => void;
type Eachable<Value = any, Key = any, This = any> = {
  forEach(cb: EachFn<Value, Key, This>, ctx?: This): void;
};

/** Minifiable `.forEach` call */
export const each = <Value, Key, This>(
  obj: Eachable<Value, Key, This>,
  fn: EachFn<Value, Key, This>
) => obj.forEach(fn);

/** Iterate the properties of an object */
export function eachProp<T extends object, This>(
  obj: T,
  fn: (
    this: This,
    value: T extends any[] ? T[number] : T[keyof T],
    key: string
  ) => void,
  ctx?: This
) {
  if (is.arr(obj)) {
    for (let i = 0; i < obj.length; i++) {
      fn.call(ctx as any, obj[i] as any, `${i}`);
    }
    return;
  }
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      fn.call(ctx as any, obj[key] as any, key);
    }
  }
}

export const toArray = <T>(a: T): Arrify<Exclude<T, void>> =>
  is.und(a) ? [] : is.arr(a) ? (a as any) : [a];

/** Copy the `queue`, then iterate it after the `queue` is cleared */
export function flush<P, T>(
  queue: Map<P, T>,
  iterator: (entry: [P, T]) => void
): void;
export function flush<T>(queue: Set<T>, iterator: (value: T) => void): void;
export function flush(queue: any, iterator: any) {
  if (queue.size) {
    const items = Array.from(queue);
    queue.clear();
    each(items, iterator);
  }
}

/** Call every function in the queue with the same arguments. */
export const flushCalls = <T extends AnyFn>(
  queue: Set<T>,
  ...args: Parameters<T>
) => flush(queue, (fn) => fn(...args));

// For server-side rendering: https://github.com/react-spring/zustand/pull/34
// Deno support: https://github.com/pmndrs/zustand/issues/347

export const isSSR = () =>
  typeof window === "undefined" ||
  !window.navigator ||
  /ServerSideRendering|^Deno\//.test(window.navigator.userAgent);

export type AnyFnType<In extends ReadonlyArray<any> = any[], Out = any> = (
  ...args: In
) => Out;

export function callProp<T>(
  value: T,
  ...args: T extends AnyFn ? Parameters<T> : unknown[]
): T extends AnyFnType<any, infer U> ? U : T {
  return is.fun(value) ? value(...args) : value;
}

/** Try to coerce the given value into a boolean using the given key */
export const matchProp = (
  value: boolean | OneOrMore<string> | ((key: any) => boolean) | undefined,
  key: string | undefined
) =>
  value === true ||
  !!(
    key &&
    value &&
    (is.fun(value) ? value(key) : toArray(value).includes(key))
  );

export const resolveProp = <T>(
  prop: T | Lookup<T> | undefined,
  key: string | undefined
) => (is.obj(prop) ? key && (prop as any)[key] : prop);

export const concatFn = <T extends AnyFn>(first: T | undefined, last: T) =>
  first ? (...args: Parameters<T>) => (first(...args), last(...args)) : last;

/** Returns `true` if the given prop is having its default value set. */
export const hasDefaultProp = <T extends Lookup>(props: T, key: keyof T) =>
  !is.und(getDefaultProp(props, key));

/** Get the default value being set for the given `key` */
export const getDefaultProp = <T extends Lookup, P extends keyof T>(
  props: T,
  key: P
): T[P] =>
  props.default === true
    ? props[key]
    : props.default
    ? props.default[key]
    : undefined;

const noopTransform = (value: any) => value;

/**
 * Extract the default props from an update.
 *
 * When the `default` prop is falsy, this function still behaves as if
 * `default: true` was used. The `default` prop is always respected when
 * truthy.
 */
export const getDefaultProps = <T extends Lookup>(
  props: Lookup,
  transform: (value: any, key: string) => any = noopTransform
): T => {
  let keys: readonly string[] = DEFAULT_PROPS;
  if (props.default && props.default !== true) {
    props = props.default;
    keys = Object.keys(props);
  }
  const defaults: any = {};
  for (const key of keys) {
    const value = transform(props[key], key);
    if (!is.und(value)) {
      defaults[key] = value;
    }
  }
  return defaults;
};

/**
 * These props are implicitly used as defaults when defined in a
 * declarative update (eg: render-based) or any update with `default: true`.
 *
 * Use `default: {}` or `default: false` to opt-out of these implicit defaults
 * for any given update.
 *
 * Note: These are not the only props with default values. For example, the
 * `pause`, `cancel`, and `immediate` props. But those must be updated with
 * the object syntax (eg: `default: { immediate: true }`).
 */
export const DEFAULT_PROPS = [
  "config",
  "onProps",
  "onStart",
  "onChange",
  "onPause",
  "onResume",
  "onRest",
] as const;

// Compute the goal value, converting "red" to "rgba(255, 0, 0, 1)" in the process
export function computeGoal<T>(value: T | FluidValue<T>): T {
  value = getFluidValue(value);
  return is.arr(value)
    ? value.map(computeGoal)
    : isAnimatedString(value)
    ? (G.createStringInterpolator({
        range: [0, 1],
        output: [value, value] as any,
      })(1) as any)
    : value;
}

/**
 * Parse special CSS variable format into a CSS token and a fallback.
 *
 * ```
 * `var(--foo, #fff)` => [`--foo`, '#fff']
 * ```
 *
 */
export const cssVariableRegex =
  /var\((--[a-zA-Z0-9-_]+),? ?([a-zA-Z0-9 ()%#.,-]+)?\)/;
// Not all strings can be animated (eg: {display: "none"})
export function isAnimatedString(value: unknown): value is string {
  return (
    is.str(value) &&
    (value[0] == "#" ||
      /\d/.test(value) ||
      // Do not identify a CSS variable as an AnimatedString if its SSR
      (!isSSR() && cssVariableRegex.test(value)) ||
      value in (G.colors || {}))
  );
}

/**
 * Property names that are reserved for animation config
 */
export interface ReservedProps extends ReservedEventProps {
  config?: any;
  from?: any;
  to?: any;
  ref?: any;
  loop?: any;
  pause?: any;
  reset?: any;
  cancel?: any;
  reverse?: any;
  immediate?: any;
  default?: any;
  delay?: any;

  // Transition props
  items?: any;
  trail?: any;
  sort?: any;
  expires?: any;
  initial?: any;
  enter?: any;
  update?: any;
  leave?: any;
  children?: any;

  // Internal props
  keys?: any;
  callId?: any;
  parentId?: any;
}

/**
 * Extract the custom props that are treated like `to` values
 */
export type ForwardProps<T extends object> = RawValues<
  Omit<Constrain<T, {}>, keyof ReservedProps>
>;

const RESERVED_PROPS: {
  [key: string]: 1 | undefined;
} = {
  config: 1,
  from: 1,
  to: 1,
  ref: 1,
  loop: 1,
  reset: 1,
  pause: 1,
  cancel: 1,
  reverse: 1,
  immediate: 1,
  default: 1,
  delay: 1,
  onProps: 1,
  onStart: 1,
  onChange: 1,
  onPause: 1,
  onResume: 1,
  onRest: 1,
  onResolve: 1,

  // Transition props
  items: 1,
  trail: 1,
  sort: 1,
  expires: 1,
  initial: 1,
  enter: 1,
  update: 1,
  leave: 1,
  children: 1,
  onDestroyed: 1,

  // Internal props
  keys: 1,
  callId: 1,
  parentId: 1,
};

/**
 * Extract any properties whose keys are *not* reserved for customizing your
 * animations. All hooks use this function, which means `useTransition` props
 * are reserved for `useSpring` calls, etc.
 */
function getForwardProps<Props extends ReservedProps>(
  props: Props
): ForwardProps<Props> | undefined {
  const forward: any = {};

  let count = 0;
  eachProp(props, (value, prop) => {
    if (!RESERVED_PROPS[prop]) {
      forward[prop] = value;
      count++;
    }
  });

  if (count) {
    return forward;
  }
}

/**
 * Clone the given `props` and move all non-reserved props
 * into the `to` prop.
 */
export function inferTo<T extends object>(props: T): InferTo<T> {
  const to = getForwardProps(props);
  if (to) {
    const out: any = { to };
    eachProp(props, (val, key) => key in to || (out[key] = val));
    return out;
  }
  return { ...props } as any;
}

export function isAsyncTo(to: any) {
  return is.fun(to) || (is.arr(to) && is.obj(to[0]));
}

export type AnimatedType<T = any> = Function & {
  create: (
    from: any,
    goal?: any
  ) => T extends ReadonlyArray<number | string>
    ? AnimatedArray<T>
    : AnimatedValue<T>;
};

/** Return the `Animated` node constructor for a given value */
export function getAnimatedType(value: any): AnimatedType {
  const parentNode = getAnimated(value);
  return parentNode
    ? (parentNode.constructor as any)
    : is.arr(value)
    ? AnimatedArray
    : isAnimatedString(value)
    ? AnimatedString
    : AnimatedValue;
}

/** Detach `ctrl` from `ctrl.ref` and (optionally) the given `ref` */
export function detachRefs(ctrl: Controller, ref?: SpringRef) {
  ctrl.ref?.delete(ctrl)
  ref?.delete(ctrl)
}

/** Replace `ctrl.ref` with the given `ref` (if defined) */
export function replaceRef(ctrl: Controller, ref?: SpringRef) {
  if (ref && ctrl.ref !== ref) {
    ctrl.ref?.delete(ctrl)
    ref.add(ctrl)
    ctrl.ref = ref
  }
}
