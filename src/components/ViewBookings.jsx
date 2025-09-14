// src/components/ViewBookings.jsx
import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import {
  ArrowLeft,
  Download,
  Phone,
  MessageCircle,
  CalendarDays,
  Clock,
  ClipboardList,
} from "lucide-react";

const TZ = "America/Sao_Paulo";
const PAGE_SIZE = 20;

function toBRDateTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: TZ,
    dateStyle: "short",
    timeStyle: "short",
  });
}
function toBRTime(iso) {
  if (!iso) return "-";
  return new Date(iso).toLocaleTimeString("pt-BR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  });
}
function onlyDigits(s = "") {
  return (s || "").replace(/\D/g, "");
}

export default function ViewBookings() {
  if (!supabase) {
    return (
      <div className="text-red-600">
        Configuração do Supabase ausente. Verifique o <code>.env.local</code>.
      </div>
    );
  }

  const [services, setServices] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [serviceFilter, setServiceFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const loadServices = async () => {
      const { data } = await supabase.from("services").select("id, name").order("name");
      setServices(data || []);
    };
    loadServices();
  }, []);

  const fetchBookings = async (opt = { page: 1 }) => {
    setLoading(true);
    setError("");
    try {
      let q = supabase.from("bookings_with_details").select("*", { count: "exact" });

      if (serviceFilter) q = q.eq("service_name", serviceFilter);
      if (dateFrom) {
        const start = new Date(`${dateFrom}T00:00:00-03:00`).toISOString();
        q = q.gte("start_at", start);
      }
      if (dateTo) {
        const end = new Date(`${dateTo}T23:59:59-03:00`).toISOString();
        q = q.lte("start_at", end);
      }
      if (query) {
        const esc = query.replace(/[%]/g, "\\%").replace(/_/g, "\\_");
        q = q.or(
          `company_name.ilike.%${esc}%,contact_name.ilike.%${esc}%,phone.ilike.%${esc}%`
        );
      }

      const from = (opt.page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      q = q.order("created_at", { ascending: false }).range(from, to);

      const { data, error, count } = await q;
      if (error) throw error;
      setBookings(data || []);
      setTotal(count || 0);
      setPage(opt.page);
    } catch (e) {
      setError(e.message || "Erro ao carregar agendamentos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings({ page: 1 });
  }, []);

  useEffect(() => {
    fetchBookings({ page: 1 });
  }, [serviceFilter, dateFrom, dateTo, query]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / PAGE_SIZE)),
    [total]
  );

  const exportCSV = () => {
    const rows = [
      ["Empresa", "Responsável", "Telefone", "Serviço", "Início", "Fim", "Criado em"],
      ...bookings.map((b) => [
        b.company_name || "",
        b.contact_name || "",
        b.phone || "",
        b.service_name || "",
        toBRDateTime(b.start_at),
        toBRTime(b.end_at),
        toBRDateTime(b.created_at),
      ]),
    ];
    const csv = rows.map((r) =>
      r
        .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
        .join(";")
    ).join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agendamentos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-5xl mx-auto p-3 md:p-4">
      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <ClipboardList className="w-5 h-5" /> Agendamentos
      </h2>

      <div className="mb-4 flex items-center gap-2 flex-wrap">
        <a
          href="/"
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md border bg-white hover:opacity-90"
        >
          <ArrowLeft className="w-4 h-4" /> Agendar novo
        </a>

        <div className="flex-1" />

        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-1 px-3 py-2 rounded-md border bg-white hover:opacity-90"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>

      {/* filtros */}
      <div className="mb-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-sm mb-1">Serviço</label>
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          >
            <option value="">Todos</option>
            {services.map((s) => (
              <option key={s.id} value={s.name}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">De</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Até</label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Buscar</label>
          <input
            type="text"
            placeholder="Empresa, responsável ou telefone"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border rounded-md px-3 py-2"
          />
        </div>
      </div>

      <div className="bg-white border rounded-2xl p-4">
        {loading && <p>Carregando...</p>}
        {error && <p className="text-red-600">{error}</p>}
        {!loading && !error && bookings.length === 0 && <p>Nenhum agendamento encontrado.</p>}

        <ul className="divide-y">
          {bookings.map((b) => {
            const startStr = toBRDateTime(b.start_at);
            const endStr = toBRTime(b.end_at);
            const digits = onlyDigits(b.phone);
            const whatsapp = digits
              ? `https://wa.me/55${digits}?text=${encodeURIComponent(
                  `Olá ${b.contact_name?.split(" ")[0] || ""}! Confirmando sua consultoria (${b.service_name}) em ${startStr}.`
                )}`
              : null;

            return (
              <li key={b.id} className="py-3">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {b.company_name}{" "}
                      <span className="text-gray-500">({b.contact_name})</span>
                    </p>
                    <p className="text-sm text-gray-600">
                      Serviço: <strong>{b.service_name || "-"}</strong>
                    </p>
                    <p className="text-sm text-gray-600 flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      {b.phone ? (
                        <>
                          <a className="underline" href={`tel:${digits}`}>
                            {b.phone}
                          </a>
                          {whatsapp && (
                            <a
                              className="underline flex items-center gap-1"
                              href={whatsapp}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" /> WhatsApp
                            </a>
                          )}
                        </>
                      ) : (
                        "-"
                      )}
                    </p>
                  </div>

                  <div className="text-sm md:text-right space-y-1">
                    <p className="flex items-center gap-1">
                      <CalendarDays className="w-4 h-4" />
                      Início: <strong>{startStr}</strong>
                    </p>
                    <p className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      Fim: <strong>{endStr}</strong>
                    </p>
                    <p className="text-xs text-gray-500">
                      Criado em {toBRDateTime(b.created_at)}
                    </p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        {total > PAGE_SIZE && (
          <div className="mt-4 flex items-center justify-between">
            <p className="text-sm text-gray-600">
              Página {page} de {totalPages} — {total} agendamento(s)
            </p>
            <div className="flex gap-2">
              <button
                className="px-3 py-2 rounded-md border bg-white disabled:opacity-50"
                disabled={page <= 1 || loading}
                onClick={() => fetchBookings({ page: page - 1 })}
              >
                ← Anterior
              </button>
              <button
                className="px-3 py-2 rounded-md border bg-white disabled:opacity-50"
                disabled={page >= totalPages || loading}
                onClick={() => fetchBookings({ page: page + 1 })}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
