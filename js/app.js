// ============================================================
// SpendWise – Full React Application
// ============================================================
const { useState, useEffect, useCallback, useRef, useMemo } = React;
// Recharts - loaded from UMD bundle
const RechartsLib = window.Recharts || {};
const PieChart = RechartsLib.PieChart;
const Pie = RechartsLib.Pie;
const Cell = RechartsLib.Cell;
const BarChart = RechartsLib.BarChart;
const Bar = RechartsLib.Bar;
const XAxis = RechartsLib.XAxis;
const YAxis = RechartsLib.YAxis;
const Tooltip = RechartsLib.Tooltip;
const ResponsiveContainer = RechartsLib.ResponsiveContainer;
const LineChart = RechartsLib.LineChart;
const Line = RechartsLib.Line;

// ── Helpers ───────────────────────────────────────────────────
const fmt = (amount, currency) => `${currency}${parseFloat(amount || 0).toFixed(2)}`;
const today = () => new Date().toISOString().split('T')[0];
const monthStart = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`; };
const monthLabel = (dateStr) => { if(!dateStr) return ''; const d = new Date(dateStr+'T00:00:00'); return d.toLocaleDateString('en-US',{month:'short',day:'numeric'}); };
const fullDate = (dateStr) => { if(!dateStr) return ''; const d = new Date(dateStr+'T00:00:00'); return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'}); };

// ── Toast ─────────────────────────────────────────────────────
const Toast = ({ toasts }) => (
  <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 w-[90vw] max-w-sm pointer-events-none">
    {toasts.map(t => (
      <div key={t.id} className={`animate-fade-in flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-medium shadow-2xl pointer-events-auto
        ${t.type==='success' ? 'bg-emerald-500 text-white' : t.type==='error' ? 'bg-red-500 text-white' : 'bg-brand-500 text-white'}`}>
        <i className={`fas ${t.type==='success' ? 'fa-check-circle' : t.type==='error' ? 'fa-exclamation-circle' : 'fa-info-circle'}`}/>
        {t.message}
      </div>
    ))}
  </div>
);

// ── Modal ─────────────────────────────────────────────────────
const Modal = ({ open, onClose, title, children, size='md' }) => {
  if(!open) return null;
  return (
    <div className="modal-overlay fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className={`modal-content glass bg-dark-700/95 border border-white/10 rounded-t-3xl sm:rounded-3xl w-full ${size==='lg'?'max-w-lg':size==='xl'?'max-w-xl':'max-w-md'} max-h-[90vh] overflow-y-auto safe-bottom`}>
        <div className="flex items-center justify-between p-5 border-b border-white/10">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors">
            <i className="fas fa-times text-sm"/>
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};

// ── Confirm Dialog ────────────────────────────────────────────
const ConfirmDialog = ({ open, title, message, onConfirm, onCancel, danger }) => (
  <Modal open={open} onClose={onCancel} title={title}>
    <p className="text-white/70 text-sm mb-6">{message}</p>
    <div className="flex gap-3">
      <button onClick={onCancel} className="flex-1 py-3 rounded-2xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-colors">Cancel</button>
      <button onClick={onConfirm} className={`flex-1 py-3 rounded-2xl font-semibold transition-colors ${danger ? 'bg-red-500 hover:bg-red-600' : 'bg-brand-500 hover:bg-brand-600'} text-white`}>Confirm</button>
    </div>
  </Modal>
);

// ── Stat Card ─────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon, color, glow }) => (
  <div className={`gradient-card border ${glow==='red'?'border-red-500/30 unpaid-glow':glow==='green'?'border-emerald-500/30 paid-glow':'border-white/10'} rounded-2xl p-4 flex flex-col gap-1`}>
    <div className="flex items-center justify-between">
      <span className="text-white/50 text-xs font-medium uppercase tracking-wider">{label}</span>
      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${color}`}>
        <i className={`fas ${icon} text-sm`}/>
      </div>
    </div>
    <div className="text-2xl font-bold text-white mt-1">{value}</div>
    {sub && <div className="text-xs text-white/50">{sub}</div>}
  </div>
);

