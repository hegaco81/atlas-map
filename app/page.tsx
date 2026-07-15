"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";

type Geometry = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
type Municipality = { type: "Feature"; properties: { state_code: number; mun_code: number; mun_name: string }; geometry: Geometry };
type GeoData = { type: "FeatureCollection"; features: Municipality[] };
type Layer = "Cumplimiento" | "Brecha" | "Proyección" | "Margen" | "Inventario";
type BudgetVersion = "Original FY26" | "Revisado FY26" | "Forecast FY26";
type ViewBox = { x: number; y: number; width: number; height: number };
type HoverCard = { feature: Municipality; x: number; y: number } | null;

const NATIONAL_VIEW: ViewBox = { x: 0, y: 0, width: 940, height: 610 };

const states: Record<number, string> = {
  1:"Aguascalientes",2:"Baja California",3:"Baja California Sur",4:"Campeche",5:"Coahuila",6:"Colima",7:"Chiapas",8:"Chihuahua",9:"Ciudad de México",10:"Durango",11:"Guanajuato",12:"Guerrero",13:"Hidalgo",14:"Jalisco",15:"Estado de México",16:"Michoacán",17:"Morelos",18:"Nayarit",19:"Nuevo León",20:"Oaxaca",21:"Puebla",22:"Querétaro",23:"Quintana Roo",24:"San Luis Potosí",25:"Sinaloa",26:"Sonora",27:"Tabasco",28:"Tamaulipas",29:"Tlaxcala",30:"Veracruz",31:"Yucatán",32:"Zacatecas"
};

const palette = ["#d72b31", "#f56a19", "#d2b42b", "#69b84a", "#23883d"];
const layerLabels: Record<Layer, string[]> = {
  Cumplimiento: ["< 70% crítico", "70–84% riesgo", "85–94% atención", "95–109% en meta", "≥ 110% sobresale"],
  Brecha: ["Brecha severa", "Brecha alta", "Brecha media", "Brecha baja", "Sin brecha"],
  Proyección: ["Cierre crítico", "Cierre en riesgo", "Cierre cercano", "Meta probable", "Sobrecumple"],
  Margen: ["< 70%", "70–84%", "85–94%", "95–104%", "≥ 105%"],
  Inventario: ["Quiebre", "Cobertura baja", "Atención", "Disponible", "Excedente"],
};

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const formatMoney = (value: number) => new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", notation: "compact", maximumFractionDigits: 1 }).format(value);
const keyFor = (feature: Municipality) => `${feature.properties.state_code}-${feature.properties.mun_code}`;
const project = ([lon, lat]: number[]) => [((lon + 118.6) / 32.5) * 940, ((32.8 - lat) / 18.6) * 610];

const flattenCoordinates = (coordinates: unknown): number[][] => {
  if (Array.isArray(coordinates) && typeof coordinates[0] === "number") return [coordinates as number[]];
  return Array.isArray(coordinates) ? coordinates.flatMap(flattenCoordinates) : [];
};

