import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, ArrowDownToLine, ArrowUpRight, BarChart3, Bell, BookOpen, Check, ChevronDown,
  CircleHelp, Clock3, Database, FileSearch, Filter, Gauge, History, Layers3, LifeBuoy,
  LoaderCircle, MessageSquare, Search, Send, ShieldCheck, Sparkles, Ticket, ThumbsDown,
  ThumbsUp, Trash2, TrendingUp, X, Zap
} from 'lucide-react';

const API = 'http://127.0.0.1:8000';
const categoryNames = { auth:'Authentication', sync:'Data sync', render:'Dashboard rendering', billing:'Billing', export:'Exports', perm:'Permissions', perf:'Performance', api:'API & integrations' };
const pct = n => `${Math.round((n || 0) * 100)}%`;

function App() {
  const [tab, setTab] = useState('search');
  const [overview, setOverview] = useState(null);
  const [examples, setExamples] = useState([]);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [topK, setTopK] = useState(5);
  const [minScore, setMinScore] = useState(0.08);
  const [matches, setMatches] = useState(null);
  const [queryId, setQueryId] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [history, setHistory] = useState(() => JSON.parse(localStorage.getItem('ticketiq-history') || '[]'));
  const [library, setLibrary] = useState([]);
  const [libraryTotal, setLibraryTotal] = useState(0);
  const [libraryQuery, setLibraryQuery] = useState('');
  const [libraryCategory, setLibraryCategory] = useState('all');
  const [libraryStatus, setLibraryStatus] = useState('all');
  const [page, setPage] = useState(1);
  const [feedbackState, setFeedbackState] = useState({});
  const [toast, setToast] = useState('');
  const [libraryDetail, setLibraryDetail] = useState(null);

  const notify = text => { setToast(text); window.setTimeout(() => setToast(''), 2600); };
  const refreshOverview = () => fetch(`${API}/api/overview`).then(r => { if (!r.ok) throw new Error(); return r.json(); }).then(setOverview).catch(() => setError('Backend unavailable. Start FastAPI on port 8000.'));
  useEffect(() => {
    refreshOverview();
    fetch(`${API}/api/examples`).then(r => r.ok ? r.json() : []).then(setExamples).catch(() => {});
  }, []);
  useEffect(() => { localStorage.setItem('ticketiq-history', JSON.stringify(history.slice(0, 12))); }, [history]);
  useEffect(() => {
    if (tab !== 'library') return;
    const params = new URLSearchParams({ q: libraryQuery, category: libraryCategory, status: libraryStatus, page: String(page), page_size: '20' });
    fetch(`${API}/api/tickets?${params}`).then(r => r.json()).then(data => { setLibrary(data.items || []); setLibraryTotal(data.total || 0); }).catch(() => setError('Unable to load knowledge library.'));
  }, [tab, libraryQuery, libraryCategory, libraryStatus, page]);

  const categories = useMemo(() => Object.keys(overview?.categories || {}), [overview]);
  // Derive coverage from the displayed counts so the KPI cannot drift from its numerator/denominator.
  const resolutionRate = overview?.historical_tickets
    ? Math.round((overview.resolved_tickets / overview.historical_tickets) * 100)
    : 0;
  const runSearch = async e => {
    e?.preventDefault(); setError(''); setMatches(null); setSelected(null);
    if (subject.trim().length < 3 || description.trim().length < 5) { setError('Enter a subject (3+ characters) and description (5+ characters).'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/tickets/similar`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ subject, description, category:category || null, top_k:topK, min_score:minScore }) });
      const data = await res.json(); if (!res.ok) throw new Error(data.detail || 'Search failed.');
      setMatches(data.matches); setQueryId(data.query_id); setSelected(data.matches[0] || null);
      const item = { id:data.query_id, subject, description, category, count:data.total_matches, date:new Date().toLocaleString(), matches:data.matches };
      setHistory(prev => [item, ...prev.filter(x => x.id !== item.id)].slice(0,12));
    } catch (err) { setError(err.message || 'Unable to connect to the API.'); } finally { setLoading(false); }
  };
  const clearForm = () => { setSubject(''); setDescription(''); setCategory(''); setMatches(null); setSelected(null); setError(''); setQueryId(''); };
  const loadExample = t => { setSubject(t.subject); setDescription(t.description); setCategory(''); setMatches(null); setSelected(null); setTab('search'); setError(''); };
  const reopenHistory = h => { setSubject(h.subject); setDescription(h.description); setCategory(h.category || ''); setMatches(h.matches || []); setSelected(h.matches?.[0] || null); setQueryId(h.id); setTab('search'); };
  const sendFeedback = async (ticket, helpful) => {
    try { const r = await fetch(`${API}/api/feedback`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ ticket_id:ticket.ticket_id, query_id:queryId, helpful, comment:'' }) }); if (!r.ok) throw new Error(); setFeedbackState(s => ({...s, [ticket.ticket_id]:helpful})); notify('Thanks — agent feedback saved.'); }
    catch { notify('Could not save feedback. Check backend connection.'); }
  };
  const exportMatches = () => {
    if (!matches?.length) return notify('Run a search before exporting results.');
    const cols = ['ticket_id','category','subject','similarity_score','relevance','status','created_at','resolution_notes'];
    const csv = [cols.join(','), ...matches.map(m => cols.map(k => `"${String(m[k] ?? '').replaceAll('"','""')}"`).join(','))].join('\n');
    const url = URL.createObjectURL(new Blob([csv], {type:'text/csv'})); const a = document.createElement('a'); a.href=url; a.download=`ticketiq-${queryId || 'matches'}.csv`; a.click(); URL.revokeObjectURL(url);
  };
  const exportLibrary = () => {
    const cols = ['ticket_id','category','subject','description','resolution_notes','status','created_at'];
    const csv = [cols.join(','), ...library.map(m => cols.map(k => `"${String(m[k] ?? '').replaceAll('"','""')}"`).join(','))].join('\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); const a=document.createElement('a'); a.href=url; a.download='ticketiq-library-page.csv'; a.click(); URL.revokeObjectURL(url);
  };

  const stats = [
    { label:'Historical tickets', value:overview?.historical_tickets ?? '—', note:'Indexed knowledge base', icon:Database },
    { label:'Resolved cases', value:overview?.resolved_tickets ?? '—', note:`${resolutionRate}% resolution coverage`, icon:ShieldCheck },
    { label:'Issue categories', value:categories.length || '—', note:'Across support operations', icon:Layers3 },
    { label:'Daily ticket volume', value:'~150', note:'Customer-reported baseline', icon:TrendingUp },
  ];
  const nav = [{id:'search',label:'Similarity search',icon:FileSearch},{id:'library',label:'Knowledge library',icon:Database},{id:'overview',label:'Overview & analytics',icon:BarChart3},{id:'history',label:'Search history',icon:History}];

  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Sparkles size={19}/></div><div><div className="brand-name">ticket<span>iq</span></div><div className="brand-caption">SUPPORT INTELLIGENCE</div></div></div>
      <div className="workspace-switch"><div className="workspace-icon">S</div><div className="workspace-copy"><strong>Solari Analytics</strong><span>Customer workspace</span></div><ChevronDown size={15}/></div>
      <div className="nav-label">WORKSPACE</div>
      {nav.map(n => { const Icon=n.icon; return <button key={n.id} className={`nav-item ${tab===n.id?'active':''}`} onClick={()=>setTab(n.id)}><Icon size={17}/>{n.label}{tab===n.id&&<span className="nav-pip"/>}</button>; })}
      <div className="sidebar-bottom"><div className="help-card"><div className="help-icon"><LifeBuoy size={17}/></div><strong>Agent workspace</strong><p>Search history, review resolutions and capture feedback.</p><button onClick={()=>setTab('library')}>Browse knowledge <ArrowUpRight size={13}/></button></div><div className="profile-row"><div className="avatar">SA</div><div><strong>Support Agent</strong><span>Solari workspace</span></div><ChevronDown size={14}/></div></div>
    </aside>
    <main className="main-area">
      <header className="topbar"><div className="breadcrumbs"><span>Workspace</span><span className="crumb-slash">/</span><strong>{nav.find(n=>n.id===tab)?.label}</strong></div><div className="top-actions"><div className="system-status"><span className="status-dot"/> System operational</div><div className="top-avatar">SA</div></div></header>
      <div className="content-wrap">
        <section className="welcome-row"><div><div className="eyebrow"><span className="eyebrow-line"/> CUSTOMER SUPPORT / INTELLIGENCE</div><h1>{tab==='search'?'Find the answer before':tab==='library'?'Your support knowledge':tab==='history'?'Pick up where you left off':'Support operations, in focus.'}<br/><em>{tab==='search'?'you start from zero.':tab==='library'?'all in one place.':tab==='history'?'Every search is saved.':'Turn ticket history into insight.'}</em></h1><p className="welcome-copy">{tab==='search'?'Surface relevant resolved cases, compare alternatives and review the original resolution.':tab==='library'?'Search, filter and inspect the historical support records.':tab==='history'?'Reopen previous investigations without entering the same ticket again.':'Understand the shape of your historical support workload.'}</p></div><div className="hero-orb"><div className="orb-ring ring-one"/><div className="orb-ring ring-two"/><div className="orb-core"><Sparkles size={28}/></div><div className="orb-tag"><Zap size={12}/> INTELLIGENCE ENGINE</div></div></section>
        {tab!=='history'&&<section className="stats-grid">{stats.map(({label,value,icon:Icon,note},i)=><div className="stat-card" key={label}><div className="stat-top"><span>{label}</span><div className={`stat-icon stat-icon-${i}`}><Icon size={17}/></div></div><div className="stat-value">{value}</div><div className="stat-note">{note}</div></div>)}</section>}

        {tab==='search'&&<section className="work-grid">
          <div className="panel search-panel"><div className="panel-heading"><div><div className="section-kicker">TICKET WORKBENCH</div><h2>New ticket analysis</h2><p>Describe the issue and tune retrieval to your workflow.</p></div><div className="panel-icon"><FileSearch size={19}/></div></div>
            <form onSubmit={runSearch}><label>Ticket subject <span>REQUIRED</span></label><input value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Dashboard not loading after login" maxLength={180}/><div className="label-row"><label>Issue description <span>REQUIRED</span></label><small>{description.length}/3000</small></div><textarea value={description} onChange={e=>setDescription(e.target.value)} placeholder="What is the customer experiencing? Include symptoms, timing and error messages..." maxLength={3000} rows={5}/>
              <div className="advanced-controls"><div className="control-heading"><Filter size={13}/> RETRIEVAL CONTROLS <span>OPTIONAL</span></div><div className="control-grid"><div><label>Issue category</label><select value={category} onChange={e=>setCategory(e.target.value)}><option value="">All categories</option>{categories.map(c=><option key={c} value={c}>{categoryNames[c]||c}</option>)}</select></div><div><label>Maximum results</label><select value={topK} onChange={e=>setTopK(Number(e.target.value))}>{[3,5,8,10].map(v=><option key={v} value={v}>{v} matches</option>)}</select></div></div><div className="threshold-row"><label>Candidate similarity floor <strong>{pct(minScore)}</strong></label><input type="range" min="0.05" max="0.30" step="0.01" value={minScore} onChange={e=>setMinScore(Number(e.target.value))}/><small>Lower values show more possible matches. Strong-match threshold remains 30%.</small></div></div>
              <div className="form-foot"><div className="privacy-note"><ShieldCheck size={14}/> Compared against historical ticket records</div><div className="action-row"><button type="button" className="secondary-button" onClick={clearForm}><Trash2 size={14}/> Clear</button><button className="primary-button" disabled={loading}>{loading?<><LoaderCircle className="spin" size={16}/> Searching</>:<><Search size={16}/> Find similar tickets <ArrowUpRight size={15}/></>}</button></div></div>{error&&<div className="error-message">{error}</div>}
            </form>
            <div className="example-strip"><div className="example-title"><Sparkles size={14}/> LOAD A SAMPLE TICKET</div><div className="example-chips">{examples.map(t=><button key={t.ticket_id} onClick={()=>loadExample(t)}><b>{t.ticket_id}</b><span>{t.subject}</span></button>)}</div></div>
          </div>
          <div className="panel results-panel"><div className="results-heading"><div><div className="section-kicker">MATCHING ENGINE</div><h2>Similar past tickets</h2></div><div className="result-tools">{matches?.length>0&&<button className="mini-action" onClick={exportMatches}><ArrowDownToLine size={13}/> Export CSV</button>}<div className="match-count">{matches?matches.length:'—'}<span>CANDIDATES</span></div></div></div>
            {!matches&&!loading&&<div className="empty-results"><div className="empty-graphic"><div className="empty-circle"><Search size={25}/></div><span className="float-dot dot-a"/><span className="float-dot dot-b"/><span className="float-dot dot-c"/></div><h3>Ready when you are</h3><p>Submit a ticket to see ranked historical cases and their original resolutions.</p><div className="empty-steps"><span><i>01</i> Describe issue</span><span><i>02</i> Compare history</span><span><i>03</i> Review evidence</span></div></div>}
            {loading&&<div className="loading-state"><LoaderCircle className="spin" size={28}/><strong>Searching support history</strong><span>Comparing ticket language and context...</span></div>}
            {matches&&matches.length===0&&<div className="no-match"><div className="no-match-icon"><CircleHelp size={25}/></div><h3>No candidate matches found</h3><p>Try broadening the description, removing the category filter or lowering the candidate floor. Do not infer a resolution from unrelated cases.</p><span className="no-match-tag">STANDARD INVESTIGATION RECOMMENDED</span></div>}
            {matches?.length>0&&<div className="match-list"><div className="result-summary"><span><Check size={14}/> {matches.filter(m=>m.relevance==='strong').length} strong · {matches.filter(m=>m.relevance==='possible').length} possible · {matches.filter(m=>m.relevance==='weak').length} weak</span><span>RANKED CANDIDATES</span></div>{matches.map((m,i)=><button className={`match-card ${selected?.ticket_id===m.ticket_id?'selected':''}`} key={m.ticket_id} onClick={()=>setSelected(m)}><div className="match-card-top"><div className="ticket-ref"><span className="rank">0{i+1}</span><strong>{m.ticket_id}</strong><span className="category-pill">{categoryNames[m.category]||m.category}</span><span className={`relevance-pill ${m.relevance}`}>{m.relevance}</span></div><div className="score"><strong>{pct(m.similarity_score)}</strong><span>TEXT SIMILARITY</span></div></div><h3>{m.subject}</h3><p>{m.description}</p><div className="match-meta"><span><Check size={12}/> {m.status}</span><span><Clock3 size={12}/> {m.created_at}</span><span className="view-detail">Inspect resolution <ArrowUpRight size={12}/></span></div></button>)}
              {selected&&<div className="resolution-box"><div className="resolution-title"><div><span className="section-kicker">HISTORICAL RESOLUTION</span><h3>{selected.ticket_id} · {selected.subject}</h3></div><span className="resolved-badge"><Check size={12}/> {selected.status?.toUpperCase()}</span></div><p>{selected.resolution_notes||'No resolution notes available.'}</p><div className="tag-row">{(selected.tags||[]).map(tag=><span key={tag}>#{tag}</span>)}</div><div className="feedback-row"><span>Was this historical resolution useful?</span><button className={feedbackState[selected.ticket_id]===true?'feedback-active':''} onClick={()=>sendFeedback(selected,true)}><ThumbsUp size={13}/> Helpful</button><button className={feedbackState[selected.ticket_id]===false?'feedback-active':''} onClick={()=>sendFeedback(selected,false)}><ThumbsDown size={13}/> Not helpful</button></div></div>}
              <div className="human-note"><ShieldCheck size={15}/><span><strong>Agent review required.</strong> Similarity indicates textual relevance, not a guaranteed solution. Verify product version and customer context.</span></div>
            </div>}
          </div>
        </section>}

        {tab==='library'&&<section className="panel library-panel"><div className="panel-heading"><div><div className="section-kicker">HISTORICAL KNOWLEDGE</div><h2>Knowledge library</h2><p>{libraryTotal} historical records · searchable ticket archive</p></div><button className="secondary-button" onClick={exportLibrary}><ArrowDownToLine size={14}/> Export visible page</button></div><div className="library-filters"><div className="search-input-wrap"><Search size={15}/><input value={libraryQuery} onChange={e=>{setLibraryQuery(e.target.value);setPage(1)}} placeholder="Search ID, subject, description or tags..."/></div><select value={libraryCategory} onChange={e=>{setLibraryCategory(e.target.value);setPage(1)}}><option value="all">All categories</option>{categories.map(c=><option key={c} value={c}>{categoryNames[c]||c}</option>)}</select><select value={libraryStatus} onChange={e=>{setLibraryStatus(e.target.value);setPage(1)}}><option value="all">All statuses</option><option value="resolved">Resolved</option><option value="open">Open</option></select></div><div className="ticket-table-wrap"><table className="ticket-table"><thead><tr><th>Ticket</th><th>Subject</th><th>Category</th><th>Status</th><th>Created</th><th/></tr></thead><tbody>{library.map(t=><tr key={t.ticket_id}><td><strong>{t.ticket_id}</strong></td><td><div className="table-subject">{t.subject}</div><small>{t.description}</small></td><td>{categoryNames[t.category]||t.category}</td><td><span className="status-chip">{t.status}</span></td><td>{t.created_at}</td><td><button className="table-view" onClick={()=>setLibraryDetail(t)}>View</button></td></tr>)}</tbody></table>{library.length===0&&<div className="empty-library">No tickets match these filters.</div>}</div><div className="pagination"><span>Showing {library.length?((page-1)*20+1):0}–{Math.min(page*20,libraryTotal)} of {libraryTotal}</span><div><button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><button disabled={page*20>=libraryTotal} onClick={()=>setPage(p=>p+1)}>Next</button></div></div><div className="library-note"><Database size={16}/> The supplied historical dataset is synthetic case-study data. Export downloads the currently visible page.</div></section>}

        {tab==='overview'&&<section className="panel library-panel"><div className="panel-heading"><div><div className="section-kicker">SUPPORT OPERATIONS</div><h2>Historical ticket analytics</h2><p>Descriptive metrics calculated from the loaded case-study dataset.</p></div><button className="secondary-button" onClick={refreshOverview}><Activity size={14}/> Refresh metrics</button></div><div className="analytics-grid"><div className="analytics-card"><span>Resolution coverage</span><strong>{resolutionRate}%</strong><div className="progress-track"><i style={{width:`${resolutionRate}%`}}/></div><small>{overview?.resolved_tickets ?? 0} of {overview?.historical_tickets ?? 0} records marked resolved</small></div><div className="analytics-card"><span>Category coverage</span><strong>{categories.length}</strong><small>Distinct issue categories in the archive</small></div><div className="analytics-card"><span>Historical records</span><strong>{overview?.historical_tickets ?? 0}</strong><small>Records available for retrieval</small></div></div><h3 className="chart-title">Tickets by category</h3><div className="bar-chart">{Object.entries(overview?.categories||{}).map(([key,value])=><div className="bar-row" key={key}><span>{categoryNames[key]||key}</span><div className="bar-track"><i style={{width:`${value/Math.max(...Object.values(overview?.categories||{a:1}))*100}%`}}/></div><b>{value}</b></div>)}</div><div className="library-note"><ShieldCheck size={16}/> Analytics are based on the supplied 40-ticket sample, not live production traffic.</div></section>}

        {tab==='history'&&<section className="panel library-panel"><div className="panel-heading"><div><div className="section-kicker">RECENT INVESTIGATIONS</div><h2>Search history</h2><p>Saved in this browser so you can reopen previous searches.</p></div><button className="secondary-button" onClick={()=>{setHistory([]);localStorage.removeItem('ticketiq-history');notify('Search history cleared.')}}><Trash2 size={14}/> Clear history</button></div>{history.length===0?<div className="empty-library">No searches yet. Run a similarity search and it will appear here.</div>:<div className="history-list">{history.map(h=><div className="history-item" key={h.id}><div className="history-icon"><History size={16}/></div><div className="history-copy"><strong>{h.subject}</strong><span>{h.date} · {h.count} candidate(s) · {h.id}</span><small>{h.description}</small></div><button className="secondary-button" onClick={()=>reopenHistory(h)}>Reopen <ArrowUpRight size={13}/></button></div>)}</div>}</section>}
        <footer className="page-footer"><span>© 2026 TicketIQ · Support intelligence for Solari Analytics</span><span><span className="footer-dot"/> Human-reviewed retrieval · TF-IDF + cosine similarity</span></footer>
      </div>
    </main>
    {libraryDetail&&<div className="modal-backdrop" onClick={()=>setLibraryDetail(null)}><div className="ticket-modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><div><span className="section-kicker">HISTORICAL TICKET DETAIL</span><h2>{libraryDetail.ticket_id} · {libraryDetail.subject}</h2></div><button className="modal-close" onClick={()=>setLibraryDetail(null)}><X size={17}/></button></div><div className="modal-meta"><span>{categoryNames[libraryDetail.category]||libraryDetail.category}</span><span>{libraryDetail.status}</span><span>{libraryDetail.created_at}</span></div><h4>Issue description</h4><p>{libraryDetail.description}</p><h4>Resolution notes</h4><p>{libraryDetail.resolution_notes||'No resolution notes recorded.'}</p><div className="tag-row">{(libraryDetail.tags||[]).map(tag=><span key={tag}>#{tag}</span>)}</div></div></div>}
    {toast&&<div className="toast"><Check size={15}/>{toast}</div>}
  </div>;
}
export default App;
