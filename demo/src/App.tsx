import {
  Component,
  createSignal,
} from "solid-js";
import { createSpring, animated, config } from "solid-spring";

function ChainExample() {
  const [flip, set] = createSignal(false);

  const styles = createSpring(() => {
    return {
      to: { opacity: 1 },
      from: { opacity: 0 },
      reset: true,
      reverse: flip(),
      delay: 200,
      config: config.molasses,
      onRest: () => {
        set(!flip());
      },
    };
  });

  return <animated.h1 style={styles()}>hello</animated.h1>;
}

const App: Component = () => {
  return <ChainExample />;
};

export default App;
