import type { JSX } from 'solid-js'
import { type Animated } from './animated'
import { AnimatedObject as AnimatedObjectClass } from './AnimatedObject'
import { type FluidProps, type FluidValue } from './fluids'
import { is, type Lookup, eachProp, type Merge, type NonObject } from './utils'
import { type AnimatableComponent, withAnimated } from './withAnimated'

export interface HostConfig {
  /** Provide custom logic for native updates */
  applyAnimatedValues: (node: any, props: Lookup) => boolean | void
  /** Wrap the `style` prop with an animated node */
  createAnimatedStyle: (style: Lookup) => Animated
  /** Intercept props before they're passed to an animated component */
  getComponentProps: (props: Lookup) => typeof props
}
type Angle = number | string
type Length = number | string

type TransformProps = {
  transform?: string
  x?: Length
  y?: Length
  z?: Length
  translate?: Length | readonly [Length, Length]
  translateX?: Length
  translateY?: Length
  translateZ?: Length
  translate3d?: readonly [Length, Length, Length]
  rotate?: Angle
  rotateX?: Angle
  rotateY?: Angle
  rotateZ?: Angle
  rotate3d?: readonly [number, number, number, Angle]
  // Note: "string" is not really supported by "scale", but this lets us
  // spread React.CSSProperties into an animated style object.
  scale?: number | readonly [number, number] | string
  scaleX?: number
  scaleY?: number
  scaleZ?: number
  scale3d?: readonly [number, number, number]
  skew?: Angle | readonly [Angle, Angle]
  skewX?: Angle
  skewY?: Angle
  matrix?: readonly [number, number, number, number, number, number]
  matrix3d?: readonly [
    number, // a1
    number,
    number,
    number,
    number, // a2
    number,
    number,
    number,
    number, // a3
    number,
    number,
    number,
    number, // a4
    number,
    number,
    number,
  ]
}

type CSSProperties = JSX.IntrinsicElements['a']['style']
type StyleProps = Merge<CSSProperties, TransformProps>

// A stub type that gets replaced by @react-spring/web and others.
export type WithAnimated = ((Component: any) => any) & {
  // (Component: AnimatableComponent): any;
  [K in keyof JSX.IntrinsicElements]: (
    props: AnimatedProps<
      Merge<JSX.IntrinsicElements[K], { style?: StyleProps }>
    > &
      FluidProps<{
        scrollTop?: number
        scrollLeft?: number
      }>,
  ) => JSX.Element
}
/** The props of an `animated()` component */
export type AnimatedProps<Props extends object> = {
  [P in keyof Props]: P extends 'ref' | 'key' | 'children'
    ? Props[P]
    : AnimatedProp<Props[P]>
}
// The animated prop value of a React element
type AnimatedProp<T> = [T, T] extends [infer T, infer DT]
  ? [DT] extends [never]
    ? never
    : DT extends void
    ? undefined
    : DT extends string | number
    ? DT | AnimatedLeaf<T>
    : DT extends object
    ? [ValidStyleProps<DT>] extends [never]
      ? DT extends ReadonlyArray<any>
        ? AnimatedStyles<DT>
        : DT
      : AnimatedStyle<T>
    : DT | AnimatedLeaf<T>
  : never

// An animated object of style attributes
type AnimatedStyle<T> = [T, T] extends [infer T, infer DT]
  ? DT extends void
    ? undefined
    : [DT] extends [never]
    ? never
    : DT extends string | number
    ? DT | AnimatedLeaf<T>
    : DT extends object
    ? AnimatedObject<DT>
    : DT | AnimatedLeaf<T>
  : never

type AnimatedObject<T extends object> =
  | { [P in keyof T]: AnimatedStyle<T[P]> }
  | (T extends ReadonlyArray<number | string> ? FluidValue<Readonly<T>> : never)

// An animated array of style objects
type AnimatedStyles<T extends ReadonlyArray<any>> = {
  [P in keyof T]: [T[P]] extends [infer DT]
    ? DT extends object
      ? [ValidStyleProps<DT>] extends [never]
        ? DT extends ReadonlyArray<any>
          ? AnimatedStyles<DT>
          : DT
        : { [P in keyof DT]: AnimatedProp<DT[P]> }
      : DT
    : never
}
// An animated primitive (or an array of them)
type AnimatedLeaf<T> = NonObject<T> extends infer U
  ? [U] extends [never]
    ? never
    : FluidValue<U>
  : never

type StylePropKeys = keyof StyleProps

type ValidStyleProps<T extends object> = {
  [P in keyof T & StylePropKeys]: T[P] extends StyleProps[P] ? P : never
}[keyof T & StylePropKeys]

// For storing the animated version on the original component
const cacheKey = Symbol.for('AnimatedComponent')

export const createHost = (
  components: AnimatableComponent[] | Record<string, AnimatableComponent>,
  {
    applyAnimatedValues = () => false,
    createAnimatedStyle = (style) => new AnimatedObjectClass(style),
    getComponentProps = (props) => props,
  }: Partial<HostConfig> = {},
) => {
  const hostConfig: HostConfig = {
    applyAnimatedValues,
    createAnimatedStyle,
    getComponentProps,
  }

  const animated: any = (Component: any): any => {
    if (is.str(Component)) {
      Component =
        animated[Component] ||
        (animated[Component] = withAnimated(Component, hostConfig))
    } else {
      Component =
        Component[cacheKey] ||
        (Component[cacheKey] = withAnimated(Component, hostConfig))
    }

    return Component
  }

  eachProp(components, (Component, key) => {
    if (is.arr(components)) {
      key = Component
    }
    animated[key] = animated(Component)
  })

  return {
    animated,
  } as { animated: WithAnimated }
}
