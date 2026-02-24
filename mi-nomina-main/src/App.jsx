// App.jsx
import React, { useEffect, useMemo, useState } from "react";
import jsPDF from "jspdf";
import logoSrc from "./assets/logo.png";

/*
  App.jsx - Versión actualizada
  Cambios:
  - "Abonar" en préstamos
  - Resumen con tarjetas (ingresos: verde, gastos: rojo, balance: azul)
  - Cuenta de Cobro: concepto base (sin mencionar quincena)
  - Mantiene modal editable para monto y estilo Apple-like
*/

const ALL_KEY = "miNomina_v2";
const MONTHS_ES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS_SHORT = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"];
const currency = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

function fmtMoney(n){ return currency.format(Math.round(n||0)); }
function ymd(d = new Date()){ return new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString().slice(0,10); }
function monthKey(y,m){ const mm = (m+1).toString().padStart(2,'0'); return `${y}-${mm}`; }
function startOfMonth(y,m){ return new Date(y,m,1); }
function daysInMonth(y,m){ return new Date(y,m+1,0).getDate(); }
function buildMonthMatrix(y,m){
  const first = startOfMonth(y,m);
  const firstDow = first.getDay();
  const total = daysInMonth(y,m);
  const cells = [];
  // Build all cells needed: from first day of month to last day
  const lastDayIndex = firstDow + total - 1;
  const totalCells = lastDayIndex + 1;
  for(let i=0;i<totalCells;i++){
    const dayNum = i - firstDow + 1;
    if(dayNum<1||dayNum>total) cells.push(null);
    else cells.push(new Date(y,m,dayNum));
  }
  // Split into weeks, only including weeks that have content
  const weeks = [];
  for(let w=0; w*7 < cells.length; w++) weeks.push(cells.slice(w*7,w*7+7));
  return weeks;
}
function uid(){ if(typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID(); return `${Date.now()}-${Math.floor(Math.random()*100000)}`; }

function defaultUser(email, password){
  return {
    id: uid(), email, password, 
    profile: { fullName:'', cedula:'', correo:'', usuarioName:'', empresa:'', nit:'', ciudad:'Pereira', concepto:'Mesero', signatureDataUrl:'' },
    workDays: [], expenses: [], loans: [],
    dayTypes: [ { id: uid(), name: 'Medio tiempo', place:'', rate:30150, color:'#60a5fa' }, { id: uid(), name: 'Tiempo completo', place:'', rate:60300, color:'#f97316' } ]
  };
}

function loadAll(){ try{ const raw = localStorage.getItem(ALL_KEY); if(!raw) return { users:[], currentUserId:null }; return JSON.parse(raw); }catch{ return { users:[], currentUserId:null }; } }
function saveAll(x){ localStorage.setItem(ALL_KEY, JSON.stringify(x)); }

// ------------------ APP ------------------
export default function App(){
  const [all, setAll] = useState(loadAll);
  const [view, setView] = useState('app'); // app | profile | login
  useEffect(()=> saveAll(all), [all]);

  function replaceUser(newUser){
    setAll(s=>{
      const next = { ...s, users: s.users.map(u => u.id === newUser.id ? newUser : u) };
      try{ saveAll(next); }catch(e){}
      return next;
    });
  }

  function patchCurrentUser(patch){
    setAll(s=> {
      const id = s.currentUserId; if(!id) return s;
      const next = { ...s, users: s.users.map(u => u.id === id ? { ...u, ...patch } : u) };
      try{ saveAll(next); }catch(e){}
      return next;
    });
  }

  function registerAndLogin(email, password){ setAll(s=> { const u = defaultUser(email,password); return { ...s, users:[...s.users,u], currentUserId: u.id }; }); setView('app'); }
  function loginWith(email,password){ setAll(s=> { const f = s.users.find(u => u.email === email && u.password === password); if(!f) return s; return { ...s, currentUserId: f.id }; }); setView('app'); }

  const currentUser = all.users.find(u => u.id === all.currentUserId) || null;

  if(!currentUser || view === 'login') return <AuthScreen onLogin={loginWith} onRegister={registerAndLogin} />;
  if(view === 'profile') return <Usuario user={currentUser} onSave={(profile)=>{ patchCurrentUser({ profile }); setView('app'); }} onCancel={()=> setView('app')} />;

  return <MainApp user={currentUser} replaceUser={replaceUser} patchCurrentUser={patchCurrentUser} onLogout={()=> setAll(s=> ({ ...s, currentUserId:null }))} goProfile={()=> setView('profile')} />;
}

// ------------------ AUTH ------------------
function AuthScreen({ onLogin, onRegister }){
  const [mode, setMode] = useState('login');
  const [email,setEmail]=useState('');
  const [password,setPassword]=useState('');
  const [err,setErr]=useState('');
  function doLogin(){ if(!email||!password) return setErr('Completa correo y contraseña'); onLogin(email,password); }
  function doRegister(){ if(!email||!password) return setErr('Completa correo y contraseña'); onRegister(email,password); }
  return (
    <div className="min-h-screen bg-[#F6F2EA] p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-md w-full bg-white rounded-2xl p-6 shadow-[0_10px_30px_rgba(0,0,0,0.08)] border border-slate-200">
        <div className="text-center mb-4 flex flex-col items-center justify-center">
          <img
            src={logoSrc}
            alt="Mi Nómina"
            className="w-20 h-20 object-contain"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.style.display = 'none'; }}
          />
          <h1 className="text-2xl font-extrabold tracking-tight">Mi Nómina</h1>
        </div>

        <div className="flex justify-center gap-2 mb-4">
          <button className={`px-3 py-1 rounded-lg border border-slate-300 ${mode==='login'?'bg-black text-white':''}`} onClick={()=>{setMode('login');setErr('');}}>Iniciar sesión</button>
          <button className={`px-3 py-1 rounded-lg border border-slate-300 ${mode==='register'?'bg-black text-white':''}`} onClick={()=>{setMode('register');setErr('');}}>Crear cuenta</button>
        </div>

        <div className="space-y-3">
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Correo" value={email} onChange={e=> setEmail(e.target.value)} />
          <input className="w-full rounded-xl border border-slate-300 px-3 py-2" placeholder="Contraseña" type="password" value={password} onChange={e=> setPassword(e.target.value)} />
          {err && <div className="text-red-600 text-xs text-center">{err}</div>}
          {mode==='login'
            ? <button className="w-full bg-slate-900 text-white rounded-xl py-2.5 font-semibold shadow hover:bg-slate-800" onClick={doLogin}>Entrar</button>
            : <button className="w-full bg-slate-900 text-white rounded-xl py-2.5 font-semibold shadow hover:bg-slate-800" onClick={doRegister}>Registrarme</button>}
        </div>

        <p className="text-xs opacity-60 mt-3 text-center">* Datos guardados solo en este dispositivo.</p>
      </div>
    </div>
  );
}

