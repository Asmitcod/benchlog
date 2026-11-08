import { RoundedBox } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'

function DrillModel() {
  const group = useRef<Group>(null)
  const elapsed = useRef(0)

  useFrame((_, delta) => {
    if (!group.current) return
    elapsed.current += delta
    group.current.rotation.y = Math.sin(elapsed.current * 0.32) * 0.22
    group.current.rotation.x = Math.sin(elapsed.current * 0.24) * 0.035
    group.current.position.y = Math.sin(elapsed.current * 0.7) * 0.045
  })

  return (
    <group ref={group} rotation={[0.06, -0.5, 0.02]} scale={1.04}>
      <mesh position={[0.18, 0.38, 0]}>
        <RoundedBox args={[1.42, 0.82, 0.74]} radius={0.17} smoothness={5}>
          <meshStandardMaterial color="#ce622f" roughness={0.32} metalness={0.16} />
        </RoundedBox>
      </mesh>
      <mesh position={[-0.58, 0.15, 0]} rotation={[0, 0, -0.19]}>
        <RoundedBox args={[0.42, 0.72, 0.62]} radius={0.14} smoothness={5}>
          <meshStandardMaterial color="#26332d" roughness={0.45} />
        </RoundedBox>
      </mesh>
      <mesh position={[-0.67, -0.36, 0]} rotation={[0, 0, 0.12]}>
        <RoundedBox args={[0.47, 0.39, 0.69]} radius={0.09} smoothness={4}>
          <meshStandardMaterial color="#e2aa43" roughness={0.35} metalness={0.16} />
        </RoundedBox>
      </mesh>
      <mesh position={[0.24, -0.23, 0]} rotation={[0, 0, -0.12]}>
        <RoundedBox args={[0.29, 0.53, 0.42]} radius={0.11} smoothness={4}>
          <meshStandardMaterial color="#d8c6a6" roughness={0.5} />
        </RoundedBox>
      </mesh>
      <mesh position={[0.24, -0.27, 0]}>
        <RoundedBox args={[0.31, 0.13, 0.44]} radius={0.045} smoothness={4}>
          <meshStandardMaterial color="#a29579" roughness={0.62} />
        </RoundedBox>
      </mesh>
      <mesh position={[1.0, 0.39, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.22, 0.22, 0.34, 24]} />
        <meshStandardMaterial color="#777a71" metalness={0.8} roughness={0.24} />
      </mesh>
      <mesh position={[1.27, 0.39, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.13, 0.18, 0.27, 20]} />
        <meshStandardMaterial color="#c2bca9" metalness={0.86} roughness={0.2} />
      </mesh>
      <mesh position={[1.48, 0.39, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.025, 0.035, 0.23, 12]} />
        <meshStandardMaterial color="#85887e" metalness={0.9} roughness={0.22} />
      </mesh>
      <mesh position={[0.05, 0.812, 0]}>
        <RoundedBox args={[0.32, 0.065, 0.18]} radius={0.025} smoothness={3}>
          <meshStandardMaterial color="#e8b44d" roughness={0.28} />
        </RoundedBox>
      </mesh>
      <mesh position={[-0.31, 0.36, 0.375]}>
        <boxGeometry args={[0.3, 0.1, 0.025]} />
        <meshStandardMaterial color="#e7ad4a" roughness={0.3} />
      </mesh>
      <mesh position={[-0.14, 0.38, 0.39]}>
        <boxGeometry args={[0.12, 0.045, 0.03]} />
        <meshStandardMaterial color="#f0ebdc" roughness={0.28} />
      </mesh>
    </group>
  )
}

export default function DrillScene() {
  return (
    <Canvas camera={{ position: [3.4, 2.3, 5], fov: 34 }} dpr={[1, 1.5]}>
      <ambientLight intensity={1.7} />
      <hemisphereLight args={['#fff5d9', '#4e594a', 1.4]} />
      <directionalLight position={[3, 5, 4]} intensity={3.1} castShadow />
      <pointLight position={[-3, 1.5, -2]} intensity={25} color="#c8e88b" />
      <DrillModel />
    </Canvas>
  )
}
