import {
  Component,
} from "solid-js";
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

const App: Component = () => {
  return (
    <ChainExample />
  );
};

export default App;
