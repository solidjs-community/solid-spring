
<h1 align="center">solid-spring</h1>
<h3 align="center">A port of react-spring, for SolidJS</h3>

`solid-spring` is a spring-physics first animation library for SolidJS based on react-spring/core.

> This an experimental project that was made to be submitted in hack.solidjs.com, feel free to create github ticket

The API looks like this:

```jsx
const styles = createSpring({
  from: {
    opacity: 0
  },
  to: {
    opacity: 1
  }
})

<animated.div style={styles()} />
```

The API is similar to what we have in react-spring, with small differences to make the library compatible with SolidJS


## Install

```shell
npm install solid-spring
```
## Examples

[Hello (opacity animation)](https://codesandbox.io/s/hello-qe3eq5?file=/index.tsx)
<br />
[Svg (animating svg elements)](https://codesandbox.io/s/svg-omnp4c?file=/index.tsx)
<br />
[Numbers (non style use case)](https://codesandbox.io/s/numbers-kbc57h?file=/index.tsx)

## API

### `createSpring`
> Turns values into animated-values.

```jsx
import { createSpring, animated } from "solid-spring";

function ChainExample() {
  const styles = createSpring({
    loop: true,
    to: [
      { opacity: 1, color: '#ffaaee' },
      { opacity: 0, color: 'rgb(14,26,19)' },
    ],
    from: { opacity: 0, color: 'red' },
  })

  return <animated.div style={styles()}>I will fade in and out</animated.div>
}
```
`createSpring` also takes a function in case you want to pass a reactive value as a style!
```jsx
const [disabled, setDisabled] = createSignal(false)

const styles = createSpring(() => ({
  pause: disabled(),
}))
```
### `createSprings`
> Creates multiple springs, each with its own config. Use it for static lists, etc.

Similar to `useSprings` in react-spring, It takes number or a function that returns a number (for reactivity) as the first argument, and a list of springs or a function that returns a spring as the second argument.

```jsx
function createSprings<Props extends CreateSpringsProps>(
  lengthFn: number | (() => number),
  props: Props[] & CreateSpringsProps<PickAnimated<Props>>[]
): Accessor<SpringValues<PickAnimated<Props>>[]> & {
  ref: SpringRefType<PickAnimated<Props>>;
};

function createSprings<Props extends CreateSpringsProps>(
  lengthFn: number | (() => number),
  props: (i: number, ctrl: Controller) => Props
): Accessor<SpringValues<PickAnimated<Props>>[]> & {
  ref: SpringRefType<PickAnimated<Props>>;
};
```
