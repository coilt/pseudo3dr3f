'use client'
import { useRef, useEffect, useState } from 'react'
import { Canvas, extend, useFrame, useThree } from '@react-three/fiber'
import { shaderMaterial, Plane, useTexture } from '@react-three/drei'
import styles from './styles.component.css'

function requestGyroscopePermissions() {
  if (
    typeof DeviceMotionEvent !== 'undefined' &&
    typeof DeviceMotionEvent.requestPermission === 'function'
  ) {
    DeviceMotionEvent.requestPermission()
      .then((response) => {
        if (response === 'granted') {
          console.log('DeviceMotion permissions granted')
          // Permission granted
        } else {
          console.log('DeviceMotion permissions denied')
          // Permission denied
        }
      })
      .catch(console.error)
  }

  if (
    typeof DeviceOrientationEvent !== 'undefined' &&
    typeof DeviceOrientationEvent.requestPermission === 'function'
  ) {
    DeviceOrientationEvent.requestPermission()
      .then((response) => {
        if (response === 'granted') {
          console.log('DeviceOrientation permissions granted')
          // Permission granted
        } else {
          console.log('DeviceOrientation permissions denied')
          // Permission denied
        }
      })
      .catch(console.error)
  }
}

export default function GyroscopeRequestButton() {
  const [permissionRequested, setPermissionRequested] = useState(false)

  useEffect(() => {
    const askPermission = async () => {
      if (
        typeof DeviceOrientationEvent !== 'undefined' &&
        typeof DeviceOrientationEvent.requestPermission === 'function'
      ) {
        // Request permission
        const permission = await DeviceOrientationEvent.requestPermission()
        if (permission === 'granted') {
          window.addEventListener('deviceorientation', handleOrientation, true)
        }
      } else {
        // Automatically add listener if permissions are not needed (non-iOS 13+ devices)
        window.addEventListener('deviceorientation', handleOrientation, true)
      }
    }

    askPermission()
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [])

  useEffect(() => {
    // Check if permissions are already granted (maybe add more sophisticated checks)
    setPermissionRequested(false)
  }, [])

  return (
    !permissionRequested && (
      <button
        onClick={() => {
          requestGyroscopePermissions()
          setPermissionRequested(true)
        }}
      >
        Enable Gyroscope
      </button>
    )
  )
}

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
  const [gyroActive, setGyroActive] = useState(false) // State to track gyroscope activity

  useEffect(() => {
    // Handle device orientation
    const handleOrientation = (event) => {
      const { beta, gamma } = event // Extracting rotation around the X and Y axes
      if (beta !== null && gamma !== null) {
        setGyroActive(true) // Gyroscope data is available and being used
        const x = gamma * 0.01 // Left-to-right tilt
        const y = beta * 0.01 // Front-to-back tilt
        depthMaterial.current.uMouse = [x, -y]
      }
    }

    window.addEventListener('deviceorientation', handleOrientation, true)

    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true)
    }
  }, [])

  useFrame((state) => {
    // Use mouse for tracking if gyroscope is not active
    if (!gyroActive) {
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
