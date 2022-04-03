import { AnimatedValue } from "./animated"
import { FluidValue } from "./fluids"
import { AnimationConfig, PickEventFns, SpringProps } from "./utils"

const emptyArray: readonly any[] = []

/** An animation being executed by the frameloop */
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
