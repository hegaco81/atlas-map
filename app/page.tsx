"use client";

import { useMemo, useState } from "react";

type Municipality = {
  name: string;
  code: string;
  sales: number;
  budget: number;
  margin: number;
  marginBudget: number;
  previous: number;
  recoverable: number;
  risk: "Crítico" | "Alto riesgo" | "Atención" | "En meta" | "Sobrecumple";
  position: { left: string; top: string; width: string; height: string };
};

const municipalities: Municipality[] = [
  { name: "Guadalajara", code: "14039", sales: 12.5, budget: 16, margin: 2.82, marginBudget: 3.42, previous: 11.9, recoverable: 1.7, risk: "Crítico", position: { left: "34%", top: "44%", width: "19%", height: "19%" } },
  { name: "Zapopan", code: "14120", sales: 10.8, budget: 11.2, margin: 2.12, marginBudget: 2.5, previous: 9.8, recoverable: 0.62, risk: "Atención", position: { left: "53%", top: "29%", width: "22%", height: "25%" } },
  { name: "Tepatitlán", code: "14093", sales: 3.1, budget: 4.2, margin: 0.78, marginBudget: 0.91, previous: 3.4, recoverable: 0.44, risk: "Alto riesgo", position: { left: "73%", top: "42%", width: "16%", height: "19%" } },
  { name: "Puerto Vallarta", code: "14067", sales: 2.4, budget: 3.7, margin: 0.55, marginBudget: 0.74, previous: 2.8, recoverable: 0.28, risk: "Crítico", position: { left: "12%", top: "71%", width: "22%", height: "15%" } },
  { name: "Tlajomulco", code: "14097", sales: 3.9, budget: 4.1, margin: 1.01, marginBudget: 1.05, previous: 3.5, recoverable: 0.31, risk: "Atención", position: { left: "46%", top: "65%", width: "19%", height: "17%" } },
  { name: "Lagos de Moreno", code: "14053", sales: 2.9, budget: 2.7, margin: 0.73, marginBudget: 0.65, previous: 2.3, recoverable: 0.12, risk: "En meta", position: { left: "73%", top: "15%", width: "17%", height: "16%" } },
];

const money = (value: number) => `$${value.toFixed(1)}M`;
const pct = (sales: number, budget: number) => budget ? (sales / budget) * 100 : 0;

