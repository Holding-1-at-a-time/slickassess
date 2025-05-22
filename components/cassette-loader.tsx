"use client"

import { useEffect, useState } from "react"

interface CassetteLoaderProps {
  size?: "sm" | "md" | "lg"
}

export function CassetteLoader({ size = "md" }: CassetteLoaderProps) {
  const [dots, setDots] = useState(1)

  useEffect(() => {
    const interval = setInterval(() => {
      setDots((prev) => (prev % 3) + 1)
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Size configurations
  const sizeConfig = {
    sm: {
      containerClass: "min-h-[40px] w-[80px]",
      cassetteClass: "w-16 h-10",
      labelClass: "text-[8px]",
      reelClass: "w-4 h-4",
      reelInnerClass: "w-3 h-3",
      dotClass: "w-1 h-1",
      tapeClass: "h-0.5 w-4",
      textClass: "text-[6px] mt-1",
    },
    md: {
      containerClass: "min-h-[120px] w-full",
      cassetteClass: "w-48 h-30",
      labelClass: "text-sm",
      reelClass: "w-8 h-8",
      reelInnerClass: "w-6 h-6",
      dotClass: "w-1.5 h-1.5",
      tapeClass: "h-1 w-12",
      textClass: "text-sm mt-2",
    },
    lg: {
      containerClass: "min-h-[200px] w-full",
      cassetteClass: "w-64 h-40",
      labelClass: "text-base",
      reelClass: "w-10 h-10",
      reelInnerClass: "w-8 h-8",
      dotClass: "w-2 h-2",
      tapeClass: "h-1 w-16",
      textClass: "text-base mt-4",
    },
  }

  const config = sizeConfig[size]

  return (
    <div className={`flex flex-col items-center justify-center ${config.containerClass}`}>
      <div className={`relative ${config.cassetteClass} bg-black rounded-lg p-1 border-2 border-secondary`}>
        {/* Cassette body */}
        <div className="absolute inset-1 bg-[#1a1a1a] rounded border border-secondary">
          {/* Label */}
          <div className="absolute top-1 left-2 right-2 h-1/3 bg-[#00ae98]/20 border border-[#00ae98] flex items-center justify-center">
            <span className={`text-[#00ae98] font-bold ${config.labelClass} neon-text animate-cassette-flicker`}>
              LOADING{".".repeat(dots)}
            </span>
          </div>

          {/* Reels */}
          <div
            className={`absolute bottom-1 left-4 ${config.reelClass} rounded-full border-2 border-[#707070] flex items-center justify-center`}
          >
            <div
              className={`${config.reelInnerClass} rounded-full border border-dashed border-[#00ae98] animate-cassette-spin`}
            >
              <div
                className={`${config.dotClass} bg-[#00ae98] rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
              ></div>
            </div>
          </div>
          <div
            className={`absolute bottom-1 right-4 ${config.reelClass} rounded-full border-2 border-[#707070] flex items-center justify-center`}
          >
            <div
              className={`${config.reelInnerClass} rounded-full border border-dashed border-[#00ae98] animate-cassette-spin`}
              style={{ animationDirection: "reverse" }}
            >
              <div
                className={`${config.dotClass} bg-[#00ae98] rounded-full absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2`}
              ></div>
            </div>
          </div>

          {/* Tape window */}
          <div
            className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 ${config.tapeClass} bg-[#00ae98]/30 rounded neon-shadow`}
          ></div>
        </div>
      </div>
      {size !== "sm" && <p className={`text-[#00ae98] font-bold neon-text ${config.textClass}`}>LOADING</p>}
    </div>
  )
}
