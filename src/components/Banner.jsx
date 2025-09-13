import React from "react";

export default function Banner() {
  const imgSrc = "/banner.png"; // coloque banner.png em /public

  return (
    <header className="relative w-full overflow-hidden rounded-2xl shadow mb-6">
      <img
        src={imgSrc}
        alt="Consultoria e agendamentos"
        className="w-full h-48 md:h-64 object-cover"
        loading="eager"
      />
      <div className="absolute inset-0 bg-black/35" />
      <div className="absolute inset-0 flex items-center">
        <div className="px-4 md:px-6">
          <h1 className="text-white text-2xl md:text-3xl font-bold drop-shadow">
            Agende sua consultoria
          </h1>
          <p className="text-white/90 text-sm md:text-base mt-1 drop-shadow">
            Informe seus dados e escolha um horário disponível.
          </p>
        </div>
      </div>
    </header>
  );
}
