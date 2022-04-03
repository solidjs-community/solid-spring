import {createHost} from '@react-spring/animated'
import type { Component } from "solid-js";

console.log(createHost)
const animated = { h1: "" };

const App: Component = () => {
  // const [flip, set] = useState(false);
  // const props = useSpring({
  //   to: { opacity: 1 },
  //   from: { opacity: 0 },
  //   reset: true,
  //   reverse: flip,
  //   delay: 200,
  //   onRest: () => set(!flip),
  // });

  // return <animated.h1 style={props}>hello</animated.h1>;
  return <h1 ref={(ref) => console.log(ref)} style={{ background: "red" }}>here</h1>;
};

export default App;
