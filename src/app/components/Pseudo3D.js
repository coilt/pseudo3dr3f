'use client';
import { useRef } from 'react';
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial, Plane, useTexture } from '@react-three/drei';
import styles from './styles.component.css'


export const Pseudo3D = () => (
  <>
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'absolute',
        top: '0',
        bottom: '0',
        overflow: 'hidden',
      }}
    >
    <Canvas style={{ height: '100vh' }}>
      <Model className={styles.model} />
    </Canvas>
    </div>
  </>
)

function Model(props) {
  const depthMaterial = useRef()
  const texture = useTexture('./color-mountains.jpg')
  const depthMap = useTexture('./depth-mountains.png')
  const { viewport } = useThree()
  useFrame((state) => (depthMaterial.current.uMouse = [state.mouse.x * 0.01, state.mouse.y * 0.01]))
  return (
    <Plane args={[1, 1]} scale={[viewport.width, viewport.height, 1]}>
      <pseudo3DMaterial ref={depthMaterial} uImage={texture} uDepthMap={depthMap} />
    </Plane>
  )
}

extend({
  Pseudo3DMaterial: shaderMaterial(
    { uMouse: [0, 0], uImage: null, uDepthMap: null },
    `
    varying vec2 vUv;
    void main() {
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);
      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectionPosition = projectionMatrix * viewPosition;
      gl_Position = projectionPosition;
      vUv = uv;
    }`,
    `
    precision mediump float;

    uniform vec2 uMouse;
    uniform sampler2D uImage;
    uniform sampler2D uDepthMap;

    varying vec2 vUv;
  
    vec4 linearTosRGB( in vec4 value ) {
      return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
    }
    
    
    void main() {
       vec4 depthDistortion = texture2D(uDepthMap, vUv);
       float parallaxMult = depthDistortion.r;

       vec2 parallax = (uMouse) * parallaxMult;

       vec4 original = texture2D(uImage, (vUv + parallax));
       gl_FragColor = linearTosRGB(original);
    }
    `,
  ),
})