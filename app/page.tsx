"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Geometry = { type: "Polygon" | "MultiPolygon"; coordinates: number[][][] | number[][][][] };
type Municipality = { type: "Feature"; properties: { state_code: number; mun_code: number; mun_name: string }; geometry: Geometry };
type GeoData = { type: "FeatureCollection"; features: Municipality[] };

const states: Record<number, string> = {
  1:"Aguascalientes",2:"Baja California",3:"Baja California Sur",4:"Campeche",5:"Coahuila",6:"Colima",7:"Chiapas",8:"Chihuahua",9:"Ciudad de México",10:"Durango",11:"Guanajuato",12:"Guerrero",13:"Hidalgo",14:"Jalisco",15:"Estado de México",16:"Michoacán",17:"Morelos",18:"Nayarit",19:"Nuevo León",20:"Oaxaca",21:"Puebla",22:"Querétaro",23:"Quintana Roo",24:"San Luis Potosí",25:"Sinaloa",26:"Sonora",27:"Tabasco",28:"Tamaulipas",29:"Tlaxcala",30:"Veracruz",31:"Yucatán",32:"Zacatecas"
};

const topTerritories = [
  ["ZC GUADALAJARA", "$5,694,901", "82,050 u"],
  ["ZC CULIACÁN", "$3,327,361", "33,483 u"],
  ["JAL FORÁNEO", "$3,120,548", "39,372 u"],
  ["ZC TOLUCA", "$2,445,479", "21,876 u"],
  ["ZC MONTERREY", "$2,321,909", "27,898 u"],
];

const topProducts = [
  ["BUJÍAS · NGK", "$2,682,295", "68,742 u"],
  ["SIN FAMILIA · LUK", "$2,632,266", "798 u"],
  ["BUJÍAS · NGK", "$2,495,627", "50,144 u"],
  ["PASTILLA FRENO · WAGNER", "$1,609,899", "4,981 u"],
  ["SISTEMA FRENOS · BREMBO", "$1,096,814", "3,020 u"],
];

const palette = ["#d72b31", "#f56a19", "#d2b42b", "#69b84a", "#23883d"];
const metricFor = (feature: Municipality) => (feature.properties.state_code * 97 + feature.properties.mun_code * 31) % 100;
const colorFor = (feature: Municipality) => palette[Math.min(4, Math.floor(metricFor(feature) / 20))];
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

