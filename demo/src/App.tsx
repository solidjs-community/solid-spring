import {
  Component,
  createEffect,
  createMemo,
  createSignal,
  createComponent,
} from "solid-js";
import { createSpring, animated } from "solid-spring";
// console.log(createSpring({to: {x: 'h'}}));

function ChainExample() {
  const styles = createSpring({
    loop: true,
    to: [
      { opacity: 1, color: '#ffaaee' },
      { opacity: 0, color: 'rgb(14,26,19)' },
    ],
    from: { opacity: 0, color: 'red' },
  })
  console.log(styles()[0])

  return <animated.div style={styles()[0]}>I will fade in and out</animated.div>
}

const App: Component = () => {

  return (
    <ChainExample />
  );
};

// console.log(createComponent(() => <h1>hello</h1>, {}));

export default App;
