'use client'
import { useRef, useEffect, useState } from 'react'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { shaderMaterial, Plane, useTexture } from '@react-three/drei'
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
        <Model />
      </Canvas>
    </div>
  </>
)

function Model(props) {
  const depthMaterial = useRef()
  const texture = useTexture('./color-mountains.jpg')
  const depthMap = useTexture('./depth-mountains.png')
  const { viewport } = useThree()
  const [isGyroEnabled, setIsGyroEnabled] = useState(false) // Tracks if gyroscope is enabled

  const handleOrientation = (event) => {
    const { beta, gamma } = event // Extracting rotation around the X and Y axes
    if (beta !== null && gamma !== null) {
      const x = gamma * 0.01 // Left-to-right tilt
      const y = beta * 0.01 // Front-to-back tilt
      depthMaterial.current.uMouse = [x, -y]
      setIsGyroEnabled(true) // Indicate that gyro is now active
    }
  }

  useEffect(() => {
    const askPermission = async () => {
      // Check for DeviceOrientationEvent support
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        try {
          const permission = await DeviceOrientationEvent.requestPermission()
          if (permission === 'granted') {
            window.addEventListener(
              'deviceorientation',
              handleOrientation,
              true
            )
          } else {
            console.error('Gyroscope permission not granted.')
          }
        } catch (error) {
          console.error(
            'Error requesting device orientation permission:',
            error
          )
        }
      } else {
        // Automatically add listener if permissions are not needed (non-iOS 13+ devices)
        window.addEventListener('deviceorientation', handleOrientation, true)
      }
    }

    // Request permissions on mount
    askPermission()

    return () => {
      // Cleanup listener on unmount
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [])

  useFrame((state) => {
    // Fallback to mouse control if gyroscope is not active
    if (!isGyroEnabled) {
      depthMaterial.current.uMouse = [
        state.mouse.x * 0.01,
        state.mouse.y * 0.01,
      ]
    }
  })

  return (
    <Plane args={[1, 1]} scale={[viewport.width, viewport.height, 1]}>
      <pseudo3DMaterial
        ref={depthMaterial}
        uImage={texture}
        uDepthMap={depthMap}
      />
    </Plane>
  )
}

extend({
  Pseudo3DMaterial: shaderMaterial(
    { uMouse: [0, 0], uImage: null, uDepthMap: null },
    // Vertex shader
    `
    varying vec2 vUv;
    void main() {
      vec4 modelPosition = modelMatrix * vec4(position, 1.0);
      vec4 viewPosition = viewMatrix * modelPosition;
      vec4 projectionPosition = projectionMatrix * viewPosition;
      gl_Position = projectionPosition;
      vUv = uv;
    }`,
    // Fragment shader
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
    `
  ),
})
