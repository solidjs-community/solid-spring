/**
 * MIT License
 * Copyright (c) Alec Larson
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

/**
 * Extend this class for automatic TypeScript support when passing this
 * value to `fluids`-compatible libraries.
 */
const $get = Symbol.for('FluidValue.get')
const $observers = Symbol.for('FluidValue.observers')

/** Returns true if `arg` can be observed. */
export const hasFluidValue = (arg: any): arg is FluidValue =>
  Boolean(arg?.[$get])

/** An event sent to `FluidObserver` objects. */
export interface FluidEvent<T = any> {
  type: string
  parent: FluidValue<T>
}

/** Add the `FluidValue` type to every property. */
export type FluidProps<T> = T extends object
  ? { [P in keyof T]: T[P] | FluidValue<Exclude<T[P], void>> }
  : unknown

const setHidden = (target: any, key: any, value: any) =>
  Object.defineProperty(target, key, {
    value,
    writable: true,
    configurable: true,
  })

/** Define the getter called by `getFluidValue`. */
const setFluidGetter = (target: object, get: () => any) =>
  setHidden(target, $get, get)

/** An observer of `FluidValue` objects. */
export type FluidObserver<E extends FluidEvent = any> =
  | { eventObserved(event: E): void }
  | ((event: E) => void)

export abstract class FluidValue<T = any, E extends FluidEvent<T> = any> {
  // @ts-expect-error
  private [$get]: () => T
  private [$observers]?: Set<FluidObserver<E>>

  constructor(get?: () => T) {
    if (!get && !(get = this.get)) {
      throw Error('Unknown getter')
    }
    setFluidGetter(this, get)
  }

  /** Get the current value. */
  protected get?(): T
  /** Called after an observer is added. */
  protected observerAdded?(count: number, observer: FluidObserver<E>): void
  /** Called after an observer is removed. */
  protected observerRemoved?(count: number, observer: FluidObserver<E>): void
}

/**
 * Get the current value.
 * If `arg` is not observable, `arg` is returned.
 */
export const getFluidValue: GetFluidValue = (arg: any) =>
  arg?.[$get] ? arg[$get]() : arg

type GetFluidValue = <T, U = never>(
  target: T | FluidValue<U>,
) => Exclude<T, FluidValue> | U

/** Send an event to an observer. */
export function callFluidObserver<E extends FluidEvent>(
  observer: FluidObserver<E>,
  event: E,
): void

export function callFluidObserver(observer: any, event: FluidEvent) {
  if (observer.eventObserved) {
    observer.eventObserved(event)
  } else {
    observer(event)
  }
}

/** Send an event to all observers. */
export function callFluidObservers<E extends FluidEvent>(
  target: FluidValue<any, E>,
  event: E,
): void

export function callFluidObservers(target: object, event: FluidEvent): void

export function callFluidObservers(target: any, event: FluidEvent) {
  const observers: Set<FluidObserver> = target[$observers]
  if (observers) {
    observers.forEach((observer) => {
      callFluidObserver(observer, event)
    })
  }
}
type GetFluidObservers = {
  <E extends FluidEvent>(
    target: FluidValue<any, E>,
  ): ReadonlySet<FluidObserver<E>> | null
  (target: object): ReadonlySet<FluidObserver> | null
}

/** Observe a `fluids`-compatible object. */
export function addFluidObserver<T, E extends FluidEvent>(
  target: FluidValue<T, E>,
  observer: FluidObserver<E>,
): typeof observer

export function addFluidObserver<E extends FluidEvent>(
  target: object,
  observer: FluidObserver<E>,
): typeof observer

export function addFluidObserver(target: any, observer: FluidObserver) {
  if (target[$get]) {
    let observers: Set<FluidObserver> = target[$observers]
    if (!observers) {
      setHidden(target, $observers, (observers = new Set()))
    }
    if (!observers.has(observer)) {
      observers.add(observer)
      if (target.observerAdded) {
        target.observerAdded(observers.size, observer)
      }
    }
  }
  return observer
}

/** Stop observing a `fluids`-compatible object. */
export function removeFluidObserver<E extends FluidEvent>(
  target: FluidValue<any, E>,
  observer: FluidObserver<E>,
): void

export function removeFluidObserver<E extends FluidEvent>(
  target: object,
  observer: FluidObserver<E>,
): void

export function removeFluidObserver(target: any, observer: FluidObserver) {
  const observers: Set<FluidObserver> = target[$observers]
  if (observers && observers.has(observer)) {
    const count = observers.size - 1
    if (count) {
      observers.delete(observer)
    } else {
      target[$observers] = null
    }
    if (target.observerRemoved) {
      target.observerRemoved(count, observer)
    }
  }
}

/** Get the current observer set. Never mutate it directly! */
export const getFluidObservers: GetFluidObservers = (target: any) =>
  target[$observers] || null
