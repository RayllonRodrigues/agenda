// src/components/ViewBookings.jsx
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

const TZ = "America/Sao_Paulo";

export default function ViewBookings() {
  if (!supabase) {
    return (
      <div className="text-red-600">
        Configuração do Supabase ausente. Verifique o <code>.env.local</code>.
      </div>
    );
  }

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        // Lê da VIEW bookings_with_details (b.id, company_name, contact_name, phone, created_at, service_name, start_at, end_at)
        const { data, error } = await supabase
          .from("bookings_with_details")
          .select("*")
          .order("created_at", { ascending: false });

        if (error) throw error;
        setBookings(data || []);
      } catch (e) {
        setError(e.message || "Erro ao carregar agendamentos.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-1 md:p-2">
      <h2 className="text-xl font-bold mb-4">Agendamentos</h2>

      <div className="mb-4">
        <a href="/" className="inline-block px-4 py-2 rounded-md border bg-white hover:opacity-90">
          ← Voltar ao agendamento
        </a>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        {loading && <p>Carregando...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && bookings.length === 0 && <p>Nenhum agendamento encontrado.</p>}

        <ul className="divide-y">
          {bookings.map((b) => {
            const startStr = b?.start_at
              ? new Date(b.start_at).toLocaleString("pt-BR", {
                  timeZone: TZ,
                  dateStyle: "short",
                  timeStyle: "short",
                })
              : "-";
            const endStr = b?.end_at
              ? new Date(b.end_at).toLocaleTimeString("pt-BR", {
                  timeZone: TZ,
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "-";

            return (
              <li key={b.id} className="py-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {b.company_name}{" "}
                      <span className="text-gray-500">({b.contact_name})</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Serviço: <strong>{b.service_name || "-"}</strong>
                    </p>
                    <p className="text-sm text-gray-600">
                      Telefone:{" "}
                      {b.phone ? (
                        <a className="underline" href={`tel:${b.phone}`}>
                          {b.phone}
                        </a>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>

                  <div className="text-sm md:text-right">
                    <p>
                      Início: <strong>{startStr}</strong>
                    </p>
                    <p>
                      Fim: <strong>{endStr}</strong>
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