// ------------------ USUARIO ------------------
function Usuario({ user, onSave, onCancel }){
  const [form, setForm] = useState({ ...user.profile });
  useEffect(()=> setForm({ ...user.profile }), [user]);
  return (
    <div className="min-h-screen bg-[#F6F2EA] p-4 md:p-8 text-slate-900">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img
          src={logoSrc}
          alt="Mi Nómina"
          className="w-14 h-14 object-contain"
            onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.style.display = "none";
            }}
            />
          <h1 className="text-2xl font-bold tracking-tight">Usuario</h1>
        </div>
        <div className="flex gap-2 items-center">
          <button className="px-3 py-1 rounded-lg border border-slate-300" onClick={onCancel}>Cancelar</button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-bold mb-3">Datos de la empresa</h2>
          <label className="block text-sm mb-2">Empresa
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 mt-1" value={form.empresa||''} onChange={e=> setForm(f=> ({...f, empresa: e.target.value}))} />
          </label>
          <label className="block text-sm mb-2">NIT
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 mt-1" value={form.nit||''} onChange={e=> setForm(f=> ({...f, nit: e.target.value}))} />
          </label>
          <label className="block text-sm mb-2">Ciudad
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 mt-1" value={form.ciudad||''} onChange={e=> setForm(f=> ({...f, ciudad: e.target.value}))} />
          </label>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
          <h2 className="text-lg font-bold mb-3">Datos del empleado</h2>
          <label className="block text-sm mb-2">Nombre completo
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 mt-1" value={form.fullName||''} onChange={e=> setForm(f=> ({...f, fullName: e.target.value}))} />
          </label>
          <label className="block text-sm mb-2">Cédula
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 mt-1" value={form.cedula||''} onChange={e=> setForm(f=> ({...f, cedula: e.target.value}))} />
          </label>
          <label className="block text-sm mb-2">Correo
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 mt-1" value={form.correo||''} onChange={e=> setForm(f=> ({...f, correo: e.target.value}))} />
          </label>
          <label className="block text-sm mb-2">Usuario
            <input className="w-full rounded-lg border border-slate-300 px-3 py-2 mt-1" value={form.usuarioName||''} onChange={e=> setForm(f=> ({...f, usuarioName: e.target.value}))} />
          </label>

          <div className="mt-3">
            <div className="text-sm font-semibold mb-2">Firma (PNG sin fondo recomendado)</div>
            {form.signatureDataUrl ? <img src={form.signatureDataUrl} alt="firma" className="max-w-full max-h-36 object-contain mb-2 border border-slate-200 rounded" /> : <div className="text-xs opacity-60 mb-2">No hay firma cargada.</div>}
            <input type="file" accept="image/*" onChange={(e)=>{ const f = e.target.files?.[0]; if(!f) return; const reader = new FileReader(); reader.onload = () => setForm(p => ({ ...p, signatureDataUrl: reader.result })); reader.readAsDataURL(f); }} />
          </div>
        </section>
      </main>

      <footer className="max-w-4xl mx-auto mt-6 flex justify-end gap-2">
        <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={onCancel}>Cancelar</button>
        <button className="px-4 py-2 rounded-lg bg-slate-900 text-white shadow hover:bg-slate-800" onClick={()=> onSave(form)}>Guardar</button>
      </footer>
    </div>
  );
}

