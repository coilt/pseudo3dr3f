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
  const [isMotionEnabled, setIsMotionEnabled] = useState(false)

  const handleDeviceMotion = (event) => {
    const { acceleration, rotationRate } = event
    if (acceleration && rotationRate) {
      const { x, y } = acceleration
      const { alpha, beta, gamma } = rotationRate
      depthMaterial.current.uMouse = [x * 0.01, y * 0.01]
      depthMaterial.current.uRotation = [alpha * 0.01, beta * 0.01, gamma * 0.01]
      setIsMotionEnabled(true)
    }
  }

  useEffect(() => {
    const requestPermission = async () => {
      try {
        const { DeviceMotionEvent, DeviceOrientationEvent } = window
        if (DeviceMotionEvent && DeviceOrientationEvent) {
          const motionPermission = await DeviceMotionEvent.requestPermission()
          const orientationPermission = await DeviceOrientationEvent.requestPermission()
          if (motionPermission === 'granted' && orientationPermission === 'granted') {
            window.addEventListener('devicemotion', handleDeviceMotion, true)
          } else {
            console.error('Motion sensor permission not granted.')
          }
        } else {
          console.error('Device motion and orientation events not supported.')
        }
      } catch (error) {
        console.error('Error requesting motion sensor permission:', error)
      }
    }

    requestPermission()

    return () => {
      window.removeEventListener('devicemotion', handleDeviceMotion, true)
    }
  }, [])

  useFrame((state) => {
    if (!isMotionEnabled) {
      depthMaterial.current.uMouse = [state.mouse.x * 0.01, state.mouse.y * 0.01]
      depthMaterial.current.uRotation = [0, 0, 0]
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
    { uMouse: [0, 0], uRotation: [0, 0, 0], uImage: null, uDepthMap: null },
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
    uniform vec3 uRotation;
    uniform sampler2D uImage;
    uniform sampler2D uDepthMap;
    varying vec2 vUv;

    vec4 linearTosRGB( in vec4 value ) {
      return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
    }

    void main() {
      vec4 depthDistortion = texture2D(uDepthMap, vUv);
      float parallaxMult = depthDistortion.r;
      vec2 parallax = uMouse * parallaxMult;
      vec2 rotatedUv = vUv;
      rotatedUv = rotatedUv - 0.5;
      float s = sin(uRotation.z);
      float c = cos(uRotation.z);
      rotatedUv = vec2(rotatedUv.x * c - rotatedUv.y * s, rotatedUv.x * s + rotatedUv.y * c);
      rotatedUv = rotatedUv + 0.5;
      vec4 original = texture2D(uImage, rotatedUv + parallax);
      gl_FragColor = linearTosRGB(original);
    }
    `
  ),
})