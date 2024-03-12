import { useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import styles from './styles.component.css';
import { Plane, DeviceOrientationControls, useTexture } from '@react-three/drei';

export function Setup({ cameraPosition = [0, 0, 1], controlsEnabled = false }) {
  return (
    <Canvas style={{ height: '100vh' }} camera={{ position: cameraPosition }} pixelRatio={window.devicePixelRatio}>
      <Model className={styles.model} controlsEnabled={controlsEnabled} />
    </Canvas>
  );
}

function Model({ controlsEnabled }) {
  const controls = useRef();
  const depthMaterial = useRef();
  const { viewport } = useThree();
  const texture = useTexture('./color-mountains.jpg');
  const depthMap = useTexture('./depth-mountains.png');

  useFrame((state) => {
    if (controls.current && controlsEnabled) {
      controls.current.update();
  
      // Amplify the device orientation feedback
      const sensitivityFactor = 2; // Adjust this factor as needed
      const amplifiedX = state.beta * sensitivityFactor;
      const amplifiedY = state.gamma * sensitivityFactor;
  
      // Use amplifiedX and amplifiedY to update the image position or rotation
      // Example:
      depthMaterial.current.uMouse = [amplifiedX * 5, amplifiedY * 5];
    } else {
      // Use original mouse tracking when device orientation controls are not active
      depthMaterial.current.uMouse = [state.mouse.x * 0.01, state.mouse.y * 0.01];
    }
  });

  return (
    <Plane args={[1, 1]} scale={[viewport.width, viewport.height, 1]}>
      <pseudo3DMaterial ref={depthMaterial} uImage={texture} uDepthMap={depthMap} />
      {controlsEnabled && <DeviceOrientationControls ref={controls} />}
    </Plane>
  );
}