// ── Category Badge ────────────────────────────────────────────
const CatBadge = ({ cat, size='sm' }) => {
  if(!cat) return null;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium`}
      style={{ background: `${cat.color}22`, color: cat.color, border: `1px solid ${cat.color}44` }}>
      <i className={`fas ${cat.icon} text-[10px]`}/>
      {cat.name}
    </span>
  );
};

// ── Empty State ───────────────────────────────────────────────
const EmptyState = ({ icon, title, sub }) => (
  <div className="flex flex-col items-center justify-center py-14 gap-3">
    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
      <i className={`fas ${icon} text-2xl text-white/20`}/>
    </div>
    <p className="text-white/50 font-semibold">{title}</p>
    {sub && <p className="text-white/30 text-sm">{sub}</p>}
  </div>
);

// ── DASHBOARD ─────────────────────────────────────────────────
const Dashboard = ({ expenses, categories, currency, onAddExpense, onSettle }) => {
  const catMap = useMemo(()=>Object.fromEntries(categories.map(c=>[c.id,c])),[categories]);
  const todayStr = today();
  const mStart = monthStart();

  const todayExp = useMemo(()=>expenses.filter(e=>e.date===todayStr),[expenses,todayStr]);
  const monthExp = useMemo(()=>expenses.filter(e=>e.date>=mStart),[expenses,mStart]);
  const unpaid = useMemo(()=>expenses.filter(e=>e.status==='unpaid'),[expenses]);
  const paid = useMemo(()=>expenses.filter(e=>e.status==='paid'),[expenses]);

  const todayTotal = todayExp.reduce((s,e)=>s+e.amount,0);
  const monthTotal = monthExp.reduce((s,e)=>s+e.amount,0);
  const unpaidTotal = unpaid.reduce((s,e)=>s+e.amount,0);
  const paidTotal = paid.reduce((s,e)=>s+e.amount,0);

  // unpaid by category
  const unpaidByCat = useMemo(()=>{
    const map = {};
    for(const e of unpaid){
      map[e.category] = (map[e.category]||0)+e.amount;
    }
    return Object.entries(map).map(([id,amount])=>({id, amount, cat: catMap[id]})).sort((a,b)=>b.amount-a.amount);
  },[unpaid, catMap]);

  // monthly spending bar (last 7 days)
  const last7 = useMemo(()=>{
    const days = [];
    for(let i=6;i>=0;i--){
      const d = new Date(); d.setDate(d.getDate()-i);
      const ds = d.toISOString().split('T')[0];
      const total = expenses.filter(e=>e.date===ds).reduce((s,e)=>s+e.amount,0);
      days.push({ day: d.toLocaleDateString('en-US',{weekday:'short'}), total, date: ds });
    }
    return days;
  },[expenses]);

  // pie chart data
  const pieData = useMemo(()=>{
    const map = {};
    for(const e of monthExp){ map[e.category]=(map[e.category]||0)+e.amount; }
    return Object.entries(map).map(([id,value])=>({name: catMap[id]?.name||id, value, color: catMap[id]?.color||'#6366f1'}));
  },[monthExp,catMap]);

  const CHART_COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#64748b'];

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <p className="text-white/50 text-sm">{new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'})}</p>
          <h1 className="text-2xl font-bold text-white">SpendWise <span className="text-brand-500">💸</span></h1>
        </div>
        <button onClick={onAddExpense} className="w-11 h-11 rounded-2xl bg-brand-500 hover:bg-brand-600 flex items-center justify-center shadow-lg shadow-brand-500/30 transition-all active:scale-95">
          <i className="fas fa-plus text-white"/>
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Today" value={fmt(todayTotal,currency)} sub={`${todayExp.length} expense${todayExp.length!==1?'s':''}`} icon="fa-calendar-day" color="bg-brand-500/20 text-brand-500"/>
        <StatCard label="This Month" value={fmt(monthTotal,currency)} sub={`${monthExp.length} transactions`} icon="fa-calendar-alt" color="bg-purple-500/20 text-purple-400"/>
        <StatCard label="Outstanding" value={fmt(unpaidTotal,currency)} sub={`${unpaid.length} unpaid`} icon="fa-clock" color="bg-red-500/20 text-red-400" glow="red"/>
        <StatCard label="Settled" value={fmt(paidTotal,currency)} sub={`${paid.length} paid`} icon="fa-check-circle" color="bg-emerald-500/20 text-emerald-400" glow="green"/>
      </div>

      {/* Outstanding by Category */}
      {unpaidByCat.length>0 && (
        <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-white text-sm flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse-slow inline-block"/>
              Outstanding Balance
            </h2>
            <span className="text-red-400 text-sm font-bold">{fmt(unpaidTotal,currency)}</span>
          </div>
          <div className="flex flex-col gap-2">
            {unpaidByCat.slice(0,5).map(({id,amount,cat})=>{
              const pct = unpaidTotal>0?(amount/unpaidTotal)*100:0;
              return (
                <div key={id} className="flex items-center gap-3">
                  <div className="flex items-center gap-2 w-[110px]">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{background: cat?.color||'#6366f1'}}/>
                    <span className="text-white/70 text-xs truncate">{cat?.name||id}</span>
                  </div>
                  <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full progress-bar transition-all duration-500" style={{width:`${pct}%`}}/>
                  </div>
                  <span className="text-white text-xs font-semibold w-16 text-right">{fmt(amount,currency)}</span>
                  <button onClick={()=>onSettle(id)} className="flex-shrink-0 px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/30 transition-colors">
                    Pay
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 7-Day Spending Chart */}
      {last7.some(d=>d.total>0) && (
        <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4">
          <h2 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <i className="fas fa-chart-bar text-brand-500 text-xs"/>
            Last 7 Days
          </h2>
          <div style={{height:'160px'}}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={last7} barSize={28}>
                <XAxis dataKey="day" tick={{fill:'#ffffff60',fontSize:11}} axisLine={false} tickLine={false}/>
                <YAxis hide />
                <Tooltip
                  contentStyle={{background:'#1e293b',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'#fff'}}
                  formatter={(v)=>[`${currency}${v.toFixed(2)}`,'Amount']}
                  cursor={{fill:'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="total" radius={[6,6,0,0]}>
                  {last7.map((entry,i)=>(
                    <Cell key={i} fill={entry.date===todayStr ? '#6366f1' : '#6366f133'}/>
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Category Pie */}
      {pieData.length>0 && (
        <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4">
          <h2 className="font-bold text-white text-sm mb-4 flex items-center gap-2">
            <i className="fas fa-chart-pie text-brand-500 text-xs"/>
            Monthly Breakdown
          </h2>
          <div className="flex items-center gap-4">
            <div style={{height:'140px', minWidth:'140px'}}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={42} outerRadius={65} paddingAngle={2} dataKey="value">
                    {pieData.map((entry,i)=><Cell key={i} fill={entry.color}/>)}
                  </Pie>
                  <Tooltip contentStyle={{background:'#1e293b',border:'1px solid rgba(255,255,255,0.1)',borderRadius:'12px',color:'#fff'}} formatter={(v)=>[`${currency}${v.toFixed(2)}`]}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-1.5 flex-1 min-w-0">
              {pieData.slice(0,5).map((d,i)=>(
                <div key={i} className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:d.color}}/>
                  <span className="text-white/60 text-xs truncate flex-1">{d.name}</span>
                  <span className="text-white text-xs font-semibold">{fmt(d.value,currency)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-white text-sm">Recent Transactions</h2>
          <span className="text-white/40 text-xs">{expenses.length} total</span>
        </div>
        {expenses.length===0
          ? <EmptyState icon="fa-receipt" title="No expenses yet" sub="Tap + to add your first expense"/>
          : expenses.slice(0,5).map(e=>(
            <ExpenseRow key={e.id} expense={e} cat={catMap[e.category]} currency={currency} compact/>
          ))
        }
      </div>
    </div>
  );
};

// ── EXPENSE ROW ───────────────────────────────────────────────
const ExpenseRow = ({ expense, cat, currency, compact, onEdit, onDelete }) => (
  <div className={`swipe-card flex items-center gap-3 py-3 ${!compact?'bg-dark-700/40 border border-white/5 rounded-2xl px-4 mb-2':''} ${compact?'border-b border-white/5 last:border-0':''}`}>
    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{background:`${cat?.color||'#6366f1'}22`}}>
      <i className={`fas ${cat?.icon||'fa-tag'} text-sm`} style={{color:cat?.color||'#6366f1'}}/>
    </div>
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2">
        <span className="text-white font-semibold text-sm truncate">{cat?.name||expense.category}</span>
        <span className={`flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${expense.status==='paid' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
          {expense.status==='paid'?'✓ Paid':'Unpaid'}
        </span>
      </div>
      <div className="flex items-center gap-2 mt-0.5">
        <span className="text-white/40 text-xs">{fullDate(expense.date)}</span>
        {expense.note && <span className="text-white/30 text-xs truncate">· {expense.note}</span>}
      </div>
      {expense.status==='paid'&&expense.paidDate&&(
        <div className="text-emerald-400/60 text-[10px] mt-0.5">Paid on {fullDate(expense.paidDate)}</div>
      )}
    </div>
    <div className="flex flex-col items-end gap-1">
      <span className="text-white font-bold text-sm">{fmt(expense.amount,currency)}</span>
      {!compact && (
        <div className="flex gap-1">
          {onEdit&&<button onClick={()=>onEdit(expense)} className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center hover:bg-brand-500/30 transition-colors"><i className="fas fa-pen text-[10px]"/></button>}
          {onDelete&&<button onClick={()=>onDelete(expense.id)} className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors"><i className="fas fa-trash text-[10px]"/></button>}
        </div>
      )}
    </div>
  </div>
);

// ── ADD/EDIT EXPENSE MODAL ────────────────────────────────────
const ExpenseModal = ({ open, onClose, onSave, categories, editExpense }) => {
  const [form, setForm] = useState({ amount:'', category:'food', date:today(), note:'', status:'unpaid' });
  const [errors, setErrors] = useState({});

  useEffect(()=>{
    if(open){
      setErrors({});
      if(editExpense){ setForm({amount:String(editExpense.amount), category:editExpense.category, date:editExpense.date, note:editExpense.note||'', status:editExpense.status}); }
      else setForm({ amount:'', category: categories[0]?.id||'food', date:today(), note:'', status:'unpaid' });
    }
  },[open, editExpense, categories]);

  const validate = () => {
    const e = {};
    if(!form.amount||isNaN(form.amount)||parseFloat(form.amount)<=0) e.amount='Enter a valid amount';
    if(!form.date) e.date='Select a date';
    setErrors(e);
    return Object.keys(e).length===0;
  };

  const handleSave = () => { if(validate()) onSave(form); };

  const catMap = useMemo(()=>Object.fromEntries(categories.map(c=>[c.id,c])),[categories]);

  return (
    <Modal open={open} onClose={onClose} title={editExpense?'Edit Expense':'Add Expense'} size="lg">
      {/* Amount */}
      <div className="mb-4">
        <label className="text-white/60 text-xs font-medium mb-1.5 block">Amount *</label>
        <div className="relative">
          <input type="number" inputMode="decimal" placeholder="0.00" step="0.01" min="0"
            className={`w-full bg-dark-800/80 border ${errors.amount?'border-red-500':'border-white/10'} rounded-2xl px-4 py-3.5 text-white text-xl font-bold placeholder-white/20 focus:outline-none focus:border-brand-500/60 transition-colors`}
            value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))}/>
        </div>
        {errors.amount&&<p className="text-red-400 text-xs mt-1">{errors.amount}</p>}
      </div>

      {/* Category */}
      <div className="mb-4">
        <label className="text-white/60 text-xs font-medium mb-1.5 block">Category *</label>
        <div className="grid grid-cols-4 gap-2">
          {categories.map(cat=>(
            <button key={cat.id} onClick={()=>setForm(f=>({...f,category:cat.id}))}
              className={`flex flex-col items-center gap-1.5 p-2.5 rounded-2xl border transition-all ${form.category===cat.id ? 'border-brand-500/60 bg-brand-500/10' : 'border-white/10 bg-dark-800/60 hover:border-white/20'}`}>
              <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{background:`${cat.color}22`}}>
                <i className={`fas ${cat.icon} text-xs`} style={{color:cat.color}}/>
              </div>
              <span className="text-white/70 text-[10px] font-medium text-center leading-tight">{cat.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date */}
      <div className="mb-4">
        <label className="text-white/60 text-xs font-medium mb-1.5 block">Date *</label>
        <input type="date"
          className={`w-full bg-dark-800/80 border ${errors.date?'border-red-500':'border-white/10'} rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/60 transition-colors`}
          value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))}/>
        {errors.date&&<p className="text-red-400 text-xs mt-1">{errors.date}</p>}
      </div>

      {/* Note */}
      <div className="mb-5">
        <label className="text-white/60 text-xs font-medium mb-1.5 block">Note (optional)</label>
        <input type="text" placeholder="Add a note..."
          className="w-full bg-dark-800/80 border border-white/10 rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500/60 transition-colors"
          value={form.note} onChange={e=>setForm(f=>({...f,note:e.target.value}))}/>
      </div>

      <button onClick={handleSave}
        className="w-full py-4 rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold text-base shadow-lg shadow-brand-500/30 active:scale-[0.98] transition-all">
        {editExpense ? 'Save Changes' : 'Add Expense'}
      </button>
    </Modal>
  );
};