function ringPath(ring: number[][]) {
  return ring.map((point, index) => { const [x, y] = project(point); return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`; }).join("") + "Z";
}

function geometryPath(geometry: Geometry) {
  if (geometry.type === "Polygon") return (geometry.coordinates as number[][][]).map(ringPath).join("");
  return (geometry.coordinates as number[][][][]).flatMap((polygon) => polygon.map(ringPath)).join("");
}

function metricsFor(feature: Municipality, version: BudgetVersion) {
  const seed = feature.properties.state_code * 977 + feature.properties.mun_code * 131;
  const versionFactor = version === "Original FY26" ? 1.08 : version === "Forecast FY26" ? .96 : 1;
  const budget = (1_100_000 + (seed % 680) * 9_500) * versionFactor;
  let attainment = .58 + (seed % 63) / 100;
  const name = normalize(feature.properties.mun_name);
  if (feature.properties.state_code === 14) attainment = .68 + (seed % 24) / 100;
  if (name.includes("guadalajara")) attainment = .7813;
  if (name.includes("zapopan")) attainment = .93;
  if (name.includes("tepatitlan")) attainment = .72;
  if (name.includes("puerto vallarta")) attainment = .76;
  if (feature.properties.state_code === 19) attainment = 1.1 + (seed % 16) / 100;
  if (feature.properties.state_code === 21) attainment = 1.01 + (seed % 12) / 100;
  const actual = budget * attainment;
  const cumulativeBudget = budget * .59;
  const gap = Math.max(budget - actual, 0);
  const projectedSales = actual / 12 * 20 * (.96 + (seed % 9) / 100);
  const projectedAttainment = projectedSales / budget * 100;
  const marginAttainment = feature.properties.state_code === 21 ? 82 + seed % 8 : 78 + seed % 34;
  const inventoryDays = name.includes("puerto vallarta") ? 7 : 5 + seed % 43;
  const recoverable = Math.min(gap, (180_000 + (seed % 31) * 37_000) * .65);
  return {
    actual, budget, cumulativeBudget, attainment: attainment * 100, gap,
    projectedSales, projectedAttainment, marginAttainment, inventoryDays,
    recoverable, requiredDaily: gap / 8, growth: -4 + seed % 19,
    previousSales: actual / (1 + (-4 + seed % 19) / 100),
  };
}

function colorIndex(value: number) {
  if (value < 70) return 0;
  if (value < 85) return 1;
  if (value < 95) return 2;
  if (value < 110) return 3;
  return 4;
}

function colorFor(feature: Municipality, layer: Layer, version: BudgetVersion) {
  const metric = metricsFor(feature, version);
  if (layer === "Brecha") return palette[4 - Math.min(4, Math.floor(metric.gap / Math.max(metric.budget, 1) * 5))];
  if (layer === "Proyección") return palette[colorIndex(metric.projectedAttainment)];
  if (layer === "Margen") return palette[colorIndex(metric.marginAttainment)];
  if (layer === "Inventario") return palette[Math.min(4, Math.floor(metric.inventoryDays / 10))];
  return palette[colorIndex(metric.attainment)];
}

function viewFor(features: Municipality[], padding = .38): ViewBox {
  const points = features.flatMap((feature) => flattenCoordinates(feature.geometry.coordinates).map(project));
  if (!points.length) return NATIONAL_VIEW;
  const xs = points.map((point) => point[0]); const ys = points.map((point) => point[1]);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const rawWidth = Math.max(maxX - minX, 34); const rawHeight = Math.max(maxY - minY, 28);
  const width = Math.min(940, rawWidth * (1 + padding * 2));
  const height = Math.min(610, rawHeight * (1 + padding * 2));
  return { x: minX - (width - rawWidth) / 2, y: minY - (height - rawHeight) / 2, width, height };
}

export default function Home() {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [mapError, setMapError] = useState("");
  const [selected, setSelected] = useState<Municipality | null>(null);
  const [layer, setLayer] = useState<Layer>("Cumplimiento");
  const [period, setPeriod] = useState("May 2026 – Jul 2026");
  const [budgetVersion, setBudgetVersion] = useState<BudgetVersion>("Revisado FY26");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Hermes está activo. Pídeme navegar, comparar, filtrar o proyectar el cierre; Jarvis puede leer el resultado en voz alta.");
  const [activeTab, setActiveTab] = useState("Nacional");
  const [filterOpen, setFilterOpen] = useState(false);
  const [goOpen, setGoOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [focusedState, setFocusedState] = useState<number | null>(null);
  const [highlightedKeys, setHighlightedKeys] = useState<string[]>([]);
  const [listening, setListening] = useState(false);
  const [viewBox, setViewBox] = useState<ViewBox>(NATIONAL_VIEW);
  const [hoverCard, setHoverCard] = useState<HoverCard>(null);
  const [channel, setChannel] = useState("Todos");
  const [family, setFamily] = useState("Todas");
  const [updatedAt, setUpdatedAt] = useState("17:25");
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);
  const dragRef = useRef<{ x: number; y: number; view: ViewBox } | null>(null);

  useEffect(() => {
    let active = true;
    fetch("/mexico-municipalities.geojson")
      .then((response) => { if (!response.ok) throw new Error(); return response.json(); })
      .then((data: GeoData) => { if (!Array.isArray(data.features)) throw new Error(); if (active) setGeo(data); })
      .catch(() => { if (active) setMapError("No fue posible cargar la geometría municipal. Actualiza la página para intentarlo de nuevo."); });
    return () => { active = false; };
  }, []);

  const paths = useMemo(() => geo?.features.map((feature) => ({ feature, d: geometryPath(feature.geometry) })) ?? [], [geo]);
  const highlighted = useMemo(() => new Set(highlightedKeys), [highlightedKeys]);
  const selectedMetrics = selected ? metricsFor(selected, budgetVersion) : null;
  const selectedName = selected?.properties.mun_name ?? (focusedState ? states[focusedState] : "Nacional");
  const selectedState = selected ? states[selected.properties.state_code] : focusedState ? states[focusedState] : "México";

  const stateFeatures = useMemo(() => geo?.features.filter((feature) => !focusedState || feature.properties.state_code === focusedState) ?? [], [geo, focusedState]);
  const gapRanking = useMemo(() => stateFeatures.map((feature) => ({ feature, metric: metricsFor(feature, budgetVersion) })).sort((a, b) => b.metric.gap - a.metric.gap).slice(0, 5), [stateFeatures, budgetVersion]);
  const searchResults = useMemo(() => {
    const query = normalize(search.trim());
    if (!query || !geo) return [];
    return geo.features.filter((feature) => normalize(`${feature.properties.mun_name} ${states[feature.properties.state_code]}`).includes(query)).slice(0, 6);
  }, [search, geo]);

  const speak = (message: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "es-MX"; utterance.rate = .98; utterance.pitch = .88;
    window.speechSynthesis.speak(utterance);
  };

  const respond = (message: string, byVoice = false) => { setAnswer(message); if (byVoice) speak(message); };

  const selectMunicipality = (feature: Municipality, byVoice = false) => {
    const metric = metricsFor(feature, budgetVersion);
    setSelected(feature); setFocusedState(feature.properties.state_code); setActiveTab("Municipio");
    setHighlightedKeys([keyFor(feature)]); setViewBox(viewFor([feature], .55)); setGoOpen(false); setSearch("");
    respond(`${feature.properties.mun_name}, ${states[feature.properties.state_code]}: ${metric.attainment.toFixed(1)}% de cumplimiento, brecha ${formatMoney(metric.gap)} y proyección de cierre de ${metric.projectedAttainment.toFixed(1)}%.`, byVoice);
  };

  const focusState = (stateCode: number, byVoice = false) => {
    if (!geo) return;
    const features = geo.features.filter((feature) => feature.properties.state_code === stateCode);
    setFocusedState(stateCode); setSelected(null); setHighlightedKeys([]); setActiveTab("Estado"); setViewBox(viewFor(features, .16));
    const under = features.filter((feature) => metricsFor(feature, budgetVersion).attainment < 90).length;
    respond(`${states[stateCode]} está en foco. ${under} municipios están debajo de 90% de cumplimiento. Pídeme bajar a municipios o mostrar la mayor brecha.`, byVoice);
  };

  const resetNational = (byVoice = false) => {
    setSelected(null); setFocusedState(null); setHighlightedKeys([]); setActiveTab("Nacional"); setViewBox(NATIONAL_VIEW);
    respond("Vista nacional restaurada. Hermes mantiene activo el análisis de los 2,436 municipios.", byVoice);
  };

  const zoomBy = (factor: number) => setViewBox((current) => {
    const width = Math.max(42, Math.min(940, current.width * factor));
    const height = Math.max(30, Math.min(610, current.height * factor));
    return { x: current.x + (current.width - width) / 2, y: current.y + (current.height - height) / 2, width, height };
  });

  const executeCommand = (command: string, replyByVoice = true) => {
    const q = normalize(command);
    if (!q.trim()) { respond("Escribe una orden para Hermes, por ejemplo: “Ve a Jalisco” o “Compara Guadalajara contra Zapopan”."); return; }
    if (!geo) { respond("Hermes está esperando que termine de cargar la geometría municipal."); return; }

    const mentionedMunicipalities = geo.features.filter((feature) => q.includes(normalize(feature.properties.mun_name))).sort((a, b) => b.properties.mun_name.length - a.properties.mun_name.length);
    if (q.includes("compara") && mentionedMunicipalities.length >= 2) {
      const pair = mentionedMunicipalities.slice(0, 2); const [a, b] = pair.map((feature) => metricsFor(feature, budgetVersion));
      setHighlightedKeys(pair.map(keyFor)); setFocusedState(null); setSelected(pair[0]); setActiveTab("Municipio"); setViewBox(viewFor(pair, .55));
      respond(`${pair[0].properties.mun_name} cumple ${a.attainment.toFixed(1)}% con brecha ${formatMoney(a.gap)}; ${pair[1].properties.mun_name} cumple ${b.attainment.toFixed(1)}% con brecha ${formatMoney(b.gap)}. La prioridad es ${a.gap > b.gap ? pair[0].properties.mun_name : pair[1].properties.mun_name}.`, replyByVoice); return;
    }
    if (mentionedMunicipalities.length) { selectMunicipality(mentionedMunicipalities[0], replyByVoice); return; }

    const stateCode = Number(Object.entries(states).find(([, name]) => q.includes(normalize(name)))?.[0] ?? 0);
    if (stateCode) { focusState(stateCode, replyByVoice); return; }
    if (q.includes("nacional") || q.includes("regresa") || q.includes("restaura")) { resetNational(replyByVoice); return; }
    if (q.includes("debajo") && (q.includes("90") || q.includes("noventa"))) {
      const scope = stateFeatures.length ? stateFeatures : geo.features;
      const matches = scope.filter((feature) => metricsFor(feature, budgetVersion).attainment < 90);
      setLayer("Cumplimiento"); setHighlightedKeys(matches.map(keyFor)); setViewBox(viewFor(matches, .1));
      respond(`Resalté ${matches.length} municipios debajo de 90% de cumplimiento${focusedState ? ` en ${states[focusedState]}` : " a nivel nacional"}.`, replyByVoice); return;
    }
    if (q.includes("mayor brecha") || q.includes("primeros cinco") || q.includes("cinco municipios")) {
      const leaders = gapRanking.slice(0, 5); setLayer("Brecha"); setHighlightedKeys(leaders.map((item) => keyFor(item.feature))); setViewBox(viewFor(leaders.map((item) => item.feature), .35));
      respond(`Seleccioné las cinco mayores brechas: ${leaders.map((item) => item.feature.properties.mun_name).join(", ")}. En conjunto representan ${formatMoney(leaders.reduce((sum, item) => sum + item.metric.gap, 0))}.`, replyByVoice); return;
    }
    if (q.includes("baja") && q.includes("municip")) { setActiveTab("Municipio"); respond(`Nivel municipio activo${focusedState ? ` para ${states[focusedState]}` : " en todo México"}. Puedes seleccionar un polígono o pedir un municipio por nombre.`, replyByVoice); return; }
    if (q.includes("proyect") || q.includes("cierre")) { setLayer("Proyección"); const metric = selectedMetrics; respond(metric ? `${selectedName} proyecta ${formatMoney(metric.projectedSales)}, equivalente a ${metric.projectedAttainment.toFixed(1)}% del presupuesto ${budgetVersion}.` : "Activé la proyección de cierre. Verde indica municipios con meta probable y rojo riesgo crítico.", replyByVoice); return; }
    if (q.includes("inventario")) { setLayer("Inventario"); respond("Activé cobertura de inventario. Rojo indica riesgo de quiebre; los municipios verdes tienen inventario transferible para recuperar brecha.", replyByVoice); return; }
    if (q.includes("margen")) { setLayer("Margen"); respond("Activé cumplimiento de margen. Puebla permite ver el escenario donde venta cumple, pero margen no.", replyByVoice); return; }
    if (q.includes("recuper") || q.includes("oportunidad")) { const metric = selectedMetrics; respond(metric ? `${selectedName} tiene ${formatMoney(metric.recoverable)} de oportunidad recuperable. El escenario probable llevaría el cumplimiento a ${((metric.actual + metric.recoverable) / metric.budget * 100).toFixed(1)}%.` : "Selecciona un municipio para calcular su oportunidad recuperable con clientes inactivos, venta cruzada e inventario.", replyByVoice); return; }
    if (q.includes("por dia") || q.includes("diaria")) { const metric = selectedMetrics; respond(metric ? `${selectedName} necesita vender ${formatMoney(metric.requiredDaily)} por cada uno de los ocho días hábiles restantes.` : "Selecciona un municipio para calcular la venta diaria requerida.", replyByVoice); return; }
    if (q.includes("presupuesto")) { setLayer("Cumplimiento"); respond(`El tablero usa ${budgetVersion}. A nivel nacional la venta real simulada está en 92.4% del presupuesto acumulado; Jalisco concentra la principal brecha recuperable.`, replyByVoice); return; }
    respond(selectedMetrics ? `${selectedName}: venta ${formatMoney(selectedMetrics.actual)}, cumplimiento ${selectedMetrics.attainment.toFixed(1)}%, brecha ${formatMoney(selectedMetrics.gap)} y oportunidad recuperable ${formatMoney(selectedMetrics.recoverable)}.` : "Hermes puede navegar por estado o municipio, cambiar capas, comparar municipios y proyectar el cierre.", replyByVoice);
  };

  const askHermes = () => { const command = question; setQuestion(""); executeCommand(command, true); };

  const startListening = () => {
    const SpeechRecognition = (window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SpeechRecognition) { const message = "Firefox no incluye reconocimiento de voz nativo. Escribe la orden; Hermes controlará el mapa y Jarvis leerá la respuesta."; respond(message, true); return; }
    const recognition = new SpeechRecognition(); recognition.lang = "es-MX"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onstart = () => setListening(true); recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); respond("No pude escuchar la orden. Inténtalo de nuevo o escríbela."); };
    recognition.onresult = (event: any) => { const transcript = event.results[0][0].transcript; setQuestion(transcript); executeCommand(transcript, true); };
    recognitionRef.current = recognition; recognition.start();
  };

  const handleTab = (tab: string) => {
    if (tab === "Nacional") { resetNational(false); return; }
    setActiveTab(tab);
    if (tab === "Estado" && focusedState) focusState(focusedState, false);
    else if (tab === "Municipio") respond(`Nivel municipio activo${focusedState ? ` en ${states[focusedState]}` : " para México"}. Selecciona un polígono para abrir su ficha.`);
    else respond(`${tab} activado en modo demostración. Hermes conserva el contexto de ${selectedName}.`);
  };

  const mapPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    dragRef.current = { x: event.clientX, y: event.clientY, view: viewBox }; event.currentTarget.setPointerCapture(event.pointerId);
  };
  const mapPointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const rect = event.currentTarget.getBoundingClientRect(); const dx = (event.clientX - dragRef.current.x) / rect.width * dragRef.current.view.width; const dy = (event.clientY - dragRef.current.y) / rect.height * dragRef.current.view.height;
    setViewBox({ ...dragRef.current.view, x: dragRef.current.view.x - dx, y: dragRef.current.view.y - dy });
  };
  const mapPointerUp = (event: ReactPointerEvent<SVGSVGElement>) => { dragRef.current = null; event.currentTarget.releasePointerCapture(event.pointerId); };
  const mapWheel = (event: ReactWheelEvent<SVGSVGElement>) => { event.preventDefault(); zoomBy(event.deltaY > 0 ? 1.14 : .86); };
  const showTooltip = (event: ReactMouseEvent<SVGPathElement>, feature: Municipality) => {
    const stage = event.currentTarget.ownerSVGElement?.getBoundingClientRect(); if (!stage) return;
    setHoverCard({ feature, x: Math.min(stage.width - 220, Math.max(12, event.clientX - stage.left + 18)), y: Math.min(stage.height - 200, Math.max(48, event.clientY - stage.top + 18)) });
  };

  const applyFilters = () => { setFilterOpen(false); respond(`Filtros aplicados: canal ${channel}, familia ${family}, capa ${layer}. Hermes recalculó la lectura del mapa.`); };
  const refreshData = () => { const now = new Date(); const time = now.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" }); setUpdatedAt(time); respond(`Datos actualizados a las ${time}. Se conservaron el contexto geográfico y la selección actual.`); };

  return (
    <main className="geo-app">
      <header className="app-header">
        <div className="product-name">ATLAS <span>GEOSALES AI</span></div>
        <button className="back-button" onClick={() => resetNational(false)}>← Volver</button>
        <div className="breadcrumbs"><span>Nacional</span><i>›</i><span>{focusedState ? states[focusedState] : "México"}</span>{selected && <><i>›</i><b>{selectedName}</b></>}</div>
        <div className="header-spacer" />
        <label className="org-select"><span>ORGANIZACIÓN</span><select><option>Todas las organizaciones</option><option>Refaccionarias</option><option>CEDIS</option></select></label>
        <span className="live-status"><i/> HERMES ACTIVO · {updatedAt}</span>
        <button className="primary-action" onClick={refreshData}>Actualizar datos</button>
      </header>

      <div className="filter-strip">
        <label className="period-chip">Periodo <select value={period} onChange={(event) => setPeriod(event.target.value)}><option>May 2026 – Jul 2026</option><option>Jun 2026</option><option>Jul 2026</option></select></label>
        <label className="period-chip">Presupuesto <select value={budgetVersion} onChange={(event) => setBudgetVersion(event.target.value as BudgetVersion)}><option>Original FY26</option><option>Revisado FY26</option><option>Forecast FY26</option></select></label>
        <span className="context-chip">Contexto: {selectedName} · {layer}</span>
      </div>

      <section className="app-body">
        <aside className={`assistant-panel ${assistantOpen ? "" : "collapsed"}`}>
          <div className="assistant-head"><span className="assistant-icon">✦</span><b>Hermes + Jarvis · GeoSales</b><span className="agent-pulse"><i/> EN LÍNEA</span><button onClick={() => respond("Hermes conserva el contexto actual. Jarvis está listo para responder por voz.")}>↶</button><button onClick={() => setAssistantOpen(false)}>×</button></div>
          <div className="assistant-content">
            <p className="assistant-kicker">CONTEXTO GEOGRÁFICO ACTIVO</p>
            <h2>{selectedName}</h2><span className="muted">{selectedState} · {layer} · {budgetVersion}</span>
            <div className={`assistant-answer ${listening ? "is-listening" : ""}`}><i>✦</i><div><b>HERMES</b><p>{listening ? "Escuchando tu orden…" : answer}</p></div></div>
            <div className="command-cards"><button onClick={() => executeCommand("¿Cómo vamos contra presupuesto nacional?")}>Presupuesto nacional</button><button onClick={() => executeCommand("Ve a Jalisco")}>Analiza Jalisco</button><button onClick={() => executeCommand("Selecciona los cinco municipios con mayor brecha")}>Top 5 brechas</button><button onClick={() => executeCommand("Proyecta el cierre del mes")}>Proyectar cierre</button></div>
            <article className="white-chart">
              <h3>Venta vs. presupuesto</h3>
              <div className="budget-bars"><div><span>Venta real</span><i><b style={{width:`${Math.min(100, selectedMetrics?.attainment ?? 92)}%`}}/></i><strong>{selectedMetrics ? formatMoney(selectedMetrics.actual) : "$51.6M"}</strong></div><div><span>Presupuesto</span><i><b style={{width:"100%"}}/></i><strong>{selectedMetrics ? formatMoney(selectedMetrics.budget) : "$55.8M"}</strong></div><div><span>Proyección</span><i><b style={{width:`${Math.min(100, selectedMetrics?.projectedAttainment ?? 98)}%`}}/></i><strong>{selectedMetrics ? formatMoney(selectedMetrics.projectedSales) : "$54.7M"}</strong></div></div>
            </article>
            <article className="white-chart compact-card"><h3>Contexto que Hermes conserva</h3><div className="context-grid"><span>Nivel<b>{activeTab}</b></span><span>Capa<b>{layer}</b></span><span>Canal<b>{channel}</b></span><span>Familia<b>{family}</b></span></div></article>
          </div>
          <div className="assistant-foot"><div className="voice-hints"><button onClick={() => executeCommand("Compara Guadalajara contra Zapopan")}>Comparar GDL / Zapopan</button><button onClick={() => executeCommand("¿Cuánto debemos vender por día?")}>Venta diaria</button><button onClick={() => executeCommand("vista nacional")}>Nacional</button></div><div className="ask-box"><button className={`mic-button ${listening ? "active" : ""}`} onClick={listening ? () => recognitionRef.current?.stop() : startListening} aria-label="Hablar con Hermes y Jarvis">{listening ? "■" : "●"}</button><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && askHermes()} placeholder="Ordena a Hermes: Ve a Jalisco…" aria-label="Orden para Hermes"/><button onClick={askHermes} aria-label="Enviar orden a Hermes">➤</button></div></div>
        </aside>

        {!assistantOpen && <button className="open-assistant" onClick={() => setAssistantOpen(true)}>✦ Abrir Hermes</button>}

        <section className="map-stage">
          <div className="map-topbar">
            <button className="go-button" onClick={() => setGoOpen((open) => !open)}>⌖ Ir a…</button>
            <div className="geo-tabs">{["Nacional","Región","Estado","Municipio","Territorio","Cliente"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => handleTab(tab)}>{tab}</button>)}</div>
            <div className="data-toggle"><button className="active">▦ DATOS</button><button onClick={() => setFilterOpen(!filterOpen)}>☷ FILTROS</button></div>
          </div>
          {goOpen && <div className="go-popover"><b>Ir a municipio o estado</b><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ej. Guadalajara, Jalisco"/>{searchResults.map((feature) => <button key={keyFor(feature)} onClick={() => selectMunicipality(feature)}><span>{feature.properties.mun_name}</span><small>{states[feature.properties.state_code]}</small></button>)}</div>}
          {filterOpen && <div className="filter-popover"><b>Filtros comerciales</b><label>Canal<select value={channel} onChange={(event) => setChannel(event.target.value)}><option>Todos</option><option>Mostrador</option><option>Mayoreo</option></select></label><label>Familia<select value={family} onChange={(event) => setFamily(event.target.value)}><option>Todas</option><option>Frenos</option><option>Suspensión</option><option>Ignición</option></select></label><label>Indicador<select value={layer} onChange={(event) => setLayer(event.target.value as Layer)}><option>Cumplimiento</option><option>Brecha</option><option>Proyección</option><option>Margen</option><option>Inventario</option></select></label><button onClick={applyFilters}>Aplicar y recalcular</button></div>}
          <div className="map-background"><span className="place p1">California</span><span className="place p2">Texas</span><span className="place p3">Gulf of Mexico</span><span className="place p4">Guatemala</span><span className="place p5">Pacific Ocean</span></div>
          <svg className="mexico-map" viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`} role="img" aria-label="Mapa municipal interactivo de México" onPointerDown={mapPointerDown} onPointerMove={mapPointerMove} onPointerUp={mapPointerUp} onPointerCancel={() => { dragRef.current = null; }} onWheel={mapWheel}>
            <g transform="translate(0,10)">{paths.map(({ feature, d }) => {
              const isDimmed = (focusedState !== null && feature.properties.state_code !== focusedState) || (highlighted.size > 0 && !highlighted.has(keyFor(feature)));
              return <path key={keyFor(feature)} d={d} fill={colorFor(feature, layer, budgetVersion)} className={`${selected === feature ? "selected-mun" : ""} ${isDimmed ? "dimmed-mun" : ""}`} onPointerDown={(event) => event.stopPropagation()} onClick={() => selectMunicipality(feature)} onMouseMove={(event) => showTooltip(event, feature)} onMouseLeave={() => setHoverCard(null)}><title>{feature.properties.mun_name}, {states[feature.properties.state_code]}</title></path>;
            })}</g>
          </svg>
          {!geo && <div className={`map-loading ${mapError ? "is-error" : ""}`}><i/> {mapError || "Cargando municipios de México…"}</div>}
          {hoverCard && <MunicipalityTooltip card={hoverCard} version={budgetVersion}/>}
          <div className="map-labels"><b className="label-north">SONORA</b><b className="label-center">JALISCO</b><b className="label-east">VERACRUZ</b><b className="label-south">OAXACA</b></div>
          <div className="map-legend"><b>{layer.toUpperCase()}</b>{palette.map((color, index) => <span key={color}><i style={{background:color}}/>{layerLabels[layer][index]}</span>)}</div>
          <div className="map-controls"><button onClick={() => zoomBy(.72)} aria-label="Acercar mapa">＋</button><button onClick={() => zoomBy(1.38)} aria-label="Alejar mapa">−</button><button onClick={() => selected ? setViewBox(viewFor([selected], .55)) : focusedState ? focusState(focusedState, false) : setViewBox(NATIONAL_VIEW)} aria-label="Centrar mapa">⌖</button></div>
          <button className="national-view" onClick={() => resetNational(false)}>Vista nacional</button>
          <div className="map-instructions">Arrastra para mover · rueda para zoom · clic para analizar</div>
          <div className="map-attribution">Geometría municipal · INEGI / GeoJSON · SRID 4326</div>
        </section>

        <aside className="data-panel">
          <section className="right-tabs"><button className="active">▦ DATOS</button><button onClick={() => setFilterOpen(true)}>☷ FILTROS</button></section>
          <section className="kpi-block"><p className="section-label">KPIS · {selectedName.toUpperCase()}</p><div className="kpi-grid"><Metric label="VENTA REAL" value={selectedMetrics ? formatMoney(selectedMetrics.actual) : "$51.6M"}/><Metric label="PRESUPUESTO" value={selectedMetrics ? formatMoney(selectedMetrics.budget) : "$55.8M"}/><Metric label="CUMPLIMIENTO" value={selectedMetrics ? `${selectedMetrics.attainment.toFixed(1)}%` : "92.4%"}/><Metric label="BRECHA" value={selectedMetrics ? formatMoney(selectedMetrics.gap) : "$4.2M"}/><Metric label="PROYECCIÓN" value={selectedMetrics ? `${selectedMetrics.projectedAttainment.toFixed(1)}%` : "98.1%"}/><Metric label="RECUPERABLE" value={selectedMetrics ? formatMoney(selectedMetrics.recoverable) : "$3.5M"}/></div></section>
          <section className="ranking"><p className="section-label">MAYOR BRECHA · {focusedState ? states[focusedState].toUpperCase() : "NACIONAL"}</p>{gapRanking.map(({feature,metric}) => <button className="rank-row interactive" key={keyFor(feature)} onClick={() => selectMunicipality(feature)}><div><b>{feature.properties.mun_name}</b><span>{states[feature.properties.state_code]}</span></div><div><strong>{formatMoney(metric.gap)}</strong><span>{metric.attainment.toFixed(1)}%</span></div></button>)}</section>
          <section className="breakdown"><div className="breakdown-head"><span>BRECHA POR FAMILIA</span><div><button className="active">Fam</button><button>Mar</button></div></div>{[["SIN FAMILIA",92],["BUJÍAS",44],["PASTILLA FRENO",17],["BOMBA GASOLINA",12],["OTROS",8]].map(([name,width])=><div className="break-row" key={name}><span>{name}</span><i><b style={{width:`${width}%`}}/></i></div>)}</section>
        </aside>
      </section>
    </main>
  );
}

function MunicipalityTooltip({card,version}:{card:NonNullable<HoverCard>;version:BudgetVersion}) {
  const metric = metricsFor(card.feature, version);
  return <div className="map-tooltip" style={{left:card.x,top:card.y}}><b>{card.feature.properties.mun_name}</b><span>{states[card.feature.properties.state_code]}</span><dl><div><dt>Venta real</dt><dd>{formatMoney(metric.actual)}</dd></div><div><dt>Presupuesto</dt><dd>{formatMoney(metric.budget)}</dd></div><div><dt>Cumplimiento</dt><dd>{metric.attainment.toFixed(1)}%</dd></div><div><dt>Brecha</dt><dd>{formatMoney(metric.gap)}</dd></div><div><dt>Proyección</dt><dd>{metric.projectedAttainment.toFixed(1)}%</dd></div><div><dt>Inventario</dt><dd>{metric.inventoryDays} días</dd></div><div><dt>Recuperable</dt><dd>{formatMoney(metric.recoverable)}</dd></div><div><dt>Días restantes</dt><dd>8</dd></div></dl><small>Clic para analizar con Hermes</small></div>;
}

function Metric({label,value}:{label:string;value:string}) { return <div><span>{label}</span><b>{value}</b></div>; }
