"use client"

import { useEffect, useRef } from "react"

interface AnimatedShieldProps {
  width?: number
  height?: number
  className?: string
}

export function AnimatedShield({ width = 200, height = 200, className = "" }: AnimatedShieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height

    // Animation variables
    let animationFrameId: number
    let hue = 0
    const particles: Particle[] = []
    const particleCount = 50

    // Particle class
    class Particle {
      x: number
      y: number
      size: number
      speedX: number
      speedY: number
      color: string

      constructor() {
        this.x = width / 2
        this.y = height / 2
        this.size = Math.random() * 5 + 1
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 1 + 0.5
        this.speedX = Math.cos(angle) * speed
        this.speedY = Math.sin(angle) * speed
        this.color = `hsl(${hue}, 100%, 50%)`
      }

      update() {
        this.x += this.speedX
        this.y += this.speedY

        if (this.size > 0.2) this.size -= 0.05
      }

      draw() {
        ctx.fillStyle = this.color
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      particles.push(new Particle())
    }

    // Draw shield shape
    function drawShield() {
      // Shield base
      ctx.fillStyle = `hsla(${hue}, 100%, 50%, 0.1)`
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.8)`
      ctx.lineWidth = 2

      ctx.beginPath()
      ctx.moveTo(width / 2, height * 0.1)
      ctx.lineTo(width * 0.8, height * 0.25)
      ctx.lineTo(width * 0.8, height * 0.6)
      ctx.quadraticCurveTo(width / 2, height * 0.9, width * 0.2, height * 0.6)
      ctx.lineTo(width * 0.2, height * 0.25)
      ctx.closePath()

      ctx.fill()
      ctx.stroke()

      // Shield inner details
      ctx.strokeStyle = `hsla(${hue}, 100%, 70%, 0.4)`
      ctx.beginPath()
      ctx.moveTo(width / 2, height * 0.2)
      ctx.lineTo(width / 2, height * 0.7)
      ctx.stroke()

      ctx.beginPath()
      ctx.moveTo(width * 0.3, height * 0.35)
      ctx.lineTo(width * 0.7, height * 0.35)
      ctx.stroke()
    }

    // Animation loop
    function animate() {
      ctx.clearRect(0, 0, width, height)

      // Update hue
      hue = (hue + 0.5) % 360

      // Draw shield
      drawShield()

      // Update and draw particles
      for (let i = 0; i < particles.length; i++) {
        particles[i].update()
        particles[i].draw()

        if (particles[i].size <= 0.2) {
          particles.splice(i, 1)
          i--
          particles.push(new Particle())
        }
      }

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId)
    }
  }, [width, height])

  return <canvas ref={canvasRef} width={width} height={height} className={className} style={{ maxWidth: "100%" }} />
}