// ── SETTLE MODAL ──────────────────────────────────────────────
const SettleModal = ({ open, onClose, category, expenses, categories, currency, onSettle }) => {
  const [paidDate, setPaidDate] = useState(today());
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState([]);

  const cat = categories.find(c=>c.id===category);
  const catExpenses = useMemo(()=>expenses.filter(e=>e.category===category&&e.status==='unpaid').sort((a,b)=>a.date.localeCompare(b.date)),[expenses, category]);
  const oldestDate = catExpenses[0]?.date;
  const latestDate = catExpenses[catExpenses.length-1]?.date;
  const total = catExpenses.reduce((s,e)=>s+e.amount, 0);

  useEffect(()=>{
    if(open){ setPaidDate(today()); }
  },[open]);

  useEffect(()=>{
    const prev = catExpenses.filter(e=>e.date<=paidDate);
    setPreview(prev);
  },[catExpenses, paidDate]);

  const previewTotal = preview.reduce((s,e)=>s+e.amount,0);

  const handleSettle = async () => {
    if(preview.length===0){ return; }
    setLoading(true);
    await onSettle(category, paidDate);
    setLoading(false);
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} title="Settle Payment" size="lg">
      {catExpenses.length===0 ? (
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-check-circle text-2xl text-emerald-500"/>
          </div>
          <p className="text-white font-semibold">All Settled!</p>
          <p className="text-white/50 text-sm mt-1">No unpaid expenses in {cat?.name||category}</p>
        </div>
      ) : (
        <>
          {/* Category Info */}
          <div className="bg-dark-800/60 rounded-2xl p-4 mb-4 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${cat?.color||'#6366f1'}22`}}>
                <i className={`fas ${cat?.icon||'fa-tag'}`} style={{color:cat?.color||'#6366f1'}}/>
              </div>
              <div>
                <p className="text-white font-bold">{cat?.name||category}</p>
                <p className="text-white/50 text-xs">{catExpenses.length} unpaid expense{catExpenses.length!==1?'s':''}</p>
              </div>
              <div className="ml-auto text-right">
                <p className="text-red-400 font-bold text-lg">{fmt(total,currency)}</p>
                <p className="text-white/40 text-xs">Total Outstanding</p>
              </div>
            </div>
            <div className="flex gap-4 pt-3 border-t border-white/10">
              <div>
                <p className="text-white/40 text-xs">Oldest Unpaid</p>
                <p className="text-white text-sm font-semibold">{fullDate(oldestDate)}</p>
              </div>
              <div>
                <p className="text-white/40 text-xs">Latest Unpaid</p>
                <p className="text-white text-sm font-semibold">{fullDate(latestDate)}</p>
              </div>
            </div>
          </div>

          {/* Paid Date Selector */}
          <div className="mb-4">
            <label className="text-white/60 text-xs font-medium mb-1.5 block">
              <i className="fas fa-calendar-check mr-1 text-brand-500"/>
              Mark as Paid up to date
            </label>
            <input type="date" value={paidDate} onChange={e=>setPaidDate(e.target.value)}
              className="w-full bg-dark-800/80 border border-white/10 rounded-2xl px-4 py-3 text-white focus:outline-none focus:border-brand-500/60 transition-colors"/>
          </div>

          {/* Preview */}
          <div className="mb-5 bg-dark-800/40 rounded-2xl p-3 border border-white/5">
            <p className="text-white/50 text-xs font-medium mb-2">
              <i className="fas fa-eye mr-1"/>
              Settlement Preview: {preview.length} expense{preview.length!==1?'s':''} on or before {fullDate(paidDate)}
            </p>
            <div className="max-h-40 overflow-y-auto flex flex-col gap-1.5">
              {preview.length===0 ? (
                <p className="text-white/30 text-xs py-2 text-center">No expenses on or before this date</p>
              ) : preview.map(e=>(
                <div key={e.id} className="flex items-center justify-between text-xs">
                  <span className="text-white/60">{fullDate(e.date)}</span>
                  {e.note&&<span className="text-white/30 truncate mx-2 flex-1">{e.note}</span>}
                  <span className="text-white font-semibold">{fmt(e.amount,currency)}</span>
                </div>
              ))}
            </div>
            {preview.length>0&&(
              <div className="flex justify-between items-center pt-2 border-t border-white/10 mt-2">
                <span className="text-white/60 text-xs font-medium">Total to settle</span>
                <span className="text-emerald-400 font-bold">{fmt(previewTotal,currency)}</span>
              </div>
            )}
          </div>

          <button onClick={handleSettle} disabled={loading||preview.length===0}
            className={`w-full py-4 rounded-2xl font-bold text-base transition-all active:scale-[0.98] ${preview.length>0&&!loading ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/30' : 'bg-white/10 text-white/40 cursor-not-allowed'}`}>
            {loading ? <><i className="fas fa-spinner fa-spin mr-2"/>Settling...</>
              : preview.length>0 ? <>✅ Mark {preview.length} Expense{preview.length!==1?'s':''} as Paid</>
              : 'No expenses to settle'}
          </button>
        </>
      )}
    </Modal>
  );
};

