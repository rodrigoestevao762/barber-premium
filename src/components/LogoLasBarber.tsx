import React from "react";
import Image from "next/image";

interface LogoLasBarberProps {
  size?: number;
  className?: string;
  color?: string;
  variant?: "horizontal" | "emblem" | "monogram";
}

export const LogoLasBarber: React.FC<LogoLasBarberProps> = ({
  size = 48,
  className = "",
  variant = "horizontal",
}) => {
  // Se for emblem ou monogram: exibe o logo oficial com acabamento ouro e sombra
  if (variant === "monogram" || variant === "emblem") {
    return (
      <div 
        className={`relative inline-flex items-center justify-center shrink-0 rounded-2xl overflow-hidden select-none ${className}`}
        style={{ width: size, height: size }}
      >
        <Image
          src="/brand/logo-square-512.png"
          alt="LAS Barber Studio"
          width={size}
          height={size}
          priority
          className="object-cover w-full h-full drop-shadow-[0_4px_16px_rgba(223,186,115,0.25)]"
        />
      </div>
    );
  }

  // Se for horizontal (navbar, header, footer):
  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      <div 
        className="relative inline-flex items-center justify-center shrink-0 rounded-xl overflow-hidden shadow-md shadow-black/50 border border-[#DFBA73]/30"
        style={{ width: size, height: size }}
      >
        <Image
          src="/brand/logo-square-512.png"
          alt="LAS Barber Studio"
          width={size}
          height={size}
          priority
          className="object-cover w-full h-full"
        />
      </div>
      <div className="flex flex-col text-left justify-center">
        <span className="text-base sm:text-lg md:text-xl font-serif tracking-[0.22em] text-white uppercase font-bold leading-tight group-hover:text-[#F5D799] transition-colors">
          LAS BARBER STUDIO
        </span>
        <span className="text-[9px] md:text-[10px] font-mono tracking-[0.32em] text-[#DFBA73] uppercase font-bold leading-tight mt-0.5">
          BY LUCAS AUGUSTO
        </span>
      </div>
    </div>
  );
};

export default LogoLasBarber;
