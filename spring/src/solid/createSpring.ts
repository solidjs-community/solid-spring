import { Accessor, createEffect, createMemo } from "solid-js";
import { SpringRef } from "../SpringRef";
import type { SpringRef as SpringRefType } from "../SpringRef";
import {
  ControllerUpdate,
  is,
  PickAnimated,
  Remap,
  SpringValues,
  Valid,
} from "../utils";
import { createSprings } from "./createSprings";

/**
 * The props that `useSpring` recognizes.
 */
export type CreateSpringProps<Props extends object = any> = unknown &
  PickAnimated<Props> extends infer State
  ? Remap<
      ControllerUpdate<State> & {
        /**
         * Used to access the imperative API.
         *
         * When defined, the render animation won't auto-start.
         */
        ref?: SpringRef<State>;
      }
    >
  : never;

export function createSpring<Props extends object>(
  props: () =>
    | (Props & Valid<Props, CreateSpringProps<Props>>)
    | CreateSpringProps
): Accessor<SpringValues<PickAnimated<Props>>[]> & {
  ref: SpringRefType<PickAnimated<Props>>;
};

export function createSpring<Props extends object>(
  props: (Props & Valid<Props, CreateSpringProps<Props>>) | CreateSpringProps
): Accessor<SpringValues<PickAnimated<Props>>[]> & {
  ref: SpringRefType<PickAnimated<Props>>;
};

export function createSpring(props: any): any {
  const fn: Accessor<any> = createMemo(is.fun(props) ? props : () => props);

  const springsFn = createSprings(1, fn);
  const springMemo = createMemo(() => {
    const [value] = springsFn();
    return value
  });

  return springMemo;
}
