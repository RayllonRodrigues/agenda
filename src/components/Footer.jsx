import React from "react";

export default function Footer() {
  return (
    <footer className="mt-10 border-t pt-4 text-sm text-gray-600">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
        <p>© {new Date().getFullYear()} Juliana Masson Prediger. Todos os direitos reservados.</p>
        <p>
          Contato:{" "}
          <a href="http://wa.me//+55639999790927" className="underline hover:no-underline">
            (63) 9 9979-0927
          </a>{" "}
          •{" "}
          <a href="mailto:contato@suaempresa.com" className="underline hover:no-underline">
            juliana.prediger@to.sebrae.com.br
          </a>
        </p>
      </div>
    </footer>
  );
}
