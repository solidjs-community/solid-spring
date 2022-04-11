export * from "./solid/createSprings";
export * from "./solid/createSpring";
export { config } from "./utils";

import { AnimatedStyle } from "./AnimatedStyle";
import { applyAnimatedValues } from "./applyAnimatedValues";
import { createHost, WithAnimated } from "./createHost";
import { Interpolation } from "./Interpolation";
import { primitives } from "./primitives";

const host = createHost(primitives, {
  applyAnimatedValues,
  createAnimatedStyle: (style) => new AnimatedStyle(style),
  getComponentProps: ({ scrollTop, scrollLeft, ...props }: any) => props,
});

export const animated = host.animated as WithAnimated;
export const to = (source: any, ...args: [any]) =>
  new Interpolation(source, args);
export { animated as a };
