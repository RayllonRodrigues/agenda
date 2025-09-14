import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

// Timezone para exibir datas/horas no Brasil
const TZ = "America/Sao_Paulo";

// YYYY-MM-DD respeitando o fuso do Brasil
function dateKeyInTZ(iso, tz = TZ) {
  const d = new Date(iso);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

// Rótulo humano (segunda, 22/09/2025)
function dateLabelInTZ(iso, tz = TZ) {
  const d = new Date(iso);
  return d.toLocaleDateString("pt-BR", {
    timeZone: tz,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeRange(start, end, tz = TZ) {
  const s = new Date(start).toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  const e = new Date(end).toLocaleTimeString("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" });
  return `${s} - ${e}`;
}

function groupSlotsByDateTZ(slots, tz = TZ) {
  const acc = {};
  (slots || []).forEach((s) => {
    const key = dateKeyInTZ(s.start_at, tz);
    if (!acc[key]) acc[key] = { label: dateLabelInTZ(s.start_at, tz), items: [] };
    acc[key].items.push(s);
  });
  return acc;
}

function Field({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-sm font-medium mb-1">{label}</label>
      {children}
    </div>
  );
}

function Button({ children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`px-4 py-2 rounded-md border text-sm font-medium hover:opacity-90 disabled:opacity-50 ${
        className || "bg-black text-white border-black"
      }`}
    >
      {children}
    </button>
  );
}

export default function BookingApp() {
  const navigate = useNavigate();

  if (!supabase) {
    return (
      <div className="text-red-600">
        Configuração do Supabase ausente. Verifique o <code>.env.local</code>.
      </div>
    );
  }

  const [services, setServices] = useState([]);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Campos do formulário
  const [companyName, setCompanyName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [timeSlotId, setTimeSlotId] = useState("");

  // 1) Carregar serviços (uma vez)
  useEffect(() => {
    const loadServices = async () => {
      setLoading(true);
      setError("");
      try {
        const { data: servicesData, error: servicesErr } = await supabase
          .from("services")
          .select("id, name, duration_minutes")
          .order("name");
        if (servicesErr) throw servicesErr;

        setServices(servicesData || []);
        // Pré-seleciona o primeiro serviço
        if ((servicesData || []).length && !serviceId) {
          setServiceId(servicesData[0].id);
        }
      } catch (e) {
        setError(e.message || "Falha ao carregar serviços.");
      } finally {
        setLoading(false);
      }
    };
    loadServices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Carregar slots sempre que o serviço mudar
  useEffect(() => {
    const loadSlotsForService = async () => {
      if (!serviceId) return;
      setLoading(true);
      setError("");
      try {
        const nowIso = new Date().toISOString();
        const { data: slotsData, error: slotsErr } = await supabase
          .from("time_slots")
          .select("id, service_id, start_at, end_at, is_booked")
          .eq("service_id", serviceId)
          .eq("is_booked", false)
          .gte("start_at", nowIso)
          .order("start_at", { ascending: true });

        if (slotsErr) throw slotsErr;
        setSlots(slotsData || []);

        // Pré-seleciona a primeira data disponível do serviço
        const grouped = groupSlotsByDateTZ(slotsData || [], TZ);
        const firstDateKey = Object.keys(grouped)[0] || "";
        setSelectedDate(firstDateKey);
        setTimeSlotId("");
      } catch (e) {
        setError(e.message || "Falha ao carregar horários.");
      } finally {
        setLoading(false);
      }
    };
    loadSlotsForService();
  }, [serviceId]);

  const groupedByDate = useMemo(() => groupSlotsByDateTZ(slots, TZ), [slots]);
  const dateOptions = useMemo(() => Object.keys(groupedByDate), [groupedByDate]);
  const timesForSelectedDate = useMemo(
    () => (groupedByDate[selectedDate]?.items || []),
    [groupedByDate, selectedDate]
  );

  const phoneMask = (value) => {
    const digits = (value || "").replace(/\D/g, "").slice(0, 11);
    const part1 = digits.slice(0, 2);
    const part2 = digits.length > 10 ? digits.slice(2, 7) : digits.slice(2, 6);
    const part3 = digits.length > 10 ? digits.slice(7, 11) : digits.slice(6, 10);
    if (digits.length <= 6) return digits.replace(/(\d{2})(\d{0,4})/, "($1) $2");
    return `(${part1}) ${part2}-${part3}`.trim();
  };

  const handlePhoneChange = (e) => setPhone(phoneMask(e.target.value));

  const validate = () => {
    if (!companyName.trim()) return "Informe o nome da empresa.";
    if (!contactName.trim()) return "Informe o nome do responsável.";
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10) return "Informe um telefone válido.";
    if (!serviceId) return "Selecione um serviço.";
    if (!selectedDate) return "Selecione uma data.";
    if (!timeSlotId) return "Selecione um horário.";
    return "";
  };

  const refreshSlots = async () => {
    if (!serviceId) return;
    const { data: slotsData, error: slotsErr } = await supabase
      .from("time_slots")
      .select("id, service_id, start_at, end_at, is_booked")
      .eq("service_id", serviceId)
      .eq("is_booked", false)
      .gte("start_at", new Date().toISOString())
      .order("start_at", { ascending: true });
    if (slotsErr) throw slotsErr;
    setSlots(slotsData || []);

    // Se a data atual não tiver mais horários, tente selecionar outra
    const grouped = groupSlotsByDateTZ(slotsData || [], TZ);
    if (!grouped[selectedDate]) {
      const first = Object.keys(grouped)[0] || "";
      setSelectedDate(first);
      setTimeSlotId("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const v = validate();
    if (v) {
      setError(v);
      return;
    }

    setSubmitting(true);
    try {
      const { error: rpcErr } = await supabase.rpc("book_slot", {
        p_company_name: companyName.trim(),
        p_contact_name: contactName.trim(),
        p_phone: phone.trim(),
        p_service_id: serviceId,
        p_time_slot_id: timeSlotId,
      });
      if (rpcErr) throw rpcErr;

      setSuccess("Horário reservado com sucesso! ✅");
      setTimeSlotId("");
      await refreshSlots();
    } catch (e) {
      setError(e.message || "Falha ao reservar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-xl font-bold mb-1">Agendar Consultoria</h2>
      <p className="text-sm text-gray-600 mb-6">
        Preencha seus dados, escolha o serviço e selecione um horário disponível.
      </p>

      <form onSubmit={handleSubmit} className="p-1 md:p-2">
        <Field label="Nome da empresa *">
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="Ex.: Sebrae Tocantins"
            className="w-full border rounded-md px-3 py-2"
          />
        </Field>

        <Field label="Nome do responsável *">
          <input
            type="text"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Ex.: Fernando Silva"
            className="w-full border rounded-md px-3 py-2"
          />
        </Field>

        <Field label="Telefone *">
          <input
            type="tel"
            value={phone}
            onChange={handlePhoneChange}
            placeholder="(63) 9 9999-9999"
            className="w-full border rounded-md px-3 py-2"
          />
        </Field>

        <Field label="Serviço *">
          <select
            value={serviceId}
            onChange={(e) => {
              setServiceId(e.target.value);
              // ao trocar de serviço, limpamos data/horário; os slots serão recarregados pelo useEffect
              setSelectedDate("");
              setTimeSlotId("");
            }}
            className="w-full border rounded-md px-3 py-2"
            disabled={loading}
          >
            {services.length === 0 && <option value="">Carregando...</option>}
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.duration_minutes ? `(${s.duration_minutes} min)` : ""}
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Data *">
            <select
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setTimeSlotId("");
              }}
              className="w-full border rounded-md px-3 py-2"
              disabled={loading || dateOptions.length === 0}
            >
              {dateOptions.length === 0 ? (
                <option value="">Sem datas disponíveis</option>
              ) : (
                dateOptions.map((d) => (
                  <option key={d} value={d}>
                    {groupedByDate[d].label}
                  </option>
                ))
              )}
            </select>
          </Field>

          <Field label="Horário *">
            <select
              value={timeSlotId}
              onChange={(e) => setTimeSlotId(e.target.value)}
              className="w-full border rounded-md px-3 py-2"
              disabled={loading || timesForSelectedDate.length === 0}
            >
              {timesForSelectedDate.length === 0 ? (
                <option value="">Sem horários para esta data</option>
              ) : (
                <>
                  <option value="">Selecione</option>
                  {timesForSelectedDate.map((t) => (
                    <option key={t.id} value={t.id}>
                      {formatTimeRange(t.start_at, t.end_at)}
                    </option>
                  ))}
                </>
              )}
            </select>
          </Field>
        </div>

        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
        {success && <div className="mt-2 text-sm text-green-700">{success}</div>}

        <div className="mt-6 flex gap-3 flex-wrap">
          <Button type="submit" disabled={submitting || loading}>
            {submitting ? "Reservando..." : "Reservar horário"}
          </Button>
          <Button
            type="button"
            className="bg-white text-black border-gray-300"
            onClick={() => {
              setCompanyName("");
              setContactName("");
              setPhone("");
              setTimeSlotId("");
              setError("");
              setSuccess("");
            }}
          >
            Limpar
          </Button>
          <Button
            type="button"
            className="bg-blue-600 text-white border-blue-600"
            onClick={() => navigate("/view-bookings")}
          >
            Ver Agendamentos
          </Button>
        </div>
      </form>
    </div>
  );
}
