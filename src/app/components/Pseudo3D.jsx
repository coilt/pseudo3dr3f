'use client'; 
import React, { useState, useCallback } from 'react';
import { Setup } from './setup';
import Accelerometer from './accelerometer';
import { extend } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';

export const Pseudo3D = () => {
  const [permissionGranted, setPermissionGranted] = useState(false);

  const handleSetPermissionGranted = useCallback((value) => {
    setPermissionGranted(value);
  }, [setPermissionGranted]);

  return (
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
      <Setup />
      <Accelerometer permissionGranted={permissionGranted} setPermissionGranted={handleSetPermissionGranted} />
    </div>
  );
};

// shader
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
    `
  ),
});