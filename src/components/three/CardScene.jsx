import { useRef, useEffect, useState } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Environment, ContactShadows, RoundedBox } from '@react-three/drei'
import * as THREE from 'three'

/**
 * 3D Tappe card:
 *  - Drag → free rotation, stays in place when released
 *  - Front face is a CanvasTexture with a "Tappe" wordmark whose
 *    gradient (silver→grey) animates left-to-right
 */
function CardMesh({ texture }) {
  const groupRef = useRef()
  const bodyRef = useRef()
  const draggingRef = useRef(false)

  useEffect(() => {
    const onDown = () => {
      draggingRef.current = true
    }
    const onUp = () => {
      draggingRef.current = false
    }
    window.addEventListener('pointerdown', onDown)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointerdown', onDown)
      window.removeEventListener('pointerup', onUp)
    }
  }, [])

  useFrame((state, delta) => {
    if (!groupRef.current) return

    if (draggingRef.current) {
      const targetY = (state.pointer.x * Math.PI) / 4
      const targetX = (-state.pointer.y * Math.PI) / 8
      groupRef.current.rotation.y = THREE.MathUtils.damp(
        groupRef.current.rotation.y, targetY, 4, delta,
      )
      groupRef.current.rotation.x = THREE.MathUtils.damp(
        groupRef.current.rotation.x, targetX, 4, delta,
      )
    }
    // Released — card stays wherever the user left it (free movement)
  })

  return (
    <group ref={groupRef}>
      {/* Card body — ultra-thin matte plastic edge */}
      <RoundedBox
        ref={bodyRef}
        args={[3.4, 2.1, 0.05]}
        radius={0.1}
        smoothness={4}
        castShadow
      >
        <meshStandardMaterial
          color="#1a1a1a"
          metalness={0.1}
          roughness={0.7}
          envMapIntensity={0.15}
        />
      </RoundedBox>

      {/* Front face — animated "Tappe" wordmark, matte plastic card finish */}
      <mesh position={[0, 0, 0.026]}>
        <planeGeometry args={[3.3, 2.0]} />
        <meshStandardMaterial
          map={texture}
          transparent
          metalness={0.1}
          roughness={0.55}
          envMapIntensity={0.2}
        />
      </mesh>
    </group>
  )
}

/**
 * Animated canvas texture for the card face.
 * Black background + huge "Tappe" wordmark with a sliding silver→grey gradient.
 */
function useTappeTexture() {
  const [texture, setTexture] = useState(null)

  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 640
    const ctx = canvas.getContext('2d')

    const tex = new THREE.CanvasTexture(canvas)
    tex.colorSpace = THREE.SRGBColorSpace
    tex.anisotropy = 4
    setTexture(tex)

    let raf
    let t = 0
    const draw = () => {
      // Clear to transparent — only the wordmark is drawn
      ctx.clearRect(0, 0, 1024, 640)

      // "Tappe" wordmark — sliding silver→grey gradient
      ctx.font = 'bold 140px Inter, Arial, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const cx = 512
      const cy = 320 // exact center of the 1024×640 canvas

      // Shift the gradient band left-to-right
      const shift = (Math.sin(t * 1.5) + 1) / 2
      const tg = ctx.createLinearGradient(
        cx - 420 - 200 + shift * 400,
        cy,
        cx + 220 + 200 + shift * 400,
        cy,
      )
      tg.addColorStop(0.0, '#e5e5e5') // silver
      tg.addColorStop(0.5, '#a1a1aa') // mid grey
      tg.addColorStop(1.0, '#52525b') // dark grey

      // Moving shine highlight
      const shineP = (Math.sin(t * 2) + 1) / 2
      tg.addColorStop(Math.max(0, shineP - 0.07), 'rgba(255,255,255,0)')
      tg.addColorStop(Math.min(1, shineP), 'rgba(255,255,255,0.6)')
      tg.addColorStop(Math.min(1, shineP + 0.07), 'rgba(255,255,255,0)')

      ctx.fillStyle = tg
      ctx.fillText('Tappe', cx, cy)

      // NFC-style signal icon on the right side of the card, rotated 90° so
      // the arcs sweep left→right ("lying down") instead of bottom→top.
      const nfcX = 880
      const nfcY = 320
      const iconColor = '#a1a1aa'

      ctx.save()
      ctx.translate(nfcX, nfcY)
      ctx.rotate(Math.PI / 2) // lay the icon on its side, arcs opening leftward

      ctx.strokeStyle = iconColor
      ctx.fillStyle = iconColor
      ctx.lineCap = 'round'
      ctx.lineWidth = 7

      // Center dot
      ctx.beginPath()
      ctx.arc(0, -25, 5, 0, Math.PI * 2)
      ctx.fill()

      // Three arcs of increasing radius above the dot
      ;[20, 35, 50].forEach((r) => {
        ctx.beginPath()
        ctx.arc(0, -25, r, Math.PI * 1.22, Math.PI * 1.78)
        ctx.stroke()
      })

      ctx.restore()

      tex.needsUpdate = true
      t += 0.012
      raf = requestAnimationFrame(draw)
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      tex.dispose()
    }
  }, [])

  return texture
}

export default function CardScene({ className = '' }) {
  const texture = useTappeTexture()

  return (
    <div className={className} style={{ width: '100%', height: '100%' }}>
      <Canvas
        camera={{ position: [0, 0, 6], fov: 45 }}
        dpr={[1, 2]}
        style={{ background: 'transparent' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[4, 6, 6]} intensity={1.2} />
        <directionalLight position={[-4, -2, 3]} intensity={0.4} color="#a78bfa" />
        {texture && <CardMesh texture={texture} />}
        <ContactShadows position={[0, -1.4, 0]} opacity={0.4} blur={2.5} scale={10} />
        <Environment preset="city" />
      </Canvas>
    </div>
  )
}
