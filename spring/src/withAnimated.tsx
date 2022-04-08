import { Dynamic } from "solid-js/web";
import {
  children,
  createComponent,
  createRenderEffect,
  onCleanup,
} from "solid-js";
import { AnimatedObject } from "./AnimatedObject";
import { TreeContext } from "./context";
import { HostConfig } from "./createHost";
import {
  addFluidObserver,
  FluidEvent,
  FluidValue,
  removeFluidObserver,
} from "./fluids";
import { each } from "./utils";
import { raf } from "./rafz";

export type AnimatableComponent = string;

// Shout out to @Otonashi & @Alex Lohr: https://discord.com/channels/722131463138705510/817960620736380928/961505601039523880
export const withAnimated = (Component: string, host: HostConfig) => {
  return (props: any) => {
    const c = children(() =>
      createComponent(Dynamic, { component: Component, ...props })
    );
    const instanceRef: Element = c() as any;
    const [_props, deps] = getAnimatedState(props, host);

    const callback = () => {
      const didUpdate = instanceRef
        ? host.applyAnimatedValues(instanceRef, _props.getValue(true))
        : false;

      // Re-render the component when native updates fail.
      if (didUpdate === false) {
        // forceUpdate()
      }
    };

    const observer = new PropsObserver(callback, deps);

    createRenderEffect(() => {
      // Observe the latest dependencies.
      each(deps, (dep) => addFluidObserver(dep, observer));

      // if (lastObserver) {
      // each(observer.deps, (dep) => removeFluidObserver(dep, observer));
      // raf.cancel(observer.update);
      // }
    });
    callback();
    onCleanup(() => {
      each(observer.deps, (dep) => removeFluidObserver(dep, observer));
    });

    return c;
  };
};

class PropsObserver {
  constructor(readonly update: () => void, readonly deps: Set<FluidValue>) {}
  eventObserved(event: FluidEvent) {
    if (event.type == "change") {
      raf.write(this.update);
    }
  }
}

type AnimatedState = [props: AnimatedObject, dependencies: Set<FluidValue>];

function getAnimatedState(props: any, host: HostConfig): AnimatedState {
  const dependencies = new Set<FluidValue>();
  TreeContext.dependencies = dependencies;

  // Search the style for dependencies.
  if (props.style)
    props = {
      ...props,
      style: host.createAnimatedStyle(props.style),
    };

  // Search the props for dependencies.
  props = new AnimatedObject(props);

  TreeContext.dependencies = null;
  return [props, dependencies];
}