export default function Home() {
  const [geo, setGeo] = useState<GeoData | null>(null);
  const [selected, setSelected] = useState<Municipality | null>(null);
  const [layer, setLayer] = useState("Venta");
  const [period, setPeriod] = useState("May 2026 – Jul 2026");
  const [assistantOpen, setAssistantOpen] = useState(true);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("Atlas listo. Puedo navegar por estado, municipio, territorio o cliente.");
  const [activeTab, setActiveTab] = useState("Municipio");
  const [filterOpen, setFilterOpen] = useState(false);
  const [focusedState, setFocusedState] = useState<number | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  useEffect(() => {
    fetch("/mexico-municipalities.geojson").then((response) => response.json()).then((data: GeoData) => setGeo(data));
  }, []);

  const paths = useMemo(() => geo?.features.map((feature) => ({ feature, d: geometryPath(feature) })) ?? [], [geo]);
  const selectedScore = selected ? metricFor(selected) : 84;
  const selectedName = selected?.properties.mun_name ?? "Nacional";
  const selectedState = selected ? states[selected.properties.state_code] : "México";

  const mapViewBox = useMemo(() => {
    if (!selected) return "0 0 940 610";
    const points = flattenCoordinates(selected.geometry.coordinates).map(project);
    const xs = points.map((point) => point[0]); const ys = points.map((point) => point[1]);
    const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
    const width = Math.max(maxX - minX, 140); const height = Math.max(maxY - minY, 105);
    return `${(minX - width * .48).toFixed(1)} ${(minY - height * .48).toFixed(1)} ${(width * 1.96).toFixed(1)} ${(height * 1.96).toFixed(1)}`;
  }, [selected]);

  const speak = (message: string) => {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(message);
    utterance.lang = "es-MX"; utterance.rate = .98; utterance.pitch = .88;
    window.speechSynthesis.speak(utterance);
  };

  const executeCommand = (command: string, replyByVoice = false) => {
    const q = command.toLowerCase();
    let response = "";
    if (q.includes("jalisco") || q.includes("guadalajara")) {
      const match = geo?.features.find((feature) => feature.properties.state_code === 14 && feature.properties.mun_name.toLowerCase().includes("guadalajara"));
      if (match) setSelected(match);
      setFocusedState(14); setActiveTab("Municipio");
      response = "Guadalajara lidera venta en Occidente, pero su presupuesto agresivo deja una brecha de 3.5 millones. Recomiendo recuperar clientes inactivos y reforzar frenos.";
    } else if (q.includes("nacional") || q.includes("méxico") || q.includes("regresa")) {
      setSelected(null); setFocusedState(null); setActiveTab("Nacional");
      response = "Regresé a la vista nacional. El mapa muestra los 2,436 municipios con su nivel de desempeño comercial.";
    } else if (q.includes("presupuesto") || q.includes("brecha")) {
      setLayer("Cumplimiento"); setActiveTab("Municipio");
      response = "Cambié el mapa a cumplimiento. Los municipios rojos están debajo de 70 por ciento; naranja indica riesgo alto y verde sobrecumplimiento.";
    } else if (q.includes("inventario")) {
      setLayer("Inventario");
      response = "Mostrando cobertura de inventario. Nuevo León tiene riesgo de quiebre; Occidente conserva excedente transferible a municipios con brecha.";
    } else {
      response = `${selectedName} registra ${selectedScore + 61} por ciento de cumplimiento acumulado. La prioridad inmediata es proteger margen y convertir oportunidades recuperables.`;
    }
    setAnswer(response); if (replyByVoice) speak(response);
  };

  const askAtlas = () => {
    executeCommand(question, false);
    setQuestion("");
  };

  const startListening = () => {
    const SpeechRecognition = (window as typeof window & { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any }).SpeechRecognition || (window as typeof window & { webkitSpeechRecognition?: new () => any }).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const message = "Firefox no incluye reconocimiento de voz nativo. Puedes escribir la orden aquí; Jarvis sí responderá por voz.";
      setAnswer(message); speak(message); return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "es-MX"; recognition.interimResults = false; recognition.continuous = false;
    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => { setListening(false); setAnswer("No pude escuchar la orden. Inténtalo de nuevo o escríbela."); };
    recognition.onresult = (event: any) => { const transcript = event.results[0][0].transcript; setQuestion(transcript); executeCommand(transcript, true); };
    recognitionRef.current = recognition; recognition.start();
  };

  return (
    <main className="geo-app">
      <header className="app-header">
        <div className="product-name">ATLAS <span>GEOSALES AI</span></div>
        <button className="back-button">← Volver</button>
        <div className="breadcrumbs"><span>Nacional</span><i>›</i><span>Occidente</span><i>›</i><b>{selected ? selectedState : "México"}</b></div>
        <div className="header-spacer" />
        <label className="org-select"><span>ORGANIZACIÓN</span><select><option>Todas las organizaciones</option><option>Refaccionarias</option><option>CEDIS</option></select></label>
        <button className="period-button">Mes actual</button>
        <button className="primary-action">Actualizar datos</button>
      </header>

      <div className="filter-strip"><button className="period-chip">Periodo: <b>{period}</b><span>×</span></button><select value={period} onChange={(event) => setPeriod(event.target.value)} aria-label="Periodo"><option>May 2026 – Jul 2026</option><option>Jun 2026</option><option>Jul 2026</option></select></div>

      <section className="app-body">
        <aside className={`assistant-panel ${assistantOpen ? "" : "collapsed"}`}>
          <div className="assistant-head"><span className="assistant-icon">✦</span><b>Jarvis · Asistente de ventas</b><button>＋</button><button>↶</button><button onClick={() => setAssistantOpen(false)}>×</button></div>
          <div className="assistant-content">
            <p className="assistant-kicker">RESUMEN EJECUTIVO</p>
            <h2>{selectedName}</h2><span className="muted">{selectedState} · {layer}</span>
            <div className={`assistant-answer ${listening ? "is-listening" : ""}`}><i>✦</i><p>{listening ? "Escuchando tu orden…" : answer}</p></div>
            <article className="white-chart">
              <h3>Tendencia de ventas mensuales</h3>
              <div className="line-legend"><i /> Venta (MXN)</div>
              <div className="trend-chart" aria-label="Tendencia de ventas de mayo a julio"><span className="axis a1">MXN 16M</span><span className="axis a2">MXN 12M</span><span className="axis a3">MXN 8M</span><span className="axis a4">MXN 4M</span><div className="trend-fill"/><div className="trend-line"/><i className="dot d1"/><i className="dot d2"/><i className="dot d3"/><div className="months"><b>Mayo</b><b>Junio</b><b>Julio</b></div></div>
            </article>
            <article className="white-chart compact">
              <h3>Volumen de piezas por mes</h3>
              <div className="bar-chart"><span>250k</span><i style={{height:"66%"}}/><i style={{height:"82%"}}/><i style={{height:"86%"}}/><div className="months"><b>Mayo</b><b>Junio</b><b>Julio</b></div></div>
            </article>
          </div>
          <div className="assistant-foot"><div><button>⇩ Descargar</button><button>✉ Enviar por email</button></div><div className="voice-hints"><button onClick={() => executeCommand("muéstrame Jalisco", true)}>Jalisco</button><button onClick={() => executeCommand("brecha de presupuesto", true)}>Brecha</button><button onClick={() => executeCommand("vista nacional", true)}>Nacional</button></div><div className="ask-box"><button className={`mic-button ${listening ? "active" : ""}`} onClick={listening ? () => recognitionRef.current?.stop() : startListening} aria-label="Hablar con Jarvis">{listening ? "■" : "●"}</button><input value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && askAtlas()} placeholder="Habla o escribe una orden…"/><button onClick={askAtlas}>➤</button></div></div>
        </aside>

        {!assistantOpen && <button className="open-assistant" onClick={() => setAssistantOpen(true)}>✦ Jarvis</button>}

        <section className="map-stage">
          <div className="map-topbar">
            <button className="go-button">⌖ Ir a…</button>
            <div className="geo-tabs">{["Nacional","Región","Estado","Municipio","Territorio","Cliente"].map((tab) => <button key={tab} className={activeTab === tab ? "active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>)}</div>
            <div className="data-toggle"><button className="active">▦ DATOS</button><button onClick={() => setFilterOpen(!filterOpen)}>☷ FILTROS</button></div>
          </div>
          {filterOpen && <div className="filter-popover"><b>Filtros comerciales</b><label>Canal<select><option>Todos</option><option>Mostrador</option><option>Mayoreo</option></select></label><label>Familia<select><option>Todas</option><option>Frenos</option><option>Suspensión</option></select></label><button onClick={() => setFilterOpen(false)}>Aplicar</button></div>}
          <div className="map-background"><span className="place p1">California</span><span className="place p2">Texas</span><span className="place p3">Gulf of Mexico</span><span className="place p4">Guatemala</span><span className="place p5">Pacific Ocean</span></div>
          <svg className="mexico-map" viewBox={mapViewBox} role="img" aria-label="Mapa municipal interactivo de México">
            <g transform="translate(0,10)">{paths.map(({ feature, d }) => <path key={`${feature.properties.state_code}-${feature.properties.mun_code}`} d={d} fill={colorFor(feature)} className={`${selected === feature ? "selected-mun" : ""} ${focusedState && feature.properties.state_code !== focusedState ? "dimmed-mun" : ""}`} onClick={() => { setSelected(feature); setFocusedState(feature.properties.state_code); setAnswer(`${feature.properties.mun_name}, ${states[feature.properties.state_code]}: ${metricFor(feature)+61}% de cumplimiento. Haz una pregunta a Jarvis para explicar la brecha.`); }}><title>{feature.properties.mun_name}, {states[feature.properties.state_code]}</title></path>)}</g>
          </svg>
          {!geo && <div className="map-loading"><i/> Cargando municipios de México…</div>}
          <div className="map-labels"><b className="label-north">SONORA</b><b className="label-center">JALISCO</b><b className="label-east">VERACRUZ</b><b className="label-south">OAXACA</b></div>
          <div className="map-legend"><b>{layer.toUpperCase()} · MXN</b>{palette.map((color, index) => <span key={color}><i style={{background:color}}/>{index === 0 ? "Crítico" : index === 1 ? "Riesgo alto" : index === 2 ? "Atención" : index === 3 ? "En meta" : "Sobrecumple"}</span>)}</div>
          <div className="map-controls"><button>＋</button><button>−</button><button>⌖</button></div>
          <button className="national-view" onClick={() => setSelected(null)}>Vista nacional</button>
          <div className="map-attribution">Geometría municipal · INEGI / GeoJSON · SRID 4326</div>
        </section>

        <aside className="data-panel">
          <section className="right-tabs"><button className="active">▦ DATOS</button><button>☷ FILTROS</button></section>
          <section className="kpi-block"><p className="section-label">KPIS · {selectedName.toUpperCase()}</p><div className="kpi-grid"><Metric label="VENTAS" value={`$${(43.2 + selectedScore/10).toFixed(1)}M`} /><Metric label="UNIDADES" value={`${583 + selectedScore}k`} /><Metric label="TERRITORIOS" value="77" /><Metric label="PROMEDIO" value="$561,182" /></div></section>
          <Ranking title="TOP TERRITORIOS" rows={topTerritories} />
          <Ranking title="TOP PRODUCTOS" rows={topProducts} />
          <section className="breakdown"><div className="breakdown-head"><span>BRECHA POR FAMILIA</span><div><button className="active">Fam</button><button>Mar</button></div></div>{[["SIN FAMILIA",92],["BUJÍAS",44],["PASTILLA FRENO",17],["BOMBA DE GASOLINA",12],["OTROS",8]].map(([name,width])=><div className="break-row" key={name}><span>{name}</span><i><b style={{width:`${width}%`}}/></i></div>)}</section>
        </aside>
      </section>
    </main>
  );
}

function Metric({label,value}:{label:string;value:string}) { return <div><span>{label}</span><b>{value}</b></div>; }
function Ranking({title,rows}:{title:string;rows:string[][]}) { return <section className="ranking"><p className="section-label">{title}</p>{rows.map(([name,value,units])=><div className="rank-row" key={name}><div><b>{name}</b><span>Zona comercial</span></div><div><strong>{value}</strong><span>{units}</span></div></div>)}</section>; }
