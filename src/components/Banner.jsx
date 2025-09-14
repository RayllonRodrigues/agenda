import React from "react";
import banner from "../assets/banner.png"; // ✅ importa a imagem

export default function Banner() {
  return (
    <header className="relative w-full overflow-hidden rounded-2xl shadow mb-6">
      <img
        src={banner} // ✅ usa a imagem importada
        alt="Consultoria e agendamentos"
        className="w-full h-48 md:h-64 object-cover"
        loading="eager"
      />

      
    </header>
  );
}
