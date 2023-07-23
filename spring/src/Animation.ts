import { type AnimatedValue } from './animated'
import { type FluidValue } from './fluids'
import { AnimationConfig, type PickEventFns, type SpringProps } from './utils'

const emptyArray: readonly any[] = []

/** An animation being executed by the frameloop */
// eslint-disable-next-line @typescript-eslint/no-unsafe-declaration-merging
export class Animation<T = any> {
  changed = false
  values: readonly AnimatedValue[] = emptyArray
  toValues: readonly number[] | null = null
  fromValues: readonly number[] = emptyArray

  to!: T | FluidValue<T>
  from!: T | FluidValue<T>
  config = new AnimationConfig()
  immediate = false
}

export interface Animation<T> extends PickEventFns<SpringProps<T>> {}
