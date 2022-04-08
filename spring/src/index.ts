export * from "./solid/createSprings";
export * from "./solid/createSpring";

import { AnimatedStyle } from "./AnimatedStyle";
import { applyAnimatedValues } from "./applyAnimatedValues";
import { createHost, WithAnimated } from "./createHost";
import { primitives } from "./primitives";

const host = createHost(primitives, {
  applyAnimatedValues,
  createAnimatedStyle: style => new AnimatedStyle(style),
  getComponentProps: ({ scrollTop, scrollLeft, ...props }: any) => props,
});

export const animated = host.animated as WithAnimated;
export { animated as a };