// ── EXPENSES LIST ─────────────────────────────────────────────
const ExpensesList = ({ expenses, categories, currency, onAdd, onEdit, onDelete, onSettle }) => {
  const [filter, setFilter] = useState({ status:'all', category:'all', dateFrom:'', dateTo:'' });
  const [sort, setSort] = useState('date-desc');
  const [deleteId, setDeleteId] = useState(null);

  const catMap = useMemo(()=>Object.fromEntries(categories.map(c=>[c.id,c])),[categories]);

  const filtered = useMemo(()=>{
    let list = [...expenses];
    if(filter.status!=='all') list=list.filter(e=>e.status===filter.status);
    if(filter.category!=='all') list=list.filter(e=>e.category===filter.category);
    if(filter.dateFrom) list=list.filter(e=>e.date>=filter.dateFrom);
    if(filter.dateTo) list=list.filter(e=>e.date<=filter.dateTo);
    if(sort==='date-desc') list.sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt);
    else if(sort==='date-asc') list.sort((a,b)=>a.date.localeCompare(b.date)||a.createdAt-b.createdAt);
    else if(sort==='amount-desc') list.sort((a,b)=>b.amount-a.amount);
    else if(sort==='amount-asc') list.sort((a,b)=>a.amount-b.amount);
    return list;
  },[expenses, filter, sort]);

  const totalFiltered = filtered.reduce((s,e)=>s+e.amount,0);

  // Group by date
  const grouped = useMemo(()=>{
    const groups = {};
    for(const e of filtered){
      if(!groups[e.date]) groups[e.date]=[];
      groups[e.date].push(e);
    }
    return Object.entries(groups).sort((a,b)=>b[0].localeCompare(a[0]));
  },[filtered]);

  const chips = [
    {key:'all',label:'All'},{key:'unpaid',label:'Unpaid'},{key:'paid',label:'Paid'}
  ];

  const activeFilters = [filter.category!=='all',filter.dateFrom||filter.dateTo].filter(Boolean).length;

  return (
    <div className="flex flex-col gap-4 pb-6">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-white/40 text-sm">{filtered.length} records · {fmt(totalFiltered,currency)}</p>
        </div>
        <button onClick={onAdd} className="w-11 h-11 rounded-2xl bg-brand-500 flex items-center justify-center shadow-lg shadow-brand-500/30 active:scale-95 transition-all">
          <i className="fas fa-plus text-white"/>
        </button>
      </div>

      {/* Status Filter Chips */}
      <div className="flex gap-2">
        {chips.map(c=>(
          <button key={c.key} onClick={()=>setFilter(f=>({...f,status:c.key}))}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${filter.status===c.key ? 'chip-active text-white' : 'bg-white/10 text-white/60 hover:bg-white/15'}`}>
            {c.label}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-white/40 text-xs mb-1 block">Category</label>
            <select value={filter.category} onChange={e=>setFilter(f=>({...f,category:e.target.value}))}
              className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/60">
              <option value="all">All Categories</option>
              {categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">Sort</label>
            <select value={sort} onChange={e=>setSort(e.target.value)}
              className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/60">
              <option value="date-desc">Date (newest)</option>
              <option value="date-asc">Date (oldest)</option>
              <option value="amount-desc">Amount (high)</option>
              <option value="amount-asc">Amount (low)</option>
            </select>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">From</label>
            <input type="date" value={filter.dateFrom} onChange={e=>setFilter(f=>({...f,dateFrom:e.target.value}))}
              className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/60"/>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">To</label>
            <input type="date" value={filter.dateTo} onChange={e=>setFilter(f=>({...f,dateTo:e.target.value}))}
              className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/60"/>
          </div>
        </div>
        {(filter.dateFrom||filter.dateTo||filter.category!=='all') && (
          <button onClick={()=>setFilter({status:filter.status,category:'all',dateFrom:'',dateTo:''})}
            className="text-brand-500 text-xs font-medium flex items-center gap-1 hover:text-brand-400">
            <i className="fas fa-times"/>Clear filters
          </button>
        )}
      </div>

      {/* Expense Groups */}
      {grouped.length===0
        ? <EmptyState icon="fa-search" title="No expenses found" sub="Try changing your filters"/>
        : grouped.map(([date, exps])=>(
          <div key={date}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/50 text-xs font-semibold uppercase tracking-wider">{fullDate(date)}</span>
              <span className="text-white/30 text-xs">{fmt(exps.reduce((s,e)=>s+e.amount,0),currency)}</span>
            </div>
            <div className="flex flex-col gap-2">
              {exps.map(e=>(
                <ExpenseRow key={e.id} expense={e} cat={catMap[e.category]} currency={currency}
                  onEdit={onEdit} onDelete={(id)=>setDeleteId(id)}/>
              ))}
            </div>
          </div>
        ))
      }

      <ConfirmDialog open={!!deleteId} title="Delete Expense"
        message="Are you sure you want to delete this expense? This action cannot be undone."
        danger onConfirm={()=>{ onDelete(deleteId); setDeleteId(null); }} onCancel={()=>setDeleteId(null)}/>
    </div>
  );
};

// ── SETTLE PAGE ───────────────────────────────────────────────
const SettlePage = ({ expenses, categories, currency, onSettle }) => {
  const [selectedCat, setSelectedCat] = useState(null);
  const catMap = useMemo(()=>Object.fromEntries(categories.map(c=>[c.id,c])),[categories]);

  const unpaidByCat = useMemo(()=>{
    const map = {};
    for(const e of expenses){
      if(e.status==='unpaid'){
        if(!map[e.category]) map[e.category]={ total:0, count:0, oldest:null, latest:null };
        map[e.category].total += e.amount;
        map[e.category].count++;
        if(!map[e.category].oldest||e.date<map[e.category].oldest) map[e.category].oldest=e.date;
        if(!map[e.category].latest||e.date>map[e.category].latest) map[e.category].latest=e.date;
      }
    }
    return Object.entries(map).map(([id,v])=>({id,...v,cat:catMap[id]})).sort((a,b)=>b.total-a.total);
  },[expenses, catMap]);

  const totalUnpaid = unpaidByCat.reduce((s,c)=>s+c.total,0);

  return (
    <div className="flex flex-col gap-5 pb-6">
      {/* Header */}
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">Settle Payments</h1>
        <p className="text-white/40 text-sm">Mark your unpaid expenses as paid</p>
      </div>

      {/* Total Outstanding Banner */}
      {totalUnpaid>0 && (
        <div className="bg-gradient-to-r from-red-500/20 to-orange-500/10 border border-red-500/30 rounded-2xl p-4 unpaid-glow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-400 text-xs font-medium uppercase tracking-wider">Total Outstanding</p>
              <p className="text-white text-3xl font-bold">{fmt(totalUnpaid,currency)}</p>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-red-500/20 flex items-center justify-center">
              <i className="fas fa-file-invoice-dollar text-red-400 text-xl"/>
            </div>
          </div>
          <p className="text-red-400/60 text-xs mt-2">{unpaidByCat.reduce((s,c)=>s+c.count,0)} unpaid expense{unpaidByCat.reduce((s,c)=>s+c.count,0)!==1?'s':''} across {unpaidByCat.length} categor{unpaidByCat.length!==1?'ies':'y'}</p>
        </div>
      )}

      {/* Categories */}
      {unpaidByCat.length===0 ? (
        <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-3">
            <i className="fas fa-check-circle text-3xl text-emerald-500"/>
          </div>
          <p className="text-white font-bold text-lg">All Clear!</p>
          <p className="text-white/50 text-sm mt-1">No outstanding payments</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {unpaidByCat.map(({id, total, count, oldest, latest, cat})=>(
            <div key={id} className="bg-dark-700/60 border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-colors">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{background:`${cat?.color||'#6366f1'}22`}}>
                  <i className={`fas ${cat?.icon||'fa-tag'} text-lg`} style={{color:cat?.color||'#6366f1'}}/>
                </div>
                <div className="flex-1">
                  <p className="text-white font-bold">{cat?.name||id}</p>
                  <p className="text-white/40 text-xs">{count} unpaid expense{count!==1?'s':''}</p>
                </div>
                <div className="text-right">
                  <p className="text-red-400 font-bold text-lg">{fmt(total,currency)}</p>
                  <span className="bg-red-500/20 text-red-400 text-[10px] px-1.5 py-0.5 rounded-full">Unpaid</span>
                </div>
              </div>
              <div className="flex gap-4 py-2 border-t border-b border-white/5 mb-3">
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider">Since</p>
                  <p className="text-white/70 text-xs font-medium">{fullDate(oldest)}</p>
                </div>
                <div>
                  <p className="text-white/30 text-[10px] uppercase tracking-wider">Latest</p>
                  <p className="text-white/70 text-xs font-medium">{fullDate(latest)}</p>
                </div>
              </div>
              <button onClick={()=>setSelectedCat(id)}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-bold text-sm active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20">
                <i className="fas fa-check-circle mr-2"/>Settle {cat?.name||id} – {fmt(total,currency)}
              </button>
            </div>
          ))}
        </div>
      )}

      <SettleModal
        open={!!selectedCat}
        onClose={()=>setSelectedCat(null)}
        category={selectedCat}
        expenses={expenses}
        categories={categories}
        currency={currency}
        onSettle={async(cat,date)=>{ await onSettle(cat,date); setSelectedCat(null); }}
      />
    </div>
  );
};

// ── EXPORT PAGE ────────────────────────────────────────────────
const ExportPage = ({ expenses, categories, currency }) => {
  const [exportFilter, setExportFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [exporting, setExporting] = useState(false);

  const catMap = useMemo(()=>Object.fromEntries(categories.map(c=>[c.id,c])),[categories]);

  const getFiltered = () => {
    let list = [...expenses];
    if(exportFilter!=='all') list=list.filter(e=>e.status===exportFilter);
    if(dateFrom) list=list.filter(e=>e.date>=dateFrom);
    if(dateTo) list=list.filter(e=>e.date<=dateTo);
    return list.sort((a,b)=>b.date.localeCompare(a.date));
  };

  const exportPDF = async () => {
    setExporting(true);
    try {
      const { jsPDF } = window.jspdf;
      const doc = new jsPDF({ orientation:'portrait', unit:'mm', format:'a4' });
      const list = getFiltered();

      // Header
      doc.setFillColor(99, 102, 241);
      doc.rect(0,0,210,28,'F');
      doc.setTextColor(255,255,255);
      doc.setFontSize(20); doc.setFont('helvetica','bold');
      doc.text('SpendWise – Expense Report',14,18);
      doc.setFontSize(10); doc.setFont('helvetica','normal');
      doc.text(`Generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}`,14,25);
      doc.setTextColor(0,0,0);

      // Summary
      doc.setFontSize(11); doc.setFont('helvetica','bold');
      doc.text('Summary',14,38);
      const paid = list.filter(e=>e.status==='paid');
      const unpaid = list.filter(e=>e.status==='unpaid');
      const paidTotal = paid.reduce((s,e)=>s+e.amount,0);
      const unpaidTotal = unpaid.reduce((s,e)=>s+e.amount,0);
      const grandTotal = list.reduce((s,e)=>s+e.amount,0);

      doc.autoTable({
        startY:42, margin:{left:14},
        head:[['Filter','Records','Total']],
        body:[
          [`Showing: ${exportFilter==='all'?'All':exportFilter.charAt(0).toUpperCase()+exportFilter.slice(1)}`, list.length, `${currency}${grandTotal.toFixed(2)}`],
          ['Paid', paid.length, `${currency}${paidTotal.toFixed(2)}`],
          ['Unpaid', unpaid.length, `${currency}${unpaidTotal.toFixed(2)}`],
        ],
        styles:{ fontSize:9, cellPadding:3 },
        headStyles:{ fillColor:[99,102,241], textColor:255 },
        alternateRowStyles:{ fillColor:[245,245,255] },
      });

      // Transactions
      doc.setFontSize(11); doc.setFont('helvetica','bold');
      doc.text('Transactions', 14, doc.lastAutoTable.finalY+12);
      doc.autoTable({
        startY: doc.lastAutoTable.finalY+16, margin:{left:14},
        head:[['Date','Category','Amount','Status','Paid Date','Notes']],
        body: list.map(e=>[
          fullDate(e.date),
          catMap[e.category]?.name||e.category,
          `${currency}${e.amount.toFixed(2)}`,
          e.status==='paid'?'✓ Paid':'Unpaid',
          e.paidDate?fullDate(e.paidDate):'-',
          e.note||''
        ]),
        styles:{ fontSize:8, cellPadding:2.5 },
        headStyles:{ fillColor:[99,102,241], textColor:255 },
        alternateRowStyles:{ fillColor:[250,250,255] },
        columnStyles:{
          2:{ halign:'right' },
          3:{ fontStyle:'bold' }
        }
      });
      doc.save(`spendwise-${exportFilter}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch(e){ console.error(e); }
    setExporting(false);
  };

  const exportExcel = () => {
    setExporting(true);
    try {
      const list = getFiltered();
      const ws = XLSX.utils.json_to_sheet(list.map(e=>({
        'Date': fullDate(e.date),
        'Category': catMap[e.category]?.name||e.category,
        'Amount': e.amount,
        'Currency': currency,
        'Status': e.status==='paid'?'Paid':'Unpaid',
        'Paid Date': e.paidDate?fullDate(e.paidDate):'',
        'Notes': e.note||''
      })));
      ws['!cols'] = [{wch:15},{wch:14},{wch:10},{wch:8},{wch:10},{wch:15},{wch:30}];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Expenses');

      // Summary sheet
      const summaryData = [
        { 'Metric': 'Total Records', 'Value': list.length },
        { 'Metric': 'Total Amount', 'Value': `${currency}${list.reduce((s,e)=>s+e.amount,0).toFixed(2)}` },
        { 'Metric': 'Paid', 'Value': `${currency}${list.filter(e=>e.status==='paid').reduce((s,e)=>s+e.amount,0).toFixed(2)}` },
        { 'Metric': 'Unpaid', 'Value': `${currency}${list.filter(e=>e.status==='unpaid').reduce((s,e)=>s+e.amount,0).toFixed(2)}` },
        { 'Metric': 'Export Date', 'Value': new Date().toLocaleDateString() },
        { 'Metric': 'Filter', 'Value': exportFilter },
      ];
      const ws2 = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, ws2, 'Summary');
      XLSX.writeFile(wb, `spendwise-${exportFilter}-${new Date().toISOString().split('T')[0]}.xlsx`);
    } catch(e){ console.error(e); }
    setExporting(false);
  };

  const filtered = getFiltered();
  const filteredTotal = filtered.reduce((s,e)=>s+e.amount,0);

  const options = [{key:'all',label:'All Expenses',icon:'fa-list',desc:'Export everything'},{key:'unpaid',label:'Unpaid Only',icon:'fa-clock',desc:'Outstanding balance'},{key:'paid',label:'Paid Only',icon:'fa-check-circle',desc:'Settled payments'}];

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">Export Data</h1>
        <p className="text-white/40 text-sm">Download your expense records</p>
      </div>

      {/* Filter Selection */}
      <div className="flex flex-col gap-2">
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider">Export Filter</label>
        {options.map(o=>(
          <button key={o.key} onClick={()=>setExportFilter(o.key)}
            className={`flex items-center gap-3 p-4 rounded-2xl border transition-all ${exportFilter===o.key?'border-brand-500/60 bg-brand-500/10':'border-white/10 bg-dark-700/60 hover:border-white/20'}`}>
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${exportFilter===o.key?'bg-brand-500/20 text-brand-400':'bg-white/10 text-white/40'}`}>
              <i className={`fas ${o.icon}`}/>
            </div>
            <div className="text-left">
              <p className={`font-semibold text-sm ${exportFilter===o.key?'text-white':'text-white/70'}`}>{o.label}</p>
              <p className="text-white/40 text-xs">{o.desc}</p>
            </div>
            {exportFilter===o.key&&<i className="fas fa-check-circle text-brand-500 ml-auto"/>}
          </button>
        ))}
      </div>

      {/* Date Range */}
      <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4">
        <label className="text-white/50 text-xs font-semibold uppercase tracking-wider block mb-3">Date Range (Optional)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-white/40 text-xs mb-1 block">From</label>
            <input type="date" value={dateFrom} onChange={e=>setDateFrom(e.target.value)}
              className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/60"/>
          </div>
          <div>
            <label className="text-white/40 text-xs mb-1 block">To</label>
            <input type="date" value={dateTo} onChange={e=>setDateTo(e.target.value)}
              className="w-full bg-dark-800 border border-white/10 rounded-xl px-3 py-2 text-white text-sm focus:outline-none focus:border-brand-500/60"/>
          </div>
        </div>
      </div>

      {/* Preview Count */}
      <div className="bg-brand-500/10 border border-brand-500/30 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-brand-400 text-xs font-medium">Records to export</p>
            <p className="text-white font-bold text-2xl">{filtered.length}</p>
          </div>
          <div className="text-right">
            <p className="text-white/50 text-xs">Total Amount</p>
            <p className="text-white font-bold">{fmt(filteredTotal,currency)}</p>
          </div>
        </div>
      </div>

      {/* Export Buttons */}
      <div className="flex flex-col gap-3">
        <button onClick={exportPDF} disabled={exporting||filtered.length===0}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${filtered.length>0&&!exporting?'bg-gradient-to-r from-red-500 to-rose-600 text-white shadow-lg shadow-red-500/30':'bg-white/10 text-white/40 cursor-not-allowed'}`}>
          <i className="fas fa-file-pdf text-xl"/>
          Export as PDF
        </button>
        <button onClick={exportExcel} disabled={exporting||filtered.length===0}
          className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${filtered.length>0&&!exporting?'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/30':'bg-white/10 text-white/40 cursor-not-allowed'}`}>
          <i className="fas fa-file-excel text-xl"/>
          Export as Excel
        </button>
      </div>
    </div>
  );
};

// ── SETTINGS PAGE ──────────────────────────────────────────────
const SettingsPage = ({ currency, onCurrencyChange, darkMode, onDarkModeChange, categories, onCategoryAdd, onCategoryUpdate, onCategoryDelete, onReset }) => {
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showCatModal, setShowCatModal] = useState(false);
  const [editCat, setEditCat] = useState(null);
  const [catForm, setCatForm] = useState({ name:'', icon:'fa-tag', color:'#6366f1' });
  const [catErrors, setCatErrors] = useState({});

  const CURRENCIES = [
    {symbol:'₨', name:'Nepalese Rupee (NPR)'},
    {symbol:'₹',name:'Indian Rupee (INR)'},
    {symbol:'$',name:'US Dollar (USD)'},
    {symbol:'€',name:'Euro (EUR)'},
    {symbol:'£',name:'British Pound (GBP)'},
    {symbol:'¥',name:'Japanese Yen (JPY)'},
    {symbol:'₩',name:'Korean Won (KRW)'},
    {symbol:'A$',name:'Australian Dollar (AUD)'},
    {symbol:'C$',name:'Canadian Dollar (CAD)'},
    {symbol:'Fr',name:'Swiss Franc (CHF)'},
    {symbol:'R$',name:'Brazilian Real (BRL)'},
    {symbol:'د.إ',name:'UAE Dirham (AED)'},
    {symbol:'﷼',name:'Saudi Riyal (SAR)'},
  ];

  const ICONS = ['fa-utensils','fa-home','fa-shopping-cart','fa-car','fa-bolt','fa-film','fa-heartbeat','fa-ellipsis-h','fa-coffee','fa-tshirt','fa-graduation-cap','fa-plane','fa-dumbbell','fa-mobile-alt','fa-tag','fa-gift','fa-music','fa-book','fa-baby','fa-paw'];
  const COLORS = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#ef4444','#64748b','#f97316','#14b8a6','#a855f7','#06b6d4'];

  const openAddCat = () => { setEditCat(null); setCatForm({name:'',icon:'fa-tag',color:'#6366f1'}); setCatErrors({}); setShowCatModal(true); };
  const openEditCat = (cat) => { setEditCat(cat); setCatForm({name:cat.name,icon:cat.icon,color:cat.color}); setCatErrors({}); setShowCatModal(true); };

  const saveCat = () => {
    const e = {};
    if(!catForm.name.trim()) e.name='Category name is required';
    if(catForm.name.trim().length>20) e.name='Max 20 characters';
    setCatErrors(e);
    if(Object.keys(e).length>0) return;
    if(editCat) onCategoryUpdate({...editCat,...catForm,name:catForm.name.trim()});
    else onCategoryAdd({...catForm,name:catForm.name.trim()});
    setShowCatModal(false);
  };

  return (
    <div className="flex flex-col gap-5 pb-6">
      <div className="pt-2">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-white/40 text-sm">Customize your experience</p>
      </div>

      {/* Currency */}
      <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4">
        <h2 className="text-white font-bold text-sm mb-3 flex items-center gap-2">
          <i className="fas fa-coins text-brand-500"/>Global Currency
        </h2>
        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
          {CURRENCIES.map(c=>(
            <button key={c.symbol} onClick={()=>onCurrencyChange(c.symbol)}
              className={`flex items-center gap-2 p-3 rounded-xl border transition-all text-left ${currency===c.symbol?'border-brand-500/60 bg-brand-500/10':'border-white/10 hover:border-white/20'}`}>
              <span className="text-lg font-bold text-white w-8">{c.symbol}</span>
              <span className="text-white/50 text-xs leading-tight">{c.name}</span>
              {currency===c.symbol&&<i className="fas fa-check text-brand-500 ml-auto text-xs"/>}
            </button>
          ))}
        </div>
      </div>

      {/* Dark Mode */}
      <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
              <i className={`fas ${darkMode?'fa-moon':'fa-sun'} text-white`}/>
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{darkMode?'Dark Mode':'Light Mode'}</p>
              <p className="text-white/40 text-xs">Toggle theme</p>
            </div>
          </div>
          <button onClick={()=>onDarkModeChange(!darkMode)}
            className={`relative w-12 h-6 rounded-full transition-colors ${darkMode?'bg-brand-500':'bg-white/20'}`}>
            <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${darkMode?'translate-x-6':'translate-x-0.5'}`}/>
          </button>
        </div>
      </div>

      {/* Categories */}
      <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-bold text-sm flex items-center gap-2">
            <i className="fas fa-tags text-brand-500"/>Categories
          </h2>
          <button onClick={openAddCat} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-500/20 text-brand-400 text-xs font-semibold hover:bg-brand-500/30 transition-colors">
            <i className="fas fa-plus text-xs"/>Add
          </button>
        </div>
        <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
          {categories.map(cat=>(
            <div key={cat.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-dark-800/40 border border-white/5">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{background:`${cat.color}22`}}>
                <i className={`fas ${cat.icon} text-xs`} style={{color:cat.color}}/>
              </div>
              <span className="text-white text-sm font-medium flex-1">{cat.name}</span>
              <div className="flex gap-1">
                <button onClick={()=>openEditCat(cat)} className="w-7 h-7 rounded-lg bg-brand-500/20 text-brand-400 flex items-center justify-center hover:bg-brand-500/30 transition-colors">
                  <i className="fas fa-pen text-[10px]"/>
                </button>
                <button onClick={()=>onCategoryDelete(cat.id)} className="w-7 h-7 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center hover:bg-red-500/30 transition-colors">
                  <i className="fas fa-trash text-[10px]"/>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reset */}
      <div className="bg-dark-700/60 border border-red-500/20 rounded-2xl p-4">
        <h2 className="text-white font-bold text-sm mb-1 flex items-center gap-2">
          <i className="fas fa-exclamation-triangle text-red-400"/>Danger Zone
        </h2>
        <p className="text-white/40 text-xs mb-3">This will permanently delete all your data</p>
        <button onClick={()=>setShowResetConfirm(true)} className="w-full py-3 rounded-xl bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-sm hover:bg-red-500/30 transition-colors">
          <i className="fas fa-trash-alt mr-2"/>Reset All Data
        </button>
      </div>

      {/* About */}
      <div className="bg-dark-700/60 border border-white/10 rounded-2xl p-4 text-center">
        <div className="text-3xl mb-2">💸</div>
        <p className="text-white font-bold">SpendWise</p>
        <p className="text-white/40 text-xs mt-1">v1.0.0 · Offline-first PWA</p>
        <p className="text-white/20 text-xs mt-1">All data stored locally on your device</p>
      </div>

      {/* Category Modal */}
      <Modal open={showCatModal} onClose={()=>setShowCatModal(false)} title={editCat?'Edit Category':'Add Category'}>
        <div className="mb-4">
          <label className="text-white/60 text-xs font-medium mb-1.5 block">Category Name *</label>
          <input type="text" placeholder="e.g. Gym, Subscriptions..."
            className={`w-full bg-dark-800/80 border ${catErrors.name?'border-red-500':'border-white/10'} rounded-2xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-brand-500/60`}
            value={catForm.name} onChange={e=>setCatForm(f=>({...f,name:e.target.value}))}/>
          {catErrors.name&&<p className="text-red-400 text-xs mt-1">{catErrors.name}</p>}
        </div>
        <div className="mb-4">
          <label className="text-white/60 text-xs font-medium mb-1.5 block">Icon</label>
          <div className="grid grid-cols-5 gap-2">
            {ICONS.map(icon=>(
              <button key={icon} onClick={()=>setCatForm(f=>({...f,icon}))}
                className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all ${catForm.icon===icon?'border-brand-500/60 bg-brand-500/20':'border-white/10 bg-dark-800/60 hover:border-white/20'}`}>
                <i className={`fas ${icon} text-sm text-white/70`}/>
              </button>
            ))}
          </div>
        </div>
        <div className="mb-5">
          <label className="text-white/60 text-xs font-medium mb-1.5 block">Color</label>
          <div className="grid grid-cols-6 gap-2">
            {COLORS.map(color=>(
              <button key={color} onClick={()=>setCatForm(f=>({...f,color}))}
                className={`w-9 h-9 rounded-xl border-2 transition-all ${catForm.color===color?'border-white scale-110':'border-transparent'}`}
                style={{background:color}}/>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3 mb-5 p-3 bg-dark-800/40 rounded-xl border border-white/5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{background:`${catForm.color}22`}}>
            <i className={`fas ${catForm.icon}`} style={{color:catForm.color}}/>
          </div>
          <span className="text-white font-semibold text-sm">{catForm.name||'Preview'}</span>
        </div>
        <button onClick={saveCat} className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-brand-500 to-purple-600 text-white font-bold active:scale-[0.98] transition-all">
          {editCat?'Save Changes':'Add Category'}
        </button>
      </Modal>

      <ConfirmDialog open={showResetConfirm} title="Reset All Data" danger
        message="Are you absolutely sure? This will delete ALL expenses, categories, and settings. This action CANNOT be undone."
        onConfirm={()=>{ onReset(); setShowResetConfirm(false); }} onCancel={()=>setShowResetConfirm(false)}/>
    </div>
  );
};

// ── BOTTOM NAV ─────────────────────────────────────────────────
const BottomNav = ({ active, onChange, unpaidCount }) => {
  const tabs = [
    { id:'dashboard', icon:'fa-home', label:'Home' },
    { id:'expenses', icon:'fa-list', label:'Expenses' },
    { id:'settle', icon:'fa-check-circle', label:'Settle' },
    { id:'export', icon:'fa-download', label:'Export' },
    { id:'settings', icon:'fa-cog', label:'Settings' },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass bg-dark-800/90 border-t border-white/10 safe-bottom">
      <div className="flex items-center justify-around px-2 pt-2 pb-1 max-w-lg mx-auto">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>onChange(t.id)}
            className={`nav-item flex flex-col items-center gap-1 px-3 py-1.5 rounded-2xl min-w-[56px] transition-all relative ${active===t.id?'text-brand-500':'text-white/40'}`}>
            {active===t.id && <div className="absolute inset-0 bg-brand-500/10 rounded-2xl"/>}
            <div className="relative">
              <i className={`fas ${t.icon} text-lg ${active===t.id?'text-brand-500':'text-white/40'}`}/>
              {t.id==='settle'&&unpaidCount>0&&(
                <span className="absolute -top-2 -right-2 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] flex items-center justify-center font-bold">
                  {unpaidCount>9?'9+':unpaidCount}
                </span>
              )}
            </div>
            <span className={`text-[10px] font-semibold ${active===t.id?'text-brand-500':''}`}>{t.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

// ── FAB ────────────────────────────────────────────────────────
const FAB = ({ onClick }) => (
  <button onClick={onClick}
    className="fixed bottom-24 right-4 z-30 w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-purple-600 text-white shadow-2xl shadow-brand-500/40 flex items-center justify-center active:scale-95 transition-all"
    style={{boxShadow:'0 8px 32px rgba(99,102,241,0.5)'}}>
    <i className="fas fa-plus text-xl"/>
  </button>
);

// ── MAIN APP ───────────────────────────────────────────────────
const App = () => {
  const [tab, setTab] = useState('dashboard');
  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [currency, setCurrency] = useState('₹');
  const [darkMode, setDarkMode] = useState(true);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editExpense, setEditExpense] = useState(null);

  const addToast = useCallback((message, type='success') => {
    const id = Date.now();
    setToasts(t=>[...t, {id,message,type}]);
    setTimeout(()=>setToasts(t=>t.filter(x=>x.id!==id)), 3000);
  },[]);

  // Load initial data
  useEffect(()=>{
    const init = async () => {
      try {
        await SpendWiseDB.open();
        await SpendWiseDB.initCategories();
        const [exps, cats, cur, dark] = await Promise.all([
          SpendWiseDB.getAllExpenses(),
          SpendWiseDB.getAllCategories(),
          SpendWiseDB.getSetting('currency','₹'),
          SpendWiseDB.getSetting('darkMode', true),
        ]);
        setExpenses(exps);
        setCategories(cats);
        setCurrency(cur);
        setDarkMode(dark);
      } catch(e){ console.error('Init error:',e); }
      finally { setLoading(false); }
    };
    init();
  },[]);

  // Dark mode class
  useEffect(()=>{
    document.documentElement.classList.toggle('dark', darkMode);
    document.body.className = darkMode ? 'bg-dark-900 text-white min-h-screen antialiased' : 'bg-gray-50 text-gray-900 min-h-screen antialiased';
  },[darkMode]);

  // Register SW
  useEffect(()=>{
    if('serviceWorker' in navigator){
      navigator.serviceWorker.register('/sw.js').catch(()=>{});
    }
  },[]);

  const handleAddExpense = async (form) => {
    try {
      const rec = await SpendWiseDB.addExpense(form);
      setExpenses(e=>[rec,...e]);
      setShowAddModal(false);
      addToast('Expense added successfully!');
    } catch(e){ addToast('Failed to add expense','error'); }
  };

  const handleEditExpense = async (form) => {
    try {
      const updated = { ...editExpense, ...form, amount: parseFloat(form.amount) };
      await SpendWiseDB.updateExpense(updated);
      setExpenses(e=>e.map(x=>x.id===updated.id?updated:x));
      setEditExpense(null);
      setShowAddModal(false);
      addToast('Expense updated!');
    } catch(e){ addToast('Failed to update','error'); }
  };

  const handleDeleteExpense = async (id) => {
    try {
      await SpendWiseDB.deleteExpense(id);
      setExpenses(e=>e.filter(x=>x.id!==id));
      addToast('Expense deleted');
    } catch(e){ addToast('Failed to delete','error'); }
  };

  const handleSettle = async (category, paidDate) => {
    try {
      const settled = await SpendWiseDB.settleCategory(category, paidDate);
      setExpenses(e=>e.map(x=>{
        const s = settled.find(s=>s.id===x.id);
        return s||x;
      }));
      addToast(`✅ ${settled.length} expense${settled.length!==1?'s':''} marked as paid!`);
    } catch(e){ addToast('Settlement failed','error'); }
  };

  const handleCurrencyChange = async (symbol) => {
    setCurrency(symbol);
    await SpendWiseDB.setSetting('currency', symbol);
    addToast(`Currency set to ${symbol}`);
  };

  const handleDarkModeChange = async (val) => {
    setDarkMode(val);
    await SpendWiseDB.setSetting('darkMode', val);
  };

  const handleCategoryAdd = async (cat) => {
    try {
      const rec = await SpendWiseDB.addCategory(cat);
      setCategories(c=>[...c,rec].sort((a,b)=>a.name.localeCompare(b.name)));
      addToast('Category added!');
    } catch(e){ addToast('Failed to add category','error'); }
  };

  const handleCategoryUpdate = async (cat) => {
    try {
      await SpendWiseDB.updateCategory(cat);
      setCategories(c=>c.map(x=>x.id===cat.id?cat:x));
      addToast('Category updated!');
    } catch(e){ addToast('Failed to update category','error'); }
  };

  const handleCategoryDelete = async (id) => {
    try {
      await SpendWiseDB.deleteCategory(id);
      setCategories(c=>c.filter(x=>x.id!==id));
      addToast('Category deleted');
    } catch(e){ addToast('Failed to delete category','error'); }
  };

  const handleReset = async () => {
    try {
      await SpendWiseDB.resetAll();
      const cats = await SpendWiseDB.getAllCategories();
      setExpenses([]);
      setCategories(cats);
      setCurrency('₹');
      addToast('All data reset successfully');
    } catch(e){ addToast('Reset failed','error'); }
  };

  const openAdd = () => { setEditExpense(null); setShowAddModal(true); };
  const openEdit = (exp) => { setEditExpense(exp); setShowAddModal(true); };

  const unpaidCount = useMemo(()=>{
    const cats = new Set(expenses.filter(e=>e.status==='unpaid').map(e=>e.category));
    return cats.size;
  },[expenses]);

  if(loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-dark-900">
      <div className="text-5xl animate-bounce-in">💸</div>
      <div className="text-white text-xl font-bold">SpendWise</div>
      <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  const bgClass = darkMode ? 'bg-dark-900' : 'bg-gray-50';
  const textClass = darkMode ? 'text-white' : 'text-gray-900';

  return (
    <div className={`min-h-screen ${bgClass} ${textClass}`}>
      <Toast toasts={toasts}/>

      {/* Main Content */}
      <main className="max-w-lg mx-auto px-4 pt-4 pb-28">
        {tab==='dashboard' && (
          <Dashboard expenses={expenses} categories={categories} currency={currency}
            onAddExpense={openAdd} onSettle={(catId)=>{ setTab('settle'); }}/>
        )}
        {tab==='expenses' && (
          <ExpensesList expenses={expenses} categories={categories} currency={currency}
            onAdd={openAdd} onEdit={openEdit} onDelete={handleDeleteExpense} onSettle={handleSettle}/>
        )}
        {tab==='settle' && (
          <SettlePage expenses={expenses} categories={categories} currency={currency} onSettle={handleSettle}/>
        )}
        {tab==='export' && (
          <ExportPage expenses={expenses} categories={categories} currency={currency}/>
        )}
        {tab==='settings' && (
          <SettingsPage currency={currency} onCurrencyChange={handleCurrencyChange}
            darkMode={darkMode} onDarkModeChange={handleDarkModeChange}
            categories={categories} onCategoryAdd={handleCategoryAdd}
            onCategoryUpdate={handleCategoryUpdate} onCategoryDelete={handleCategoryDelete}
            onReset={handleReset}/>
        )}
      </main>

      {/* FAB – only on non-add pages */}
      {(tab==='dashboard'||tab==='expenses') && <FAB onClick={openAdd}/>}

      {/* Bottom Nav */}
      <BottomNav active={tab} onChange={setTab} unpaidCount={unpaidCount}/>

      {/* Add/Edit Modal */}
      <ExpenseModal
        open={showAddModal}
        onClose={()=>{ setShowAddModal(false); setEditExpense(null); }}
        onSave={editExpense?handleEditExpense:handleAddExpense}
        categories={categories}
        editExpense={editExpense}
      />
    </div>
  );
};

// Mount
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(React.createElement(App));