// ------------------ MAIN APP ------------------
function MainApp({ user, replaceUser, patchCurrentUser, onLogout, goProfile }){
  const today = new Date();
  const [ym,setYm]=useState({ year: today.getFullYear(), month: today.getMonth() });
  const currentMonth = monthKey(ym.year, ym.month);
  const weekMatrix = useMemo(()=> buildMonthMatrix(ym.year, ym.month), [ym.year, ym.month]);

  function updateUserWith(partial){ const newUser = { ...user, ...partial }; replaceUser(newUser); }

  const monthWorkDays = useMemo(()=> user.workDays.filter(d=> d.date.slice(0,7) === currentMonth), [user.workDays, currentMonth]);
  const monthExpenses = useMemo(()=> user.expenses.filter(e=> e.month === currentMonth), [user.expenses, currentMonth]);

  function normalizeKind(kind){
    if(!kind) return 'GASTOS FIJOS';
    const k = kind.toString().toLowerCase();
    if(/credit|credt|credito|creditos/.test(k)) return 'CREDITOS';
    if(/suscrip|suscripci|subscription/.test(k)) return 'SUSCRIPCIONES';
    if(/fij|fijo|gasto/.test(k)) return 'GASTOS FIJOS';
    // fallback: keep original but normalized to fixed
    return k === 'variable' ? 'GASTOS FIJOS' : kind.toString().toUpperCase();
  }

  const monthWorkDaysVal = useMemo(()=> monthWorkDays.map(w=> {
    const t = user.dayTypes.find(dt=> dt.id === w.typeId);
    return { ...w, __value: t ? t.rate : (w.value||0), __color: t ? t.color : null };
  }), [monthWorkDays, user.dayTypes]);

  const ingresos = monthWorkDaysVal.reduce((a,b)=> a + (b.__value||0), 0);
  const gastos = monthExpenses.reduce((a,b)=> a + (b.amount||0), 0);
  const balance = ingresos - gastos;

  const q1Total = useMemo(()=> monthWorkDaysVal.filter(w => Number(w.date.split("-")[2]) <= 15).reduce((a,b)=> a + (b.__value||0),0), [monthWorkDaysVal]);
  const q2Total = useMemo(()=> monthWorkDaysVal.filter(w => Number(w.date.split("-")[2]) >= 16).reduce((a,b)=> a + (b.__value||0),0), [monthWorkDaysVal]);

  // workDays CRUD
  function addWorkDay({ date, typeId, isHoliday, place }){ const item = { id: uid(), date, typeId, isHoliday: !!isHoliday, place: place||'' }; updateUserWith({ workDays: [item, ...user.workDays] }); }
  function deleteWorkDay(id){ if(!confirm('Eliminar este día trabajado?')) return; updateUserWith({ workDays: user.workDays.filter(w=> w.id !== id) }); }

  // expenses CRUD
  function addExpense({ concept, amount, kind, recurring, date }){
    const month = date ? date.slice(0,7) : currentMonth;
    const item = { id: uid(), month, date: date||null, concept, amount: Number(amount)||0, kind: kind||'GASTOS FIJOS', recurring: !!recurring, paid:false };
    updateUserWith({ expenses: [item, ...user.expenses] });
  }

  function deleteExpense(id){
    if(!confirm('Eliminar este gasto?')) return;
    const target = user.expenses.find(e => e.id === id);
    if(!target){ return; }
    const key = (target.concept || '') + '|' + (target.amount||0);
    // remove all expenses that match the same concept|amount (this avoids recurring templates
    // re-adding the item later).
    const filtered = user.expenses.filter(e => (e.concept || '') + '|' + (e.amount||0) !== key);
    try{
      const newUser = { ...user, expenses: filtered };
      replaceUser(newUser);
      patchCurrentUser({ expenses: filtered });
    }catch(e){
      updateUserWith({ expenses: filtered });
    }
    try{ console.debug('deleteExpense -> removed key', key, 'remaining', filtered.length); }catch(_){ }
  }
  function toggleExpensePaid(id){ updateUserWith({ expenses: user.expenses.map(e=> e.id===id ? { ...e, paid: !e.paid } : e ) }); }

  // loans
  function addLoan({ person, amount, date }){ const item = { id: uid(), person, amount: Number(amount)||0, date: date || new Date().toISOString().slice(0,10), settled:false }; updateUserWith({ loans: [item, ...user.loans] }); }
  function deleteLoan(id){ if(!confirm('Eliminar este préstamo?')) return; updateUserWith({ loans: user.loans.filter(l => l.id !== id) }); }
  function settleLoan(id){ updateUserWith({ loans: user.loans.map(l => l.id === id ? { ...l, settled: !l.settled } : l) }); }
  function abonarLoan(id, amount){
    const amt = Number(amount) || 0;
    if(amt <= 0) return alert('Ingresa un valor válido para abonar.');
    const newLoans = user.loans.map(l => {
      if(l.id !== id) return l;
      const remaining = Math.max(0, l.amount - amt);
      return { ...l, amount: remaining, settled: remaining === 0 ? true : l.settled };
    });
    updateUserWith({ loans: newLoans });
  }

  // day types
  function createDayType({ name, place, rate, color }){ const t = { id: uid(), name, place: place||'', rate: Number(rate)||0, color: color||'#60a5fa' }; updateUserWith({ dayTypes: [t, ...user.dayTypes] }); }
  function deleteDayType(id){ updateUserWith({ dayTypes: user.dayTypes.filter(t => t.id !== id) }); }

  // copy recurring expenses when month changes
  // Only copy expenses explicitly marked `recurring` to avoid re-adding
  // items that exist in other months (was causing deleted items to reappear).
  useEffect(()=>{
    const exists = new Set(user.expenses.filter(e=> e.month === currentMonth).map(e=> e.concept + '|' + e.amount));
    const recurringAll = user.expenses.filter(e=> e.recurring);
    const toAdd = [];
    recurringAll.forEach(e=>{
      const key = e.concept + '|' + e.amount;
      if(!exists.has(key)){
        const copy = { ...e, id: uid(), month: currentMonth, paid:false };
        toAdd.push(copy);
        exists.add(key);
      }
    });
    if(toAdd.length) updateUserWith({ expenses: [...toAdd, ...user.expenses] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMonth]);

  // Invoice modal
  const [showInvoice, setShowInvoice] = useState(false);
  const [invoiceQ, setInvoiceQ] = useState(1);
  const [invoiceAmount, setInvoiceAmount] = useState(0);
  const [showExpenseModal, setShowExpenseModal] = useState(false);

  function openInvoiceModal(){ setInvoiceQ(1); setInvoiceAmount(q1Total); setShowInvoice(true); }
  function selectInvoiceQ(q){ setInvoiceQ(q); setInvoiceAmount(q === 1 ? q1Total : q2Total); }

  async function generatePDF(overrideAmount, quincena){
    const p = user.profile || {};
    const monthName = MONTHS_ES[ym.month];
    const year = ym.year;
    const fechaStr = new Date().toLocaleDateString('es-CO', { year:'numeric', month:'long', day:'numeric' });

    const doc = new jsPDF({ unit:'mm', format:'a4' });
    const pageWidth = 210;
    const centerX = pageWidth/2;
    const topMargin = 18;

    const ciudad = p.ciudad || 'Pereira';
    doc.setFontSize(11);
    doc.text(`${ciudad}, ${fechaStr}`, 20, topMargin);

    doc.setFontSize(20);
    doc.setFont(undefined, 'bold');
    doc.text('CUENTA DE COBRO', centerX, topMargin + 30, { align: 'center' });
    doc.setFont(undefined, 'normal');

    const empresaY = topMargin + 60;
    doc.setFontSize(11);
    if(p.empresa) doc.text(p.empresa, centerX, empresaY, { align: 'center' });
    if(p.nit) doc.text(`NIT ${p.nit}`, centerX, empresaY + 6, { align: 'center' });

    const debeAY = empresaY + 30;
    doc.setFontSize(11);
    doc.text('DEBE A:', centerX, debeAY, { align: 'center' });

    const nombreY = debeAY + 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text((p.fullName || '(TU NOMBRE)').toUpperCase(), centerX, nombreY, { align: 'center' });
    doc.setFont(undefined, 'normal');
    doc.setFontSize(11);
    doc.text(`C.C. ${p.cedula || '(TU CÉDULA)'}`, centerX, nombreY + 6, { align: 'center' });

    const sumaY = nombreY + 30;
    doc.setFontSize(11);
    doc.text('LA SUMA DE:', centerX, sumaY, { align: 'center' });
    const monto = Number(overrideAmount) || 0;
    const montoStr = fmtMoney(monto);
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text(montoStr, centerX, sumaY + 10, { align: 'center' });
    doc.setFont(undefined, 'normal');

    // Concept: only base concept (no quincena text)
    const conceptoY = sumaY + 30;
    doc.setFontSize(11);
    doc.text('CONCEPTO:', centerX, conceptoY, { align: 'center' });
    // Normalizar concepto: usar 'Mesero' por defecto o cuando venga como 'Servicio prestado' u otros valores genéricos
    const rawConcept = p.concepto;
    let conceptText = (rawConcept || '').toString().trim();
    const lcConcept = conceptText.toLowerCase();
    if (!conceptText) {
      conceptText = 'Mesero';
    } else if (/servici|presta|prestad|prestaci/.test(lcConcept)) {
      conceptText = 'Mesero';
    }
    try { console.debug('generatePDF - rawConcept:', rawConcept, '-> conceptText:', conceptText); } catch(e){}
    doc.setFontSize(11);
    doc.text(conceptText, centerX, conceptoY + 10, { align: 'center' });

    // Firma
    const footerY = 260;
    const sigX = 20;
    const maxWidth = 90;
    const maxHeight = 40;
    if(p.signatureDataUrl){
      try{
        const img = await new Promise((res,rej)=>{ const i = new Image(); i.onload = ()=> res(i); i.onerror = (e)=> rej(e); i.src = p.signatureDataUrl; });
        const ratio = img.naturalWidth / img.naturalHeight;
        let drawW = maxWidth;
        let drawH = drawW / ratio;
        if(drawH > maxHeight){ drawH = maxHeight; drawW = drawH * ratio; }
        if(drawW > pageWidth - sigX - 20){ drawW = pageWidth - sigX - 20; drawH = drawW / ratio; }
        const imgType = (p.signatureDataUrl.startsWith('data:image/png')) ? 'PNG' : 'JPEG';
        const sigY = footerY - drawH;
        doc.addImage(p.signatureDataUrl, imgType, sigX, sigY, drawW, drawH);
        doc.setDrawColor(120); doc.setLineWidth(0.5);
        const lineStartX = sigX; const lineEndX = sigX + drawW; const lineY = sigY + drawH + 3;
        doc.line(lineStartX, lineY, lineEndX, lineY);
        doc.setFontSize(10);
        doc.text((p.fullName || '(TU NOMBRE)').toUpperCase(), sigX, lineY + 6);
        doc.text(`C.C. ${p.cedula || '(TU CÉDULA)'}`, sigX, lineY + 12);
      }catch(e){
        console.warn('Firma no insertada:', e);
        doc.setDrawColor(120); doc.setLineWidth(0.5);
        doc.line(20, footerY, 100, footerY);
        doc.setFontSize(10);
        doc.text((p.fullName || '(TU NOMBRE)').toUpperCase(), 24, footerY+6);
        doc.text(`C.C. ${p.cedula || '(TU CÉDULA)'}`, 24, footerY+12);
      }
    } else {
      doc.setDrawColor(120); doc.setLineWidth(0.5);
      doc.line(20, footerY, 100, footerY);
      doc.setFontSize(10);
      doc.text((p.fullName || '(TU NOMBRE)').toUpperCase(), 24, footerY+6);
      doc.text(`C.C. ${p.cedula || '(TU CÉDULA)'}`, 24, footerY+12);
    }

    const safeEmpresa = (p.empresa || 'Cuenta').replace(/\s+/g, '_').slice(0,20);
    doc.save(`CuentaDeCobro_EstebanSanchezCardona_${safeEmpresa}_${monthName}_${year}.pdf`);
  }

  const [detailDate, setDetailDate] = useState(null);
  const [showTypesModal, setShowTypesModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F2EA] p-4 md:p-8 text-slate-900">
      <header className="max-w-6xl mx-auto flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img
          src={logoSrc}
          alt="Mi Nómina"
          className="w-14 h-14 object-contain"
            onError={(e) => {
            e.currentTarget.onerror = null;
            e.currentTarget.style.display = "none";
            }}
            />
          <h1 className="text-3xl font-extrabold tracking-tight">Mi Nómina</h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="opacity-80 hidden sm:inline">{user.profile?.fullName || user.email}</span>
          <button className="px-3 py-1 rounded-lg border border-slate-300" onClick={goProfile}>Usuario</button>
          <button className="px-3 py-1 rounded-lg border border-slate-300" onClick={onLogout}>Salir</button>
        </div>
      </header>

      <section className="max-w-6xl mx-auto mb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-center shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
          <div className="col-span-1 sm:col-span-1">
            <div className="rounded-xl p-4 shadow-[0_8px_20px_rgba(16,185,129,0.06)]" style={{ background: '#ECFDF3' }}>
              <div className="text-sm opacity-70">Ingresos</div>
              <div className="text-2xl font-extrabold tracking-tight text-emerald-700">{fmtMoney(ingresos)}</div>
              <div className="text-xs opacity-60">{monthWorkDays.length} días</div>
            </div>
          </div>

          <div className="col-span-1 sm:col-span-1">
            <div className="rounded-xl p-4 shadow-[0_8px_20px_rgba(239,68,68,0.04)]" style={{ background: '#FEF2F2' }}>
              <div className="text-sm opacity-70">Gastos</div>
              <div className="text-2xl font-extrabold tracking-tight text-rose-700">{fmtMoney(gastos)}</div>
              <div className="text-xs opacity-60">{monthExpenses.length} gastos</div>
            </div>
          </div>

          <div className="col-span-1 sm:col-span-1">
            <div className="rounded-xl p-4 shadow-[0_8px_20px_rgba(59,130,246,0.04)]" style={{ background: '#EFF6FF' }}>
              <div className="text-sm opacity-70">Balance</div>
              <div className="text-2xl font-extrabold tracking-tight text-sky-700">{fmtMoney(balance)}</div>
              <div className="text-xs opacity-60">{balance>=0 ? 'Ahorro' : 'Déficit'}</div>
            </div>
          </div>

          <div className="col-span-1 sm:col-span-1">
            <div className="flex flex-col gap-2">
              <button className="w-full bg-slate-900 text-white rounded-xl py-2 font-semibold shadow hover:bg-slate-800" onClick={openInvoiceModal}>Generar Cuenta de Cobro</button>
              <button className="w-full rounded-xl border border-slate-300 py-2" onClick={()=> setShowTypesModal(true)}>Tipos de día</button>
            </div>
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button className="px-3 py-1 rounded-lg border border-slate-300" onClick={()=> setYm(s=>{ const m = s.month-1; return m<0 ? { year: s.year-1, month:11 } : { year: s.year, month: m }; })}>◀</button>
                <div className="font-semibold">{MONTHS_ES[ym.month]} {ym.year}</div>
                <button className="px-3 py-1 rounded-lg border border-slate-300" onClick={()=> setYm(s=>{ const m = s.month+1; return m>11 ? { year: s.year+1, month:0 } : { year: s.year, month: m }; })}>▶</button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-2 text-center text-xs font-medium opacity-70 mb-1">{DAYS_SHORT.map(d=> <div key={d}>{d}</div>)}</div>
            <div className="grid grid-cols-7 gap-2">{weekMatrix.flat().map((d,idx)=> <CalendarCell key={idx} date={d} month={ym.month} user={user} onOpenDetail={(ds)=> setDetailDate(ds)} />)}</div>
            <div className="mt-3 text-xs opacity-70">Tip: pulsa el recuadro de un día para ver o registrar trabajo</div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="text-lg font-bold mb-2">Préstamos</div>
            <LoanPanel loans={user.loans} onAdd={addLoan} onToggle={settleLoan} onDelete={deleteLoan} onAbonar={abonarLoan} />
          </div>
        </section>

        <section className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
            <div className="flex items-center justify-between mb-2">
              <div className="text-lg font-bold">Gastos del mes</div>
              <div>
                <button className="px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold shadow hover:bg-slate-800" onClick={()=> setShowExpenseModal(true)}>Agregar Gasto</button>
              </div>
            </div>
            <div className="space-y-4">
              {monthExpenses.length===0 && <div className="text-sm opacity-60">Sin gastos aún.</div>}

              {(() => {
                const credits = monthExpenses.filter(e=> normalizeKind(e.kind) === 'CREDITOS').slice().sort((a,b)=> b.amount - a.amount);
                const fixed = monthExpenses.filter(e=> normalizeKind(e.kind) === 'GASTOS FIJOS').slice().sort((a,b)=> b.amount - a.amount);
                const subs = monthExpenses.filter(e=> normalizeKind(e.kind) === 'SUSCRIPCIONES').slice().sort((a,b)=> b.amount - a.amount);

                const Section = ({ title, items, titleBg }) => {
                  const total = items.reduce((s, it) => s + (Number(it.amount) || 0), 0);
                  return (
                      <div className="rounded-lg border border-slate-200 overflow-hidden">
                        <div className={`px-4 py-2 text-sm font-bold leading-tight text-center ${titleBg} text-white`}>{title}</div>
                      <div className="bg-white">
                        <table className="w-full table-fixed">
                          <thead>
                            <tr className="text-sm text-left">
                              <th className="px-4 py-2 w-1/2">Concepto</th>
                              <th className="px-4 py-2 w-1/4 text-right">Precio</th>
                              <th className="px-4 py-2 w-1/4 text-center">Acciones</th>
                            </tr>
                          </thead>
                          <tbody>
                            {items.map(e => (
                              <tr key={e.id} className={`border-t ${e.paid ? 'bg-emerald-50' : ''}`}>
                                  <td className={`px-3 py-2 align-middle min-w-0 ${e.paid ? 'text-emerald-800' : ''}`}>
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div className="text-sm font-semibold truncate">{e.concept}</div>
                                    </div>
                                  </td>
                                  <td className={`px-3 py-2 align-middle text-right text-sm whitespace-nowrap ${e.paid ? 'text-emerald-800' : ''}`}>{fmtMoney(e.amount)}</td>
                                <td className="px-4 py-3 align-middle text-center overflow-hidden">
                                  <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                    <button title={"Pago"} aria-label="marcar-pagado" onClick={()=> toggleExpensePaid(e.id)} className={("w-7 h-7 rounded-lg border flex items-center justify-center p-0.5 flex-shrink-0 "+(e.paid ? "bg-green-100 border-green-300":"bg-white border-slate-300"))}>
                                      {e.paid ? (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-green-700">
                                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      ) : (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-slate-700">
                                          <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                      )}
                                    </button>

                                    <button title="Eliminar" aria-label="eliminar" onClick={()=> deleteExpense(e.id)} className="w-7 h-7 rounded-lg border bg-white flex items-center justify-center flex-shrink-0 border-slate-200 hover:bg-rose-50 hover:border-rose-200 transition text-rose-600 font-semibold">
                                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden className="text-rose-600">
                                        <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                        <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                      </svg>
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                            {items.length===0 && (
                              <tr>
                                <td colSpan={3} className="px-4 py-3 text-sm opacity-60">No hay registros en esta categoría.</td>
                              </tr>
                            )}
                          </tbody>
                          <tfoot>
                            <tr className="text-sm font-semibold bg-slate-50">
                              <td className="px-4 py-2">Total</td>
                              <td className="px-4 py-2 text-right">{fmtMoney(total)}</td>
                              <td className="px-4 py-2" />
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  );
                };

                return (
                  <div className="space-y-3">
                    <Section title="CREDITOS" items={credits} titleBg="bg-indigo-600" />
                    <Section title="GASTOS FIJOS" items={fixed} titleBg="bg-rose-600" />
                    <Section title="SUSCRIPCIONES" items={subs} titleBg="bg-yellow-600" />
                  </div>
                );
              })()}
            </div>
          </div>
          
        </section>
      </main>

      {detailDate && <DayDetailModal date={detailDate} onClose={()=> setDetailDate(null)} user={user} dayTypes={user.dayTypes} onAddWork={(p)=> addWorkDay(p)} onDeleteWork={(id)=> deleteWorkDay(id)} />}

      {showTypesModal && <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"><div className="w-full max-w-2xl bg-white rounded-2xl p-4 shadow-[0_12px_28px_rgba(0,0,0,0.18)]"><div className="flex justify-between items-center mb-3"><h3 className="text-lg font-bold">Tipos de día</h3><button className="px-3 py-1 rounded-lg border border-slate-300" onClick={()=> setShowTypesModal(false)}>Cerrar</button></div><DayTypesManager types={user.dayTypes} onCreate={(t)=> createDayType(t)} onDelete={(id)=> deleteDayType(id)} /></div></div>}

      {showInvoice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Cuenta de Cobro</h3>
              <button className="px-3 py-1 rounded-lg border border-slate-300" onClick={()=> setShowInvoice(false)}>Cerrar</button>
            </div>

            <div className="space-y-3">
              <div className="text-sm opacity-70">Quincena base</div>
              <div className="flex gap-2">
                <button className={`flex-1 px-3 py-2 rounded-lg border ${invoiceQ===1 ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={()=> selectInvoiceQ(1)}>
                  Primera (1-15) — {fmtMoney(q1Total)}
                </button>
                <button className={`flex-1 px-3 py-2 rounded-lg border ${invoiceQ===2 ? 'bg-slate-900 text-white' : 'bg-white'}`} onClick={()=> selectInvoiceQ(2)}>
                  Segunda (16-fin) — {fmtMoney(q2Total)}
                </button>
              </div>

              <label className="block text-sm">
                <div className="mb-1">Monto (editable)</div>
                <input type="number" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={invoiceAmount} onChange={e=> setInvoiceAmount(Number(e.target.value))} />
              </label>

              <div className="text-xs opacity-60">Puedes editar el monto antes de generar la cuenta de cobro.</div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button className="px-4 py-2 rounded-lg border border-slate-300" onClick={()=> setShowInvoice(false)}>Cancelar</button>
              <button className="px-4 py-2 rounded-lg bg-slate-900 text-white" onClick={() => { generatePDF(invoiceAmount, invoiceQ); setShowInvoice(false); }}>Generar PDF</button>
            </div>
          </div>
        </div>
      )}

      {showExpenseModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-[0_12px_28px_rgba(0,0,0,0.18)]">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xl font-bold">Agregar Gasto</h3>
              <button className="px-3 py-1 rounded-lg border border-slate-300" onClick={()=> setShowExpenseModal(false)}>Cerrar</button>
            </div>
            <RegisterExpense onSubmit={(f)=> { addExpense(f); setShowExpenseModal(false); }} onClose={()=> setShowExpenseModal(false)} />
          </div>
        </div>
      )}

      <footer className="max-w-6xl mx-auto mt-10 text-xs opacity-60">Local-first • Guarda en tu dispositivo.</footer>
    </div>
  );
}

// ------------------ UI Components ------------------
function CalendarCell({ date, month, user, onOpenDetail }){
  if(!date) return <div className="h-20 rounded-xl border bg-white/40" />;
  const isOtherMonth = date.getMonth() !== month;
  const key = ymd(date);
  const workDays = user.workDays.filter(w => w.date === key);
  const indicators = [];
  workDays.forEach(w => { const t = user.dayTypes.find(dt => dt.id === w.typeId); if(t && !indicators.includes(t.color)) indicators.push(t.color); });
  const showIndicators = indicators.slice(0,4);
  const dayIncome = workDays.reduce((acc,w)=> { const t = user.dayTypes.find(dt => dt.id === w.typeId); return acc + (t ? t.rate : (w.value||0)); }, 0);
  return (
    <div role="button" tabIndex={0} onKeyDown={(e)=> { if(e.key==='Enter'||e.key===' ') onOpenDetail(key); }} onClick={()=> onOpenDetail(key)} className={`h-20 rounded-xl border bg-white p-2 flex flex-col justify-between ${isOtherMonth? 'opacity-40':''} cursor-pointer shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold">{date.getDate()}</div>
        <div className="flex gap-1">{showIndicators.map((c,i)=> <span key={i} className="w-3 h-3 rounded-sm border" style={{ background: c }} />)}</div>
      </div>
      <div className="flex items-end justify-between">
        {dayIncome>0 ? <div className="text-[11px] font-semibold">{fmtMoney(dayIncome)}</div> : <div className="text-[11px] opacity-50"> </div>}
        <div className="text-xs opacity-60">&nbsp;</div>
      </div>
    </div>
  );
}

function DayDetailModal({ date, onClose, user, dayTypes, onAddWork, onDeleteWork }){
  const dayWork = user.workDays.filter(w => w.date === date).slice().sort((a,b)=> (a.id<b.id?1:-1));
  const [workTypeId, setWorkTypeId] = useState(dayTypes[0]?.id||'');
  const [isHoliday, setIsHoliday] = useState(false);
  const [place,setPlace]=useState('');
  useEffect(()=>{ setWorkTypeId(dayTypes[0]?.id||''); setIsHoliday(false); setPlace(''); }, [dayTypes, date]);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-sm opacity-70">Detalle – {new Date(date).toLocaleDateString('es-CO', { weekday:'long', day:'numeric', month:'long', year:'numeric' })}</div>
            <div className="text-xs opacity-50">Trabajos del día</div>
          </div>
          <div className="flex gap-2"><button className="px-3 py-1 rounded-lg border border-slate-300" onClick={onClose}>Cerrar</button></div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="rounded-xl border p-3">
            <div className="text-sm font-bold mb-2">Registrar trabajo</div>
            <label className="block text-xs mb-2">Tipo</label>
            <select className="w-full rounded-lg border px-3 py-2 mb-2" value={workTypeId} onChange={e=> setWorkTypeId(e.target.value)}>
              {dayTypes.map(t=> <option key={t.id} value={t.id}>{t.name} — {fmtMoney(t.rate)}</option>)}
            </select>

            <label className="block text-xs mb-2">Lugar (opcional)</label>
            <input className="w-full rounded-lg border px-3 py-2 mb-2" placeholder="Ej. Gato Bandido" value={place} onChange={e=> setPlace(e.target.value)} />

            <label className="flex items-center gap-2 mb-2"><input type="checkbox" checked={isHoliday} onChange={e=> setIsHoliday(e.target.checked)} /> Día festivo</label>

            <div className="flex gap-2">
              <button className="flex-1 bg-slate-900 text-white rounded-xl py-2.5 font-semibold" onClick={()=> { if(!workTypeId) return alert('Selecciona un tipo'); onAddWork({ date, typeId: workTypeId, isHoliday, place }); }}>Agregar trabajo</button>
            </div>
          </div>

          <div className="rounded-xl border p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-bold">Trabajos registrados</div>
              <div className="text-xs opacity-60">{dayWork.length} registros</div>
            </div>

            {dayWork.length===0 && <div className="text-xs opacity-60 mb-2">No hay trabajos registrados en este día.</div>}

            {dayWork.map(w=> {
              const t = dayTypes.find(dt=> dt.id === w.typeId);
              const rateStr = t ? fmtMoney(t.rate) : fmtMoney(w.value);
              return (
                <div key={w.id} className="p-2 rounded-lg border mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div style={{ width:18, height:18, background: t?.color||'#ddd', borderRadius:4 }} />
                    <div>
                      <div className="font-semibold">{t? t.name : '(tipo)'}</div>
                      <div className="text-xs opacity-60">{rateStr} {w.place ? `• ${w.place}` : ''} {w.isHoliday ? '• Festivo' : ''}</div>
                    </div>
                  </div>

                  <div className="flex items-end flex-col gap-2">
                    <div className="font-semibold text-sm">{rateStr}</div>
                    <div className="flex gap-2">
                      <button className="text-xs px-2 py-1 rounded-lg border" onClick={()=> onDeleteWork(w.id)}>Eliminar</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function RegisterExpense({ onSubmit, onClose }){
  const [form,setForm]=useState({ concept:'', amount:'', kind:'GASTOS FIJOS', recurring:false });
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
      <div className="text-lg font-bold mb-2">Registrar gastos</div>
      <div className="space-y-3 text-sm">
        <input type="text" placeholder="Concepto" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.concept} onChange={e=> setForm({...form, concept: e.target.value})} />
        <input type="number" placeholder="Valor" className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.amount} onChange={e=> setForm({...form, amount: e.target.value})} />
        <select className="w-full rounded-lg border border-slate-300 px-3 py-2" value={form.kind} onChange={e=> setForm({...form, kind: e.target.value})}>
          <option value="CREDITOS">CREDITOS</option>
          <option value="GASTOS FIJOS">GASTOS FIJOS</option>
          <option value="SUSCRIPCIONES">SUSCRIPCIONES</option>
        </select>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.recurring} onChange={e=> setForm({...form, recurring: e.target.checked})} /> Recurrente (se copiará a próximos meses)
        </label>

        <div className="flex gap-2">
          <button className="flex-1 bg-slate-900 text-white rounded-xl py-2.5 font-semibold" onClick={()=> { if(!form.concept||!form.amount) return alert('Completa el concepto y el valor'); onSubmit(form); setForm({ concept:'', amount:'', kind:form.kind, recurring:form.recurring }); if(typeof onClose === 'function') onClose(); }}>Registrar gasto</button>
        </div>
      </div>
    </div>
  );
}

function LoanPanel({ loans, onAdd, onToggle, onDelete, onAbonar }){
  const [form, setForm]=useState({ person:'', amount:'' });
  const [abonos, setAbonos] = useState({}); // {loanId: value}
  useEffect(()=> { // reset abonos when loans change
    const map = {};
    loans.forEach(l => map[l.id] = '');
    setAbonos(map);
  }, [loans]);

  const totalOpen = loans.filter(l=>!l.settled).reduce((a,b)=> a + b.amount, 0);
  return (
    <div className="space-y-3 text-sm">
      <div className="flex gap-2">
        <input type="text" placeholder="Persona" className="flex-1 rounded-lg border border-slate-300 px-3 py-2" value={form.person} onChange={e=> setForm({...form, person: e.target.value})} />
        <input type="number" placeholder="Monto" className="w-32 rounded-lg border border-slate-300 px-3 py-2" value={form.amount} onChange={e=> setForm({...form, amount: e.target.value})} />
        <button className="rounded-xl bg-slate-900 text-white px-3 font-semibold" onClick={()=> { if(!form.person||!form.amount) return alert('Completa los campos'); onAdd({ person: form.person, amount: form.amount }); setForm({ person:'', amount:'' }); }}>Agregar</button>
      </div>

      <div className="text-xs opacity-70">Total abierto: <span className="font-semibold">{fmtMoney(totalOpen)}</span></div>

      <ul className="space-y-2">
        {loans.length===0 && <li className="opacity-60">No hay préstamos.</li>}
        {loans.slice().sort((a,b)=> b.amount - a.amount).map(l=> (
          <li key={l.id} className="rounded-xl border border-slate-200 p-3 flex items-center justify-between bg-white">
            <div>
              <div className="font-semibold">{l.person}</div>
              <div className="text-xs opacity-60">{new Date(l.date).toLocaleDateString('es-CO')}</div>
            </div>

            <div className="flex items-center gap-3">
              <div className="font-semibold w-28 text-right">{fmtMoney(l.amount)}</div>

              <div className="flex items-center gap-2">
                <input type="number" placeholder="Abonar" value={abonos[l.id] || ''} onChange={e=> setAbonos(s => ({ ...s, [l.id]: e.target.value }))} className="w-24 rounded-lg border border-slate-300 px-2 py-1 text-sm" />
                <button className="text-xs px-3 py-1 rounded-lg border bg-white" onClick={()=> { if(!onAbonar) return; const val = Number(abonos[l.id]||0); if(!val) return alert('Ingresa un valor para abonar'); onAbonar(l.id, val); }}>Abonar</button>

                <button className={"text-xs px-3 py-1 rounded-lg border "+(l.settled ? 'bg-green-100 border-green-300' : 'bg-white')} onClick={()=> onToggle(l.id)}>{l.settled ? 'Saldado' : 'Marcar saldado'}</button>
                <button className="text-xs px-3 py-1 rounded-lg border bg-white" onClick={()=> onDelete(l.id)}>Eliminar</button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function DayTypesManager({ types, onCreate, onDelete }){
  const [f,setF]=useState({ name:'', place:'', rate:'', color:'#60a5fa' });
  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <input className="flex-1 rounded-lg border border-slate-300 px-3 py-2" placeholder="Nombre" value={f.name} onChange={e=> setF({...f, name: e.target.value})} />
        <input className="flex-1 rounded-lg border border-slate-300 px-3 py-2" placeholder="Lugar" value={f.place} onChange={e=> setF({...f, place: e.target.value})} />
        <input className="w-36 rounded-lg border border-slate-300 px-3 py-2" placeholder="Precio" type="number" value={f.rate} onChange={e=> setF({...f, rate: e.target.value})} />
        <input type="color" value={f.color} onChange={e=> setF({...f, color: e.target.value})} className="w-12 h-10 rounded-md border" />
        <button className="rounded-xl bg-slate-900 text-white px-3 font-semibold" onClick={()=> { if(!f.name||!f.rate) return alert('Nombre y precio'); onCreate(f); setF({ name:'', place:'', rate:'', color:'#60a5fa' }); }}>Agregar</button>
      </div>

      <ul className="space-y-2">
        {types.length===0 && <li className="opacity-60">No hay tipos. Crea uno.</li>}
        {types.map(t=> (
          <li key={t.id} className="rounded-xl border border-slate-200 p-2 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div style={{ width:18, height:18, background: t.color, borderRadius:4 }} />
              <div>
                <div className="font-semibold">{t.name}</div>
                <div className="text-xs opacity-60">{t.place||'Sin lugar'}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="font-semibold">{fmtMoney(t.rate)}</div>
              <button className="text-xs px-2 py-1 rounded-lg border" onClick={()=> onDelete(t.id)}>Eliminar</button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