export default function Home() {
  const [level, setLevel] = useState<"Estado" | "Municipio">("Municipio");
  const [version, setVersion] = useState<"Original FY26" | "Revisado FY26" | "Forecast FY26">("Revisado FY26");
  const [selected, setSelected] = useState("Guadalajara");
  const [metric, setMetric] = useState<"Cumplimiento" | "Brecha" | "Proyección">("Cumplimiento");
  const [scenario, setScenario] = useState<"Conservador" | "Probable" | "Agresivo">("Probable");
  const [filter, setFilter] = useState<"Todos" | "< 90%" | "Con inventario">("Todos");

  const rows = useMemo(() => municipalities.filter((m) => {
    if (filter === "< 90%") return pct(m.sales, m.budget) < 90;
    if (filter === "Con inventario") return m.name !== "Puerto Vallarta";
    return true;
  }), [filter]);
  const active = municipalities.find((m) => m.name === selected) ?? municipalities[0];
  const totalSales = municipalities.reduce((sum, m) => sum + m.sales, 0);
  const totalBudget = municipalities.reduce((sum, m) => sum + m.budget, 0);
  const totalRecoverable = municipalities.reduce((sum, m) => sum + m.recoverable, 0);
  const projected = totalSales / 12 * 20;
  const paceBudget = totalBudget * 0.59;
  const scenarioFactor = scenario === "Conservador" ? 0.53 : scenario === "Probable" ? 1 : 1.7;

  return (
    <main className="atlas-shell">
      <aside className="sidebar" aria-label="Navegación principal">
        <div className="brand"><span className="brand-mark">A</span><span>ATLAS</span></div>
        <nav>
          <button className="nav-item active"><span>◈</span> Centro de mando</button>
          <button className="nav-item"><span>◌</span> GeoSales</button>
          <button className="nav-item"><span>◒</span> Presupuestos</button>
          <button className="nav-item"><span>◇</span> Oportunidades</button>
          <button className="nav-item"><span>▱</span> Inventario</button>
        </nav>
        <div className="sidebar-bottom">
          <div className="assistant-dot">✦</div>
          <div><strong>Atlas AI</strong><small>Motor determinista activo</small></div>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div className="crumbs"><span>México</span><b>/</b><span>Occidente</span><b>/</b><strong>Jalisco</strong></div>
          <div className="header-actions"><span className="live"><i /> Datos al 20 Jun 2026</span><button className="round">⌕</button><button className="avatar">HG</button></div>
        </header>

        <div className="content">
          <section className="title-row">
            <div><p className="eyebrow">PRESUPUESTO COMERCIAL · JUNIO 2026</p><h1>Jalisco <span>en foco</span></h1><p className="subtitle">Venta real, ritmo de cierre y recuperación a nivel municipio.</p></div>
            <div className="selectors">
              <label>Versión<select value={version} onChange={(e) => setVersion(e.target.value as typeof version)}><option>Original FY26</option><option>Revisado FY26</option><option>Forecast FY26</option></select></label>
              <label>Vista<select value={level} onChange={(e) => setLevel(e.target.value as typeof level)}><option>Estado</option><option>Municipio</option></select></label>
            </div>
          </section>

          <section className="kpis" aria-label="Indicadores presupuestales">
            <Kpi label="Venta real" value={money(totalSales)} detail="+7.8% vs. año anterior" tone="good" />
            <Kpi label="Presupuesto acumulado" value={money(paceBudget)} detail="59% del mes hábil" />
            <Kpi label="Cumplimiento al día" value={`${pct(totalSales, paceBudget).toFixed(1)}%`} detail="−$0.7M contra ritmo" tone="risk" />
            <Kpi label="Brecha mensual" value={money(totalBudget - totalSales)} detail="8 días hábiles restantes" tone="risk" />
            <Kpi label="Proyección de cierre" value={money(projected)} detail={`${pct(projected, totalBudget).toFixed(1)}% de cumplimiento`} tone="warn" />
            <Kpi label="Oportunidad recuperable" value={money(totalRecoverable)} detail="Escenario probable" tone="good" />
          </section>

          <section className="dashboard-grid">
            <article className="map-card panel">
              <div className="panel-head"><div><p className="eyebrow">NIVEL MUNICIPIO · {level.toUpperCase()}</p><h2>Riesgo presupuestal en Jalisco</h2></div><button className="ghost">⌖ Centrar mapa</button></div>
              <div className="map-toolbar">
                <div className="segmented" aria-label="Métrica del mapa">
                  {(["Cumplimiento", "Brecha", "Proyección"] as const).map((item) => <button key={item} className={metric === item ? "selected" : ""} onClick={() => setMetric(item)}>{item}</button>)}
                </div>
                <select aria-label="Filtrar municipios" value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)}><option>Todos</option><option>&lt; 90%</option><option>Con inventario</option></select>
              </div>
              <div className="map-visual" role="img" aria-label="Mapa esquemático de municipios de Jalisco coloreados por desempeño presupuestal">
                <div className="map-grid" />
                <div className="state-label">JALISCO <small>Clave 14 · SRID 4326</small></div>
                {rows.map((m) => <button key={m.code} onClick={() => setSelected(m.name)} className={`municipality ${m.risk === "Crítico" ? "critical" : m.risk === "Alto riesgo" ? "high" : m.risk === "Atención" ? "attention" : "healthy"} ${selected === m.name ? "chosen" : ""}`} style={m.position} aria-label={`${m.name}, ${pct(m.sales,m.budget).toFixed(0)}% de cumplimiento`}><span>{m.name}</span><b>{metric === "Brecha" ? money(Math.max(m.budget-m.sales,0)) : metric === "Proyección" ? `${Math.min(pct(m.sales / 12 * 20, m.budget), 129).toFixed(0)}%` : `${pct(m.sales,m.budget).toFixed(0)}%`}</b></button>)}
                <div className="map-zoom"><button>+</button><button>−</button></div>
              </div>
              <div className="legend"><span><i className="critical-swatch" /> &lt;70% Crítico</span><span><i className="high-swatch" /> 70–84% Riesgo</span><span><i className="attention-swatch" /> 85–99% Atención</span><span><i className="healthy-swatch" /> ≥100% En meta</span><span className="legend-note">Patrón + valor numérico para accesibilidad</span></div>
            </article>

            <article className="insight panel">
              <div className="insight-top"><span className="spark">✦</span><span className="eyebrow">ATLAS INTELLIGENCE</span></div>
              <h2>La brecha se concentra en 3 municipios.</h2>
              <p>Guadalajara, Puerto Vallarta y Tepatitlán explican <b>74%</b> de la brecha de frenos. La venta crece, pero por debajo de una meta más agresiva.</p>
              <div className="insight-metric"><span>Brecha recuperable</span><strong>{money(totalRecoverable * scenarioFactor)}</strong><small>{scenario === "Probable" ? "58% de la brecha actual" : `${scenario === "Conservador" ? "31" : "88"}% de la brecha actual`}</small></div>
              <div className="scenario"><span>Simulación</span><div>{(["Conservador", "Probable", "Agresivo"] as const).map((item) => <button key={item} className={scenario === item ? "scenario-on" : ""} onClick={() => setScenario(item)}>{item}</button>)}</div></div>
              <button className="primary">Ver plan de recuperación <span>→</span></button>
            </article>
          </section>

          <section className="bottom-grid">
            <article className="panel trend-panel"><div className="panel-head"><div><p className="eyebrow">RITMO DE VENTA</p><h2>Acumulado vs. presupuesto diario</h2></div><span className="chart-key"><i /> Venta real <i className="dashed" /> Presupuesto</span></div><div className="line-chart" aria-label="Gráfica de venta acumulada frente a presupuesto acumulado"><div className="chart-y y1">$60M</div><div className="chart-y y2">$40M</div><div className="chart-y y3">$20M</div><div className="gridline g1"/><div className="gridline g2"/><div className="gridline g3"/><div className="forecast-zone"><span>Proyección</span></div><div className="budget-line"/><div className="actual-line"><i/><i/><i/><i/><i/><i/></div><div className="chart-x"><span>01 Jun</span><span>05</span><span>10</span><span>15</span><span>20</span><span>30 Jun</span></div></div></article>
            <article className="panel table-panel"><div className="panel-head"><div><p className="eyebrow">RANKING · BRECHA EN PESOS</p><h2>Municipios prioritarios</h2></div><button className="ghost">Ver todos</button></div><div className="table"><div className="tr th"><span>Municipio</span><span>Venta / Presupuesto</span><span>Cumpl.</span><span>Brecha</span></div>{[...municipalities].sort((a,b)=>(b.budget-b.sales)-(a.budget-a.sales)).slice(0,4).map((m)=><button className={`tr ${selected===m.name ? "selected-row" : ""}`} key={m.code} onClick={()=>setSelected(m.name)}><span><b>{m.name}</b><small>{m.code} · Jalisco</small></span><span>{money(m.sales)} / {money(m.budget)}</span><span className={pct(m.sales,m.budget)<85?"danger-text":""}>{pct(m.sales,m.budget).toFixed(1)}%</span><span>{money(Math.max(m.budget-m.sales,0))}</span></button>)}</div></article>
          </section>
        </div>
      </section>

      <aside className="detail-panel" aria-label="Detalle de municipio seleccionado">
        <div className="detail-head"><span className="eyebrow">MUNICIPIO SELECCIONADO</span><button onClick={()=>setSelected("Guadalajara")}>×</button></div>
        <h2>{active.name}</h2><p className="detail-code">Jalisco · Cve. INEGI {active.code}</p>
        <div className="attainment"><div className="donut"><strong>{pct(active.sales,active.budget).toFixed(0)}%</strong><span>cumplimiento</span></div><div><span>Venta real</span><strong>{money(active.sales)}</strong><small>de {money(active.budget)} presupuestado</small></div></div>
        <div className="detail-grid"><Metric label="Presupuesto acumulado" value={money(active.budget*.59)} /><Metric label="Brecha actual" value={money(Math.max(active.budget-active.sales,0))} risk /><Metric label="Margen real" value={money(active.margin)} /><Metric label="Margen presup." value={money(active.marginBudget)} risk /></div>
        <section className="why"><p className="eyebrow">EXPLICACIÓN DE DESVIACIÓN</p><h3>¿Qué está explicando la brecha?</h3><Factor label="Clientes activos" value="−$0.62M" width="74%" /><Factor label="Ticket promedio" value="−$0.41M" width="53%" /><Factor label="Inventario disponible" value="−$0.30M" width="39%" /><p className="hypothesis"><b>Hipótesis:</b> menor frecuencia de visita y disponibilidad están asociadas a la desviación; requiere validación comercial.</p></section>
        <section className="recovery"><p className="eyebrow">RECUPERACIÓN PROBABLE</p><strong>{money(active.recoverable)}</strong><span>clientes inactivos + venta cruzada</span><button className="primary">Simular acciones →</button></section>
      </aside>
    </main>
  );
}

function Kpi({ label, value, detail, tone }: { label: string; value: string; detail: string; tone?: "good" | "risk" | "warn" }) { return <article className="kpi"><p>{label}</p><strong>{value}</strong><small className={tone}>{tone === "good" ? "↗ " : tone === "risk" ? "↘ " : "◔ "}{detail}</small></article>; }
function Metric({ label, value, risk }: { label:string; value:string; risk?:boolean }) { return <div><span>{label}</span><strong className={risk ? "danger-text" : ""}>{value}</strong></div>; }
function Factor({ label, value, width }: { label:string; value:string; width:string }) { return <div className="factor"><div><span>{label}</span><b>{value}</b></div><i><em style={{width}} /></i></div>; }
