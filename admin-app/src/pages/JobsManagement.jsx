import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { normaliseCompany } from '@shared/jobs/companyKey.js';
import {
  Briefcase, Check, X, Ban, RefreshCw, ExternalLink, Play,
  ChevronDown, Keyboard, AlertTriangle, Search, Plus, Trash2, Radar,
} from 'lucide-react';

/**
 * Job board admin.
 *
 * Nothing reaches the public board without passing through the Queue tab, so
 * this page has one job above all others: make reviewing a day's intake take
 * two minutes, not an hour.
 *
 * Four things keep the volume down, and only the last one is UI:
 *   1. aggregator queries are scoped per profession (job_queries)
 *   2. the ingest filter cascade drops non-matches before they become rows
 *   3. ATS sources are trust_level='auto' and skip the queue entirely
 *   4. company trust — blocking an agency once stops it recurring forever
 *
 * So the queue should be tens of rows a day. The bulk bar, grouping and
 * keyboard shortcuts are what make even that fast.
 *
 * The OTHER job of this page is Coverage. job_companies is the single source of
 * truth for whose jobs appear on the board, so the failure mode that matters is
 * a company someone allowed months ago that has quietly never had a source
 * attached and so has never produced a single listing. The Coverage tab exists
 * to make that state impossible to miss, and to fix it in place.
 */

const SENIORITIES = ['entry', 'mid', 'senior'];

const STATUS_COLOURS = {
  pending: '#8200EA',
  approved: '#00A47C',
  rejected: '#EF0B72',
  duplicate: '#999999',
  expired: '#999999',
  stale: '#999999',
};

const formatDate = (value) => {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

/**
 * Retry a mutation once after refreshing the session.
 * Copied from PromptsManagement — the admin app's Supabase JWT expires while a
 * tab sits open, and without this every long review session ends in a failure.
 */
const withSessionRefresh = async (mutationFn) => {
  await supabase.auth.getSession();
  const result = await mutationFn();
  if (result.error) {
    const code = result.error.code || '';
    const msg = (result.error.message || '').toLowerCase();
    if (code === 'PGRST301' || code === 'PGRST302' || msg.includes('jwt')) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) return result;
      return await mutationFn();
    }
  }
  return result;
};

const API_URL = import.meta.env.VITE_API_URL || 'https://ignite-education-api.onrender.com';

const TABS = [
  { key: 'queue', label: 'Queue' },
  { key: 'coverage', label: 'Coverage' },
  { key: 'live', label: 'Live' },
  { key: 'sources', label: 'Sources' },
  { key: 'companies', label: 'Companies' },
  { key: 'runs', label: 'Runs' },
];

/** Sources a board can be attached to, with the params each one needs. */
const BOARD_SOURCES = {
  greenhouse: { label: 'Greenhouse', hint: 'Board token from job-boards.greenhouse.io/<token>', params: null },
  lever: { label: 'Lever', hint: 'Site name from jobs.lever.co/<site>', params: null },
  ashby: { label: 'Ashby', hint: 'Board name from jobs.ashbyhq.com/<name>', params: null },
  workable: { label: 'Workable', hint: 'Account slug from apply.workable.com/<slug>', params: null },
  workday: {
    label: 'Workday',
    hint: 'Needs tenant, wd instance and site. Location facet GUIDs are per-tenant — use Find boards.',
    params: { tenant: '', wd: 3, site: '', facets: { gb: { locations: [] } } },
  },
  eightfold: {
    label: 'Eightfold',
    hint: 'Needs the board host and the domain query parameter.',
    params: { host: '', domain: '', location: 'United Kingdom' },
  },
  oracle_orc: {
    label: 'Oracle Recruiting Cloud',
    hint: 'Needs the Fusion pod host and the careers site number.',
    params: { host: '', siteNumber: 'CX_1' },
  },
  jsonld: {
    label: 'Careers site (JobPosting)',
    hint: 'Any careers site publishing schema.org JobPosting, read through its sitemap.',
    params: { sitemapUrl: '', jobUrlPattern: '/job/' },
  },
};

const JobsManagement = () => {
  const [activeTab, setActiveTab] = useState('queue');
  const [toast, setToast] = useState(null);

  const showToast = useCallback((message, tone = 'ok') => {
    setToast({ message, tone });
    setTimeout(() => setToast(null), 3500);
  }, []);

  return (
    <div className="p-6 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Briefcase size={22} className="text-[#8200EA]" />
          <h1 className="text-2xl font-bold text-gray-900">Job Board</h1>
        </div>
        <RunIngestButton onDone={showToast} />
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
              activeTab === tab.key
                ? 'border-[#8200EA] text-[#8200EA]'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'queue' && <QueueTab showToast={showToast} />}
      {activeTab === 'coverage' && <CoverageTab showToast={showToast} />}
      {activeTab === 'live' && <ListingsTab status="approved" showToast={showToast} />}
      {activeTab === 'sources' && <SourcesTab showToast={showToast} />}
      {activeTab === 'companies' && <CompaniesTab showToast={showToast} />}
      {activeTab === 'runs' && <RunsTab />}

      {toast && (
        <div
          className={`fixed bottom-6 right-6 px-4 py-3 rounded-lg text-white text-sm shadow-lg z-50 ${
            toast.tone === 'error' ? 'bg-[#EF0B72]' : 'bg-[#00A47C]'
          }`}
        >
          {toast.message}
        </div>
      )}
    </div>
  );
};

/* ========================================================================== */
/* Queue                                                                      */
/* ========================================================================== */

function QueueTab({ showToast }) {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(() => new Set());
  const [cursor, setCursor] = useState(0);
  const [groupBy, setGroupBy] = useState('company');
  const [filters, setFilters] = useState({ source: '', profession: '', seniority: '' });
  const [showShortcuts, setShowShortcuts] = useState(false);
  const [preview, setPreview] = useState(null);
  const rowRefs = useRef({});

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_listings')
      .select('id, title, company, company_norm, source, display_source, market, location_raw, is_remote, salary_min, salary_max, salary_currency, salary_period, profession, seniority, seniority_source, seniority_token, posted_at, created_at, description_text, contract_type')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(500);

    if (error) showToast(`Could not load queue: ${error.message}`, 'error');
    setJobs(data || []);
    setLoading(false);
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  const professions = useMemo(
    () => [...new Set(jobs.map(j => j.profession).filter(Boolean))].sort(),
    [jobs]
  );
  const sources = useMemo(
    () => [...new Set(jobs.map(j => j.source).filter(Boolean))].sort(),
    [jobs]
  );

  const filtered = useMemo(() => jobs.filter(job => (
    (!filters.source || job.source === filters.source) &&
    (!filters.profession || job.profession === filters.profession) &&
    (!filters.seniority || job.seniority === filters.seniority)
  )), [jobs, filters]);

  // Grouping by company is the highest-leverage view: an agency's twelve
  // postings collapse into one block you reject and block in a single action.
  const groups = useMemo(() => {
    const map = new Map();
    for (const job of filtered) {
      const key = groupBy === 'source' ? job.source
        : groupBy === 'profession' ? (job.profession || 'Unmapped')
        : job.company;
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(job);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered, groupBy]);

  const flatOrder = useMemo(() => groups.flatMap(([, rows]) => rows), [groups]);

  useEffect(() => { setCursor(0); }, [filters, groupBy]);

  const applyReview = useCallback(async (ids, { status, reason, profession, seniority }) => {
    if (ids.length === 0) return;

    // Optimistic: a review session should feel instant. Reverted below on failure.
    const removing = status && status !== 'pending';
    const snapshot = jobs;
    if (removing) setJobs(prev => prev.filter(j => !ids.includes(j.id)));

    const { data, error } = await withSessionRefresh(() =>
      supabase.rpc('review_job_listings', {
        p_ids: ids,
        p_status: status || null,
        p_reason: reason || null,
        p_profession: profession || null,
        p_seniority: seniority || null,
      })
    );

    if (error) {
      setJobs(snapshot);
      showToast(`Failed: ${error.message}`, 'error');
      return;
    }

    setSelected(new Set());
    showToast(`${data ?? ids.length} listing${(data ?? ids.length) === 1 ? '' : 's'} updated`);
    if (!removing) load();
  }, [jobs, showToast, load]);

  const blockCompany = useCallback(async (job, ids) => {
    const { error } = await withSessionRefresh(() =>
      supabase.from('job_companies').upsert(
        {
          name_norm: job.company_norm,
          display_name: job.company,
          trust: 'blocked',
          reason: 'Blocked from the review queue',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'name_norm' }
      )
    );
    if (error) { showToast(`Could not block: ${error.message}`, 'error'); return; }
    await applyReview(ids, { status: 'rejected', reason: 'Company blocked' });
    showToast(`${job.company} blocked — their listings will not return`);
  }, [applyReview, showToast]);

  const toggleSelect = useCallback((id) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const targetIds = useCallback((job) => (
    selected.size > 0 ? [...selected] : job ? [job.id] : []
  ), [selected]);

  // Keyboard flow. This is what turns review into a rhythm rather than a
  // sequence of mouse trips; focus advances after every action.
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      const job = flatOrder[cursor];
      const advance = () => setCursor(c => Math.min(c + 1, Math.max(flatOrder.length - 1, 0)));

      switch (e.key) {
        case 'j': case 'ArrowDown':
          e.preventDefault(); setCursor(c => Math.min(c + 1, flatOrder.length - 1)); break;
        case 'k': case 'ArrowUp':
          e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); break;
        case 'x':
          e.preventDefault(); if (job) toggleSelect(job.id); advance(); break;
        case 'a':
          e.preventDefault(); if (job) { applyReview(targetIds(job), { status: 'approved' }); advance(); } break;
        case 'r':
          e.preventDefault(); if (job) { applyReview(targetIds(job), { status: 'rejected' }); advance(); } break;
        case 'b':
          e.preventDefault(); if (job) blockCompany(job, targetIds(job)); break;
        case 'e':
          e.preventDefault(); if (job) applyReview(targetIds(job), { seniority: 'entry' }); break;
        case 'm':
          e.preventDefault(); if (job) applyReview(targetIds(job), { seniority: 'mid' }); break;
        case 's':
          e.preventDefault(); if (job) applyReview(targetIds(job), { seniority: 'senior' }); break;
        case 'Enter':
          e.preventDefault(); if (job) setPreview(job); break;
        case 'Escape':
          setPreview(null); setShowShortcuts(false); break;
        case '?':
          e.preventDefault(); setShowShortcuts(v => !v); break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [flatOrder, cursor, applyReview, blockCompany, toggleSelect, targetIds]);

  useEffect(() => {
    const job = flatOrder[cursor];
    if (job && rowRefs.current[job.id]) {
      rowRefs.current[job.id].scrollIntoView({ block: 'nearest' });
    }
  }, [cursor, flatOrder]);

  if (loading) return <p className="text-gray-500 text-sm">Loading queue…</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <span className="text-sm text-gray-600">
          <strong className="text-gray-900">{filtered.length}</strong> awaiting review
        </span>

        <div className="h-4 w-px bg-gray-200" />

        <Select value={groupBy} onChange={setGroupBy} options={[
          { value: 'company', label: 'Group: Company' },
          { value: 'source', label: 'Group: Source' },
          { value: 'profession', label: 'Group: Profession' },
        ]} />
        <Select value={filters.source} onChange={v => setFilters(f => ({ ...f, source: v }))}
          options={[{ value: '', label: 'All sources' }, ...sources.map(s => ({ value: s, label: s }))]} />
        <Select value={filters.profession} onChange={v => setFilters(f => ({ ...f, profession: v }))}
          options={[{ value: '', label: 'All professions' }, ...professions.map(p => ({ value: p, label: p }))]} />
        <Select value={filters.seniority} onChange={v => setFilters(f => ({ ...f, seniority: v }))}
          options={[{ value: '', label: 'All levels' }, ...SENIORITIES.map(s => ({ value: s, label: s }))]} />

        <button
          onClick={() => setSelected(new Set(filtered.map(j => j.id)))}
          className="text-sm text-[#8200EA] hover:underline"
        >
          Select all {filtered.length}
        </button>

        <button onClick={load} className="ml-auto text-gray-500 hover:text-gray-900" title="Reload">
          <RefreshCw size={16} />
        </button>
        <button onClick={() => setShowShortcuts(v => !v)} className="text-gray-500 hover:text-gray-900" title="Keyboard shortcuts (?)">
          <Keyboard size={16} />
        </button>
      </div>

      {showShortcuts && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg text-xs text-gray-700 grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            ['j / k', 'Move down / up'], ['x', 'Toggle select'], ['a', 'Approve'], ['r', 'Reject'],
            ['b', 'Reject + block company'], ['e / m / s', 'Set entry / mid / senior'],
            ['Enter', 'Preview'], ['?', 'Toggle this help'],
          ].map(([key, description]) => (
            <div key={key}><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded font-mono">{key}</kbd> {description}</div>
          ))}
        </div>
      )}

      {selected.size > 0 && (
        <div className="sticky top-0 z-20 flex items-center gap-2 mb-3 p-3 bg-[#8200EA] rounded-lg text-white text-sm flex-wrap">
          <strong>{selected.size} selected</strong>
          <button onClick={() => applyReview([...selected], { status: 'approved' })}
            className="ml-2 px-3 py-1.5 bg-white text-[#00A47C] rounded font-medium hover:bg-gray-50 flex items-center gap-1">
            <Check size={14} /> Approve
          </button>
          <button onClick={() => applyReview([...selected], { status: 'rejected' })}
            className="px-3 py-1.5 bg-white text-[#EF0B72] rounded font-medium hover:bg-gray-50 flex items-center gap-1">
            <X size={14} /> Reject
          </button>
          {SENIORITIES.map(level => (
            <button key={level} onClick={() => applyReview([...selected], { seniority: level })}
              className="px-2.5 py-1.5 bg-white/15 rounded hover:bg-white/25 capitalize">
              {level}
            </button>
          ))}
          <button onClick={() => setSelected(new Set())} className="ml-auto underline">Clear</button>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-500 text-sm">
          Nothing to review. New listings appear here after the nightly ingest.
        </div>
      )}

      {groups.map(([groupKey, rows]) => (
        <div key={groupKey} className="mb-5">
          <div className="flex items-center gap-2 mb-1.5">
            <h3 className="text-sm font-semibold text-gray-900">{groupKey}</h3>
            <span className="text-xs text-gray-500">{rows.length}</span>
            <button
              onClick={() => setSelected(prev => new Set([...prev, ...rows.map(r => r.id)]))}
              className="text-xs text-[#8200EA] hover:underline"
            >
              select group
            </button>
            {groupBy === 'company' && (
              <button
                onClick={() => blockCompany(rows[0], rows.map(r => r.id))}
                className="text-xs text-[#EF0B72] hover:underline flex items-center gap-1"
                title="Reject these and never show this company again"
              >
                <Ban size={11} /> reject + block
              </button>
            )}
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            {rows.map((job) => {
              const index = flatOrder.indexOf(job);
              const isCursor = index === cursor;
              const isSelected = selected.has(job.id);
              return (
                <div
                  key={job.id}
                  ref={el => { rowRefs.current[job.id] = el; }}
                  onClick={() => setCursor(index)}
                  className={`flex items-center gap-3 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 cursor-pointer ${
                    isCursor ? 'bg-[#8200EA]/[0.06]' : isSelected ? 'bg-gray-50' : 'bg-white hover:bg-gray-50'
                  }`}
                  style={isCursor ? { boxShadow: 'inset 3px 0 0 #8200EA' } : undefined}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(job.id)}
                    onClick={e => e.stopPropagation()}
                    className="accent-[#8200EA]"
                  />

                  <span className="font-medium text-gray-900 truncate" style={{ width: '26%' }}>{job.title}</span>
                  <span className="text-gray-600 truncate" style={{ width: '13%' }}>{job.company}</span>
                  <span className="text-gray-500 truncate text-xs" style={{ width: '13%' }}>
                    {job.is_remote ? 'Remote' : ''}{job.is_remote && job.location_raw ? ' · ' : ''}{job.location_raw || ''}
                  </span>

                  <select
                    value={job.profession || ''}
                    onChange={e => applyReview([job.id], { profession: e.target.value })}
                    onClick={e => e.stopPropagation()}
                    className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white"
                    style={{ width: '11%' }}
                  >
                    {professions.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>

                  <select
                    value={job.seniority || 'mid'}
                    onChange={e => applyReview([job.id], { seniority: e.target.value })}
                    onClick={e => e.stopPropagation()}
                    className="text-xs border border-gray-200 rounded px-1.5 py-1 bg-white capitalize"
                    style={{ width: '80px' }}
                  >
                    {SENIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>

                  {/* Why the classifier chose that level — makes a bad call one
                      glance to spot instead of a debugging session. */}
                  <span
                    className="text-[10px] text-gray-400 truncate"
                    style={{ width: '100px' }}
                    title={`${job.seniority_source}${job.seniority_token ? `: ${job.seniority_token}` : ''}`}
                  >
                    {job.seniority_source}{job.seniority_token ? `: ${job.seniority_token}` : ''}
                  </span>

                  <span className="text-xs text-gray-400" style={{ width: '58px' }}>{job.source}</span>
                  <span className="text-xs text-gray-400" style={{ width: '48px' }}>{formatDate(job.posted_at)}</span>

                  <div className="ml-auto flex items-center gap-1">
                    <button onClick={e => { e.stopPropagation(); setPreview(job); }}
                      className="p-1 text-gray-400 hover:text-gray-900" title="Preview">
                      <ChevronDown size={15} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); applyReview([job.id], { status: 'approved' }); }}
                      className="p-1 text-gray-400 hover:text-[#00A47C]" title="Approve (a)">
                      <Check size={15} />
                    </button>
                    <button onClick={e => { e.stopPropagation(); applyReview([job.id], { status: 'rejected' }); }}
                      className="p-1 text-gray-400 hover:text-[#EF0B72]" title="Reject (r)">
                      <X size={15} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {preview && <PreviewDrawer job={preview} onClose={() => setPreview(null)} />}
    </div>
  );
}

/* ========================================================================== */

function PreviewDrawer({ job, onClose }) {
  const [applyUrl, setApplyUrl] = useState(null);

  useEffect(() => {
    // Admins can read job_listing_apply directly via the admin RLS policy —
    // the anon client cannot, which is what makes the public gate airtight.
    supabase.from('job_listing_apply').select('apply_url').eq('job_id', job.id).single()
      .then(({ data }) => setApplyUrl(data?.apply_url || null));
  }, [job.id]);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={onClose}>
      <div className="bg-white w-full max-w-[620px] h-full overflow-y-auto p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{job.title}</h2>
            <p className="text-sm text-gray-600">
              {job.company} · {job.location_raw || 'Location unknown'} · {job.source}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-900"><X size={20} /></button>
        </div>

        {applyUrl && (
          <a href={applyUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#8200EA] hover:underline mb-4">
            <ExternalLink size={14} /> Open at source
          </a>
        )}

        <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
          {job.description_text || 'No description captured.'}
        </pre>
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Live listings                                                              */
/* ========================================================================== */

function ListingsTab({ status, showToast }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('job_listings')
      .select('id, title, company, source, profession, seniority, location_raw, posted_at, expires_at, view_count, apply_click_count, status')
      .eq('status', status)
      .order('posted_at', { ascending: false })
      .limit(400);
    if (error) showToast(error.message, 'error');
    setRows(data || []);
    setLoading(false);
  }, [status, showToast]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (!query) return rows;
    return rows.filter(r =>
      r.title.toLowerCase().includes(query) ||
      r.company.toLowerCase().includes(query) ||
      (r.profession || '').toLowerCase().includes(query)
    );
  }, [rows, search]);

  const update = async (id, patch) => {
    const { error } = await withSessionRefresh(() => supabase.from('job_listings').update(patch).eq('id', id));
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Updated');
    load();
  };

  if (loading) return <p className="text-gray-500 text-sm">Loading…</p>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search live listings"
          className="border border-gray-200 rounded px-3 py-1.5 text-sm w-72"
        />
        <span className="text-sm text-gray-500">{filtered.length} live</span>
        <button onClick={load} className="ml-auto text-gray-500 hover:text-gray-900"><RefreshCw size={16} /></button>
      </div>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {filtered.map(row => (
          <div key={row.id} className="flex items-center gap-3 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 bg-white hover:bg-gray-50">
            <span className="font-medium text-gray-900 truncate" style={{ width: '30%' }}>{row.title}</span>
            <span className="text-gray-600 truncate" style={{ width: '15%' }}>{row.company}</span>
            <span className="text-gray-500 text-xs truncate" style={{ width: '15%' }}>{row.profession}</span>
            <select
              value={row.seniority || 'mid'}
              onChange={e => update(row.id, { seniority_override: e.target.value })}
              className="text-xs border border-gray-200 rounded px-1.5 py-1 capitalize"
            >
              {SENIORITIES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <span className="text-xs text-gray-400">{row.view_count} views · {row.apply_click_count} applies</span>
            <button
              onClick={() => update(row.id, { status: 'expired', expired_at: new Date().toISOString() })}
              className="ml-auto text-xs text-[#EF0B72] hover:underline"
            >
              expire
            </button>
          </div>
        ))}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-gray-500">Nothing live yet.</p>}
      </div>
    </div>
  );
}

/* ========================================================================== */
/* Sources                                                                    */
/* ========================================================================== */

function SourcesTab({ showToast }) {
  const [sources, setSources] = useState([]);
  const [stats, setStats] = useState({});

  const load = useCallback(async () => {
    const [{ data: sourceRows }, { data: listingRows }] = await Promise.all([
      supabase.from('job_sources').select('*').order('kind'),
      supabase.from('job_listings').select('source, status').limit(5000),
    ]);

    // Approval rate is the evidence for promoting a source to trust_level='auto'.
    const tally = {};
    for (const row of listingRows || []) {
      tally[row.source] ||= { approved: 0, total: 0 };
      tally[row.source].total++;
      if (row.status === 'approved') tally[row.source].approved++;
    }
    setStats(tally);
    setSources(sourceRows || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const update = async (key, patch) => {
    const { error } = await withSessionRefresh(() => supabase.from('job_sources').update(patch).eq('key', key));
    if (error) { showToast(error.message, 'error'); return; }
    showToast('Source updated');
    load();
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500 mb-4 flex items-start gap-2">
        <AlertTriangle size={15} className="text-amber-500 shrink-0 mt-0.5" />
        <span>
          Sources set to <strong>auto</strong> publish straight to the board without review. Only promote a
          source once its approval rate is consistently high — ATS feeds (direct employers, full descriptions,
          no agency spam) are the ones that earn it.
        </span>
      </p>

      {sources.map(source => {
        const tally = stats[source.key];
        const rate = tally?.total ? Math.round((tally.approved / tally.total) * 100) : null;
        return (
          <div key={source.key} className="border border-gray-200 rounded-lg p-4 bg-white">
            <div className="flex items-center gap-3 flex-wrap">
              <strong className="text-gray-900">{source.name}</strong>
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-600">{source.kind}</span>

              <label className="flex items-center gap-1.5 text-sm text-gray-700">
                <input type="checkbox" checked={source.enabled} className="accent-[#8200EA]"
                  onChange={e => update(source.key, { enabled: e.target.checked })} />
                enabled
              </label>

              <select value={source.trust_level} onChange={e => update(source.key, { trust_level: e.target.value })}
                className="text-xs border border-gray-200 rounded px-2 py-1">
                <option value="review">review — goes to queue</option>
                <option value="auto">auto — publishes immediately</option>
                <option value="blocked">blocked — skip entirely</option>
              </select>

              {rate !== null && (
                <span className="text-xs text-gray-500">
                  approval rate <strong className="text-gray-900">{rate}%</strong> ({tally.approved}/{tally.total})
                </span>
              )}

              {source.attribution?.required && (
                <span className="text-xs px-2 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200">
                  attribution required
                </span>
              )}

              <span className="ml-auto text-xs text-gray-400">
                last run {source.last_run_at ? formatDate(source.last_run_at) : 'never'}
                {source.typical_volume ? ` · typical ${source.typical_volume}` : ''}
              </span>
            </div>
            {source.notes && <p className="text-xs text-gray-500 mt-2 leading-relaxed">{source.notes}</p>}
          </div>
        );
      })}
    </div>
  );
}

/* ========================================================================== */
/* Coverage                                                                   */
/* ========================================================================== */

/**
 * Which allowlisted companies actually have something fetching their jobs?
 *
 * The allowlist is a gate, not a source: marking a company `allowed` only means
 * we are WILLING to show its roles. If nothing is configured to fetch them, the
 * company sits there producing nothing, and every other screen on this page
 * looks completely normal while it does. That gap is what this tab is for, so
 * zero-coverage companies sort to the top and stay amber until they are fixed.
 *
 * Counts come from the job_company_coverage() RPC rather than from tallying
 * job_listings in the browser — the Sources tab still does the latter and pulls
 * up to 5,000 rows to do it, which stops being correct the moment the board
 * outgrows that limit.
 */
function CoverageTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [boards, setBoards] = useState({});
  const [expanded, setExpanded] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data, error: rpcError }, { data: accounts }] = await Promise.all([
      supabase.rpc('job_company_coverage'),
      supabase.from('job_source_accounts').select('*').order('source'),
    ]);

    if (rpcError) {
      // Almost always "the migration has not been applied yet", which is worth
      // saying out loud rather than rendering an empty table.
      setError(rpcError.message);
      setLoading(false);
      return;
    }

    const byCompany = {};
    for (const account of accounts || []) {
      const key = account.company_norm || normaliseCompany(account.company);
      (byCompany[key] ||= []).push(account);
    }
    setRows((data || []).filter(row => row.allowed));
    setBoards(byCompany);
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(
    () => rows.filter(row => row.display_name.toLowerCase().includes(search.toLowerCase())),
    [rows, search]
  );
  const uncovered = rows.filter(row => !row.enabled_board_count && !row.query_count).length;

  if (error) {
    return (
      <div className="border border-amber-200 bg-amber-50 rounded-lg p-4 text-sm text-amber-900">
        <p className="font-medium mb-1">Coverage data is unavailable.</p>
        <p className="text-xs">{error}</p>
        <p className="text-xs mt-2">
          Apply <code>migrations/add_job_board_multi_ats.sql</code> in the Supabase SQL editor,
          then reload.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies"
          className="border border-gray-200 rounded px-3 py-1.5 text-sm w-72" />
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>{rows.length} allowed</span>
          {uncovered > 0 && (
            <span className="text-amber-700 font-medium flex items-center gap-1">
              <AlertTriangle size={13} /> {uncovered} with no source
            </span>
          )}
          <button onClick={load} className="text-gray-500 hover:text-gray-900" title="Reload">
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Being <strong>allowed</strong> only means we are willing to show a company&apos;s roles.
        A company with no board and no query produces nothing, however long it has been on the list.
      </p>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="flex items-center gap-3 px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b border-gray-200">
          <span style={{ width: 28 }} />
          <span style={{ width: '20%' }}>Company</span>
          <span style={{ width: '32%' }}>Boards</span>
          <span style={{ width: 60 }}>Live</span>
          <span style={{ width: 70 }}>Pending</span>
          <span style={{ width: 90 }}>Last seen</span>
          <span className="flex-1" />
        </div>

        {filtered.map(row => {
          const companyBoards = boards[row.name_norm] || [];
          const covered = row.enabled_board_count > 0 || row.query_count > 0;
          const isOpen = expanded === row.name_norm;

          return (
            <div key={row.name_norm} className={`border-b border-gray-100 last:border-b-0 ${covered ? 'bg-white' : 'bg-amber-50'}`}>
              <div className="flex items-center gap-3 px-3 py-2 text-sm">
                <CompanyLogoCell row={row} />
                <span className="font-medium text-gray-900 truncate" style={{ width: '20%' }}>
                  {row.display_name}
                </span>

                <span className="truncate text-xs" style={{ width: '32%' }}>
                  {companyBoards.length === 0 && row.query_count === 0 ? (
                    <>
                      <span className="text-amber-700 font-medium">no source</span>
                      {/* The actionable half of "no source": discovery has
                          nothing but the logo domain to guess from, so this is
                          the row worth typing a careers URL into. */}
                      {!row.careers_url && (
                        <span className="text-amber-600/70"> · no careers URL</span>
                      )}
                    </>
                  ) : (
                    <span className="text-gray-600">
                      {companyBoards.map(b => (
                        <span key={b.id} className={b.enabled ? '' : 'line-through text-gray-400'}>
                          {b.source}/{b.account}
                          {b.fail_count > 0 && <span className="text-red-600" title={b.last_error}> ⚠</span>}
                          {' '}
                        </span>
                      ))}
                      {row.query_count > 0 && <span className="text-gray-400">+{row.query_count} query</span>}
                    </span>
                  )}
                </span>

                <span className="text-xs text-gray-700" style={{ width: 60 }}>{row.live_count}</span>
                <span className="text-xs text-gray-500" style={{ width: 70 }}>{row.pending_count}</span>
                <span className="text-xs text-gray-500" style={{ width: 90 }}>{formatDate(row.last_seen_at)}</span>

                <div className="flex-1 flex items-center justify-end gap-2">
                  <button onClick={() => setExpanded(isOpen ? null : row.name_norm)}
                    className="text-xs text-[#8200EA] hover:underline flex items-center gap-1">
                    {isOpen ? 'close' : 'boards'}
                    <ChevronDown size={12} className={isOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                  </button>
                </div>
              </div>

              {isOpen && (
                <BoardEditor company={row} boards={companyBoards} onChanged={load} showToast={showToast} />
              )}
            </div>
          );
        })}

        {!loading && filtered.length === 0 && (
          <p className="p-6 text-center text-sm text-gray-500">No allowed companies match that search.</p>
        )}
      </div>
    </div>
  );
}

/**
 * Add, edit and test the boards attached to one company.
 *
 * `company` and `company_norm` are always taken from the row rather than typed.
 * That closes the failure this whole feature exists to prevent: a board whose
 * company string does not normalise to an allowlisted key fetches jobs
 * perfectly well and then has every one of them dropped as company_not_allowed.
 */
function BoardEditor({ company, boards, onChanged, showToast }) {
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [probe, setProbe] = useState(null);
  const [found, setFound] = useState(null);

  const authHeader = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return { 'Content-Type': 'application/json', Authorization: `Bearer ${session?.access_token}` };
  };

  const save = async (board) => {
    setBusy(true);
    let params = {};
    try {
      params = board.paramsText ? JSON.parse(board.paramsText) : {};
    } catch {
      setBusy(false);
      showToast('params is not valid JSON', 'error');
      return;
    }

    const payload = {
      source: board.source,
      account: board.account.trim(),
      company: company.display_name,
      company_norm: company.name_norm,
      markets: ['gb'],
      enabled: board.enabled !== false,
      max_pages: Number(board.max_pages) || 1,
      domain: company.domain || null,
      params,
      // A saved change means the previous error no longer describes the board.
      fail_count: 0,
      last_error: null,
    };

    const { error } = await withSessionRefresh(() =>
      board.id
        ? supabase.from('job_source_accounts').update(payload).eq('id', board.id)
        : supabase.from('job_source_accounts').insert(payload)
    );
    setBusy(false);
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`Saved ${payload.source}/${payload.account}`);
    setDraft(null);
    onChanged();
  };

  const remove = async (board) => {
    if (!window.confirm(`Remove ${board.source}/${board.account}? Listings already published stay on the board.`)) return;
    const { error } = await withSessionRefresh(() =>
      supabase.from('job_source_accounts').delete().eq('id', board.id)
    );
    if (error) { showToast(error.message, 'error'); return; }
    onChanged();
  };

  // Test before saving. Without this an admin saves a guess and finds out
  // tomorrow morning; the probe answers in a second and writes nothing.
  const testBoard = async (board) => {
    setBusy(true);
    setProbe(null);
    try {
      let params = {};
      try { params = board.paramsText ? JSON.parse(board.paramsText) : (board.params || {}); }
      catch { throw new Error('params is not valid JSON'); }

      const res = await fetch(`${API_URL}/api/admin/jobs/probe`, {
        method: 'POST',
        headers: await authHeader(),
        body: JSON.stringify({
          source: board.source, account: board.account, params, company: company.display_name, market: 'gb',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'probe failed');
      setProbe(data);
    } catch (error) {
      showToast(error.message, 'error');
    }
    setBusy(false);
  };

  // Passed to discovery, not just stored: the whole point is that the next
  // "Find boards" fingerprints the page the admin actually knows about instead
  // of guessing four conventional URLs off the logo domain.
  const saveCareersUrl = async (url) => {
    const { error } = await withSessionRefresh(() =>
      supabase.from('job_companies')
        .update({ careers_url: url || null })
        .eq('name_norm', company.name_norm)
    );
    if (error) { showToast(error.message, 'error'); return false; }
    onChanged();
    return true;
  };

  const findBoards = async (careersUrl) => {
    setBusy(true);
    setFound(null);
    try {
      const res = await fetch(`${API_URL}/api/admin/jobs/discover`, {
        method: 'POST',
        headers: await authHeader(),
        body: JSON.stringify({
          company: company.display_name,
          domain: company.domain,
          careersUrl: careersUrl ?? company.careers_url ?? null,
          aliases: company.aliases || [],
          market: 'gb',
        }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'discovery failed');
      setFound(data);
    } catch (error) {
      showToast(error.message, 'error');
    }
    setBusy(false);
  };

  return (
    <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
      <CareersUrlField company={company} busy={busy}
        onSave={saveCareersUrl} onFind={findBoards} />

      {boards.map(board => (
        <BoardRow key={board.id} board={board} busy={busy}
          onSave={save} onRemove={remove} onTest={testBoard} />
      ))}

      {draft && <BoardRow board={draft} busy={busy} isDraft
        onSave={save} onRemove={() => setDraft(null)} onTest={testBoard} />}

      <div className="flex items-center gap-3 mt-2">
        <button disabled={busy}
          onClick={() => setDraft({ source: 'greenhouse', account: '', enabled: true, max_pages: 1, paramsText: '' })}
          className="text-xs flex items-center gap-1 text-[#8200EA] hover:underline disabled:opacity-50">
          <Plus size={12} /> Add board
        </button>
        <button disabled={busy} onClick={() => findBoards()}
          className="text-xs flex items-center gap-1 text-[#8200EA] hover:underline disabled:opacity-50">
          <Radar size={12} /> Find boards
        </button>
        {busy && <span className="text-xs text-gray-400">working…</span>}
      </div>

      {probe && (
        <div className="mt-3 text-xs bg-white border border-gray-200 rounded p-3">
          <p className="font-medium text-gray-800 mb-1">
            {probe.fetched} fetched · {probe.normalised} usable · {probe.inMarket} in GB
          </p>
          {probe.sample.map((job, i) => (
            <p key={i} className="text-gray-600 truncate">
              {job.title} — <span className="text-gray-400">{job.location || 'no location'}</span>
            </p>
          ))}
          {probe.inMarket === 0 && (
            <p className="text-amber-700 mt-1">
              Nothing matched the GB market. For Workday that usually means the location facet is missing —
              try Find boards.
            </p>
          )}
        </div>
      )}

      {found && (
        <div className="mt-3 text-xs bg-white border border-gray-200 rounded p-3">
          {found.denied ? (
            <p className="text-gray-700">⛔ Not probed: {found.denied}</p>
          ) : found.candidates.length === 0 ? (
            <>
              <p className="text-gray-700 mb-1">No board found.</p>
              {found.vendors.filter(v => !v.adapter).map(v => (
                <p key={v.vendor} className="text-gray-500">
                  Uses <strong>{v.vendor}</strong>, which has no adapter yet — cover this company with an
                  aggregator query instead.
                </p>
              ))}
              {found.notes.map((note, i) => <p key={i} className="text-gray-400">{note}</p>)}
            </>
          ) : (
            found.candidates.map((candidate, i) => (
              <div key={i} className="flex items-start justify-between gap-3 py-1">
                <div className="min-w-0">
                  <p className="font-medium text-gray-800">
                    {candidate.source}/{candidate.account} — {candidate.totalJobs} jobs, {candidate.marketJobs} in GB
                  </p>
                  {(candidate.notes || []).map((note, j) => (
                    <p key={j} className="text-gray-400 truncate">{note}</p>
                  ))}
                </div>
                <button
                  onClick={() => setDraft({
                    source: candidate.source,
                    account: candidate.account,
                    enabled: true,
                    max_pages: candidate.maxPages || 1,
                    paramsText: JSON.stringify(candidate.params || {}, null, 2),
                  })}
                  className="text-[#8200EA] hover:underline shrink-0">
                  use this
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Where this company's vacancies are listed, typed by an admin.
 *
 * Discovery otherwise has only the logo domain to work from and guesses four
 * conventional addresses off it (careers.x, x/careers, jobs.x, x/jobs). That is
 * right for most companies and wrong for most of the ones still uncovered —
 * their boards sit on separate brand domains or behind redirects. Typing the URL
 * removes the guess, which is usually the whole difference between "no board
 * found" and a seedable candidate.
 *
 * Saves and discovers in one action, because saving alone changes nothing an
 * admin can see and the next thing they would do is press Find boards anyway.
 */
function CareersUrlField({ company, busy, onSave, onFind }) {
  const [value, setValue] = useState(company.careers_url || '');
  const [error, setError] = useState(null);

  useEffect(() => { setValue(company.careers_url || ''); }, [company.careers_url]);

  const dirty = value.trim() !== (company.careers_url || '');

  // Same rule as the CHECK constraint in add_job_company_careers_url.sql. A
  // pasted "careers.bbc.co.uk" with no scheme cannot be fetched, and finding
  // that out from a Postgres error is a worse experience than being told here.
  const normalise = (raw) => {
    const trimmed = raw.trim();
    if (!trimmed) return '';
    return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  };

  const submit = async (alsoFind) => {
    const url = normalise(value);
    if (url) {
      try { new URL(url); } catch { setError('not a valid URL'); return; }
    }
    setError(null);
    setValue(url);
    const saved = await onSave(url);
    if (saved && alsoFind) onFind(url || null);
  };

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 shrink-0" style={{ width: 78 }}>Careers URL</label>
        <input
          value={value}
          onChange={e => { setValue(e.target.value); setError(null); }}
          onKeyDown={e => { if (e.key === 'Enter') submit(true); }}
          placeholder={company.domain ? `https://careers.${company.domain}` : 'https://…'}
          spellCheck={false}
          className={`flex-1 text-xs border rounded px-2 py-1 ${error ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
        />
        {value && !dirty && (
          <a href={value} target="_blank" rel="noreferrer"
            className="text-xs text-gray-400 hover:text-gray-700 shrink-0">open</a>
        )}
        <button disabled={busy || !dirty} onClick={() => submit(false)}
          className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-40 shrink-0">save</button>
        <button disabled={busy} onClick={() => submit(true)}
          className="text-xs bg-[#8200EA] text-white rounded px-2 py-1 hover:bg-[#6b00c2] disabled:opacity-50 shrink-0">
          save &amp; find
        </button>
      </div>
      {error
        ? <p className="text-[11px] text-red-600 mt-1" style={{ marginLeft: 86 }}>{error}</p>
        : <p className="text-[11px] text-gray-400 mt-1" style={{ marginLeft: 86 }}>
            Point at the page that lists vacancies, not the &ldquo;life at us&rdquo; page — the
            ATS marker is in the listing markup. Leave blank to guess from {company.domain || 'the domain'}.
          </p>}
    </div>
  );
}

function BoardRow({ board, busy, isDraft, onSave, onRemove, onTest }) {
  const [local, setLocal] = useState({
    ...board,
    paramsText: board.paramsText ?? JSON.stringify(board.params || {}, null, 2),
  });
  const [paramsError, setParamsError] = useState(null);

  const set = (patch) => setLocal(prev => ({ ...prev, ...patch }));
  const spec = BOARD_SOURCES[local.source] || {};

  return (
    <div className="bg-white border border-gray-200 rounded p-3 mb-2">
      <div className="flex items-center gap-2 flex-wrap">
        <select value={local.source} onChange={e => {
          const source = e.target.value;
          const template = BOARD_SOURCES[source]?.params;
          set({ source, paramsText: template ? JSON.stringify(template, null, 2) : '' });
        }} className="text-xs border border-gray-200 rounded px-2 py-1">
          {Object.entries(BOARD_SOURCES).map(([key, value]) => (
            <option key={key} value={key}>{value.label}</option>
          ))}
        </select>

        <input value={local.account || ''} onChange={e => set({ account: e.target.value })}
          placeholder="board token" className="text-xs border border-gray-200 rounded px-2 py-1 w-44" />

        <label className="flex items-center gap-1 text-xs text-gray-600">
          <input type="checkbox" checked={local.enabled !== false}
            onChange={e => set({ enabled: e.target.checked })} className="accent-[#8200EA]" />
          enabled
        </label>

        <label className="flex items-center gap-1 text-xs text-gray-600">
          pages
          <input type="number" min="1" max="50" value={local.max_pages || 1}
            onChange={e => set({ max_pages: e.target.value })}
            className="text-xs border border-gray-200 rounded px-2 py-1 w-14" />
        </label>

        <div className="flex-1" />

        <button disabled={busy} onClick={() => onTest(local)}
          className="text-xs text-gray-600 hover:text-gray-900 disabled:opacity-50">test</button>
        <button disabled={busy || !!paramsError} onClick={() => onSave(local)}
          className="text-xs bg-[#8200EA] text-white rounded px-2 py-1 hover:bg-[#6b00c2] disabled:opacity-50">
          save
        </button>
        <button disabled={busy} onClick={() => onRemove(local)}
          className="text-xs text-red-600 hover:text-red-800 disabled:opacity-50">
          {isDraft ? <X size={13} /> : <Trash2 size={13} />}
        </button>
      </div>

      {spec.hint && <p className="text-[11px] text-gray-400 mt-1">{spec.hint}</p>}

      {/* Only shown when the source needs it — a JSON box on a Greenhouse board
          is noise, and an empty one is the correct config there. */}
      {spec.params && (
        <>
          <textarea
            value={local.paramsText}
            onChange={e => set({ paramsText: e.target.value })}
            onBlur={() => {
              if (!local.paramsText.trim()) { setParamsError(null); return; }
              try { JSON.parse(local.paramsText); setParamsError(null); }
              catch (error) { setParamsError(error.message); }
            }}
            rows={5}
            spellCheck={false}
            className={`w-full mt-2 text-[11px] font-mono border rounded p-2 ${
              paramsError ? 'border-red-400 bg-red-50' : 'border-gray-200'
            }`}
          />
          {paramsError && <p className="text-[11px] text-red-600">{paramsError}</p>}
        </>
      )}

      {!isDraft && (local.last_ok_at || local.fail_count > 0) && (
        <p className="text-[11px] text-gray-400 mt-1">
          {local.fail_count > 0
            ? <span className="text-red-600">{local.fail_count} consecutive failure(s): {local.last_error}</span>
            : `last ok ${formatDate(local.last_ok_at)}`}
        </p>
      )}
    </div>
  );
}

/* ========================================================================== */
/* Companies                                                                  */
/* ========================================================================== */

function CompaniesTab({ showToast }) {
  const [rows, setRows] = useState([]);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('job_companies')
      // Allowed brands first — this tab is now primarily the allowlist, and the
      // allowlist is what decides whether anything gets ingested at all.
      .select('*')
      .order('allowed', { ascending: false })
      .order('display_name')
      .limit(400);
    setRows(data || []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addCompany = async () => {
    const name = window.prompt('Company name, exactly as it should appear on the board:');
    if (!name?.trim()) return;
    const domain = window.prompt(`Website domain for ${name.trim()} (for the logo), e.g. monzo.com:`);
    // The SAME function the ingest uses, not a copy of it — see
    // shared/jobs/companyKey.js. A key that drifts from the pipeline's is a
    // company that silently never ingests, which is the exact failure the
    // Coverage tab exists to surface.
    const nameNorm = normaliseCompany(name);

    const { error } = await withSessionRefresh(() =>
      supabase.from('job_companies').upsert({
        name_norm: nameNorm,
        display_name: name.trim(),
        domain: domain?.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '') || null,
        domain_source: domain?.trim() ? 'manual' : null,
        allowed: true,
        trust: 'auto',
        logo_status: 'pending',
        logo_checked_at: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'name_norm' })
    );
    if (error) { showToast(error.message, 'error'); return; }
    showToast(`${name.trim()} allowed. Attach a board in the Coverage tab, or it will never produce a listing.`);
    load();
  };

  const update = async (nameNorm, patch) => {
    const { error } = await withSessionRefresh(() =>
      supabase.from('job_companies').update({ ...patch, updated_at: new Date().toISOString() }).eq('name_norm', nameNorm)
    );
    if (error) { showToast(error.message, 'error'); return; }
    load();
  };

  const filtered = rows.filter(r => r.display_name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search companies"
          className="border border-gray-200 rounded px-3 py-1.5 text-sm w-72" />
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-500">
            {rows.filter(r => r.allowed).length} allowed
          </span>
          <button onClick={addCompany}
            className="text-sm bg-[#8200EA] text-white rounded px-3 py-1.5 hover:bg-[#6b00c2]">
            Add company
          </button>
        </div>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Only companies marked <strong>allowed</strong> are ingested — everything else is dropped
        before it becomes a row. Un-allowing a company stops new listings but does not remove ones
        already published; clear those in the Live tab.
      </p>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {filtered.map(row => (
          <div key={row.name_norm} className="flex items-center gap-3 px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 bg-white">
            {/* The logo sits next to the domain that produced it, so a
                wrong-brand match is spottable at a glance rather than only
                after someone complains. */}
            <CompanyLogoCell row={row} />

            {/* The allow switch. This is the gate the whole ingest reads. */}
            <label className="flex items-center gap-1.5 shrink-0 cursor-pointer" title="Ingest jobs from this company">
              <input type="checkbox" checked={!!row.allowed}
                onChange={e => update(row.name_norm, { allowed: e.target.checked })}
                className="accent-[#8200EA]" />
              <span className={`text-xs ${row.allowed ? 'text-gray-900' : 'text-gray-400'}`}>allow</span>
            </label>

            <span className="font-medium text-gray-900 truncate" style={{ width: '18%' }}>{row.display_name}</span>

            <DomainField row={row} onSave={domain => update(row.name_norm, {
              domain: domain || null,
              // A typed domain is authoritative and must never be overwritten
              // by a later guess. Clearing it hands the company back to the
              // automatic path.
              domain_source: domain ? 'manual' : null,
              // Force the next ingest to re-resolve rather than wait out the
              // 30-day refresh window.
              logo_checked_at: null,
              logo_status: domain ? 'pending' : row.logo_status,
            })} />

            <select value={row.trust} onChange={e => update(row.name_norm, { trust: e.target.value })}
              className="text-xs border border-gray-200 rounded px-2 py-1">
              <option value="review">review</option>
              <option value="auto">auto-approve</option>
              <option value="blocked">blocked</option>
            </select>

            <AliasesField row={row} onSave={aliases => update(row.name_norm, { aliases })} />

            <span className="text-xs text-gray-500 whitespace-nowrap">
              {row.approved_count} approved · {row.rejected_count} rejected
            </span>

            {row.logo_status === 'suppressed' ? (
              <button onClick={() => update(row.name_norm, { logo_status: 'pending', logo_checked_at: null })}
                className="text-xs text-gray-500 hover:text-gray-900 whitespace-nowrap">
                un-suppress logo
              </button>
            ) : row.logo_url ? (
              // Permanent: the ingest never retries a suppressed company. This
              // is the takedown lever for a logo that is not this employer's.
              <button onClick={() => update(row.name_norm, { logo_status: 'suppressed', logo_url: null })}
                className="text-xs text-red-600 hover:text-red-800 whitespace-nowrap">
                suppress logo
              </button>
            ) : null}

            {row.reason && <span className="text-xs text-gray-400 italic truncate">{row.reason}</span>}
          </div>
        ))}
        {filtered.length === 0 && <p className="p-6 text-center text-sm text-gray-500">No companies recorded yet.</p>}
      </div>
    </div>
  );
}

/**
 * Extra spellings that should resolve to this brand.
 *
 * Only matters for the aggregator tier. ATS boards take their company name from
 * job_source_accounts.company, which we control, so those always match exactly;
 * an aggregator reports whatever the employer typed into their own listing
 * ("Marks and Spencer plc", "M&S").
 *
 * Each alias renders its NORMALISED form live, because that — not what was
 * typed — is what the allowlist compares. Seeing "Marks and Spencer plc" become
 * `marks and spencer` is the difference between an alias that works and one
 * that quietly does nothing.
 */
function AliasesField({ row, onSave }) {
  const [value, setValue] = useState((row.aliases || []).join(', '));
  const [editing, setEditing] = useState(false);

  useEffect(() => { setValue((row.aliases || []).join(', ')); }, [row.aliases]);

  const parsed = value.split(',').map(a => a.trim()).filter(Boolean);
  const commit = () => {
    setEditing(false);
    const next = [...new Set(parsed)];
    if (next.join('|') !== (row.aliases || []).join('|')) onSave(next);
  };

  if (!editing) {
    return (
      <button onClick={() => setEditing(true)}
        className="text-xs text-gray-500 hover:text-gray-900 truncate text-left" style={{ width: '16%' }}
        title="Extra spellings an aggregator might use">
        {parsed.length ? parsed.join(', ') : <span className="text-gray-300">+ aliases</span>}
      </button>
    );
  }

  return (
    <div style={{ width: '16%' }}>
      <input
        autoFocus
        value={value}
        onChange={e => setValue(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        placeholder="M&S, Marks and Spencer plc"
        className="text-xs border border-gray-200 rounded px-2 py-1 w-full"
      />
      {parsed.length > 0 && (
        <p className="text-[10px] text-gray-400 truncate mt-0.5" title="What the allowlist will actually compare">
          → {parsed.map(normaliseCompany).filter(Boolean).join(' · ')}
        </p>
      )}
    </div>
  );
}

/** 28px preview of whatever the board is currently showing for this employer. */
function CompanyLogoCell({ row }) {
  const [broken, setBroken] = useState(false);

  if (!row.logo_url || broken) {
    return (
      <span
        className="shrink-0 rounded flex items-center justify-center text-white text-xs font-semibold bg-gray-300"
        style={{ width: 28, height: 28 }}
        title={row.logo_status === 'suppressed' ? 'Logo suppressed' : 'No logo resolved'}
      >
        {row.display_name.trim().charAt(0).toUpperCase()}
      </span>
    );
  }

  return (
    <img src={row.logo_url} alt="" onError={() => setBroken(true)}
      className="shrink-0 rounded object-contain bg-white border border-gray-200"
      style={{ width: 28, height: 28, padding: 3 }}
      title={`${row.logo_source || 'unknown'} · ${row.domain_source || 'no domain source'}`} />
  );
}

/** Editable domain. Commits on blur or Enter, so it never fires per keystroke. */
function DomainField({ row, onSave }) {
  const [value, setValue] = useState(row.domain || '');

  // Re-sync when the parent reloads after a save elsewhere in the row.
  useEffect(() => { setValue(row.domain || ''); }, [row.domain]);

  const commit = () => {
    const next = value.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
    if (next === (row.domain || '')) return;
    onSave(next);
  };

  return (
    <input
      value={value}
      onChange={e => setValue(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      placeholder="domain.com"
      title={row.domain_source ? `domain source: ${row.domain_source}` : 'no domain resolved'}
      className={`text-xs border rounded px-2 py-1 w-40 ${
        row.domain_source === 'guessed' ? 'border-amber-300 bg-amber-50' : 'border-gray-200'
      }`}
    />
  );
}

/* ========================================================================== */
/* Runs                                                                       */
/* ========================================================================== */

function RunsTab() {
  const [runs, setRuns] = useState([]);

  useEffect(() => {
    supabase
      .from('job_ingest_runs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(60)
      .then(({ data }) => setRuns(data || []));
  }, []);

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4">
        All ingest tuning starts here. The <strong>dropped</strong> breakdown says which filter to move if the
        queue is too big or the board too thin.
      </p>

      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {runs.map(run => (
          <div key={run.id} className="px-3 py-2 text-sm border-b border-gray-100 last:border-b-0 bg-white">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="font-medium text-gray-900" style={{ width: '110px' }}>{run.source}/{run.market}</span>
              <span className="text-xs px-2 py-0.5 rounded text-white" style={{ backgroundColor: STATUS_COLOURS[run.status] || '#999' }}>
                {run.status}
              </span>
              <span className="text-xs text-gray-500">
                {run.fetched} fetched · {run.inserted} new · {run.auto_approved} auto · {run.queued} queued ·{' '}
                {run.updated} refreshed · {run.expired} expired · {run.api_calls} list calls
                {run.detail_calls > 0 && ` · ${run.detail_calls} detail calls`}
              </span>
              <span className="ml-auto text-xs text-gray-400">
                {run.started_at ? new Date(run.started_at).toLocaleString('en-GB') : ''} ({run.trigger})
              </span>
            </div>
            {run.dropped && Object.keys(run.dropped).length > 0 && (
              <div className="mt-1 flex gap-2 flex-wrap">
                {Object.entries(run.dropped).map(([reason, count]) => (
                  <span key={reason} className="text-[11px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">
                    {reason}: {count}
                  </span>
                ))}
              </div>
            )}
            {run.error && <p className="text-xs text-[#EF0B72] mt-1">{run.error}</p>}
          </div>
        ))}
        {runs.length === 0 && <p className="p-6 text-center text-sm text-gray-500">No ingest runs yet.</p>}
      </div>
    </div>
  );
}

/* ========================================================================== */

/**
 * Manual ingest.
 *
 * The source picker and dry-run switch exist so a newly configured board can be
 * exercised without a terminal. Dry run is the important one: it classifies and
 * reports the whole drop breakdown while writing nothing, which is how you find
 * out a board is misconfigured before it publishes to the public page — every
 * allowlisted company is trust 'auto', so a real run goes straight to /jobs.
 */
function RunIngestButton({ onDone }) {
  const [running, setRunning] = useState(false);
  const [open, setOpen] = useState(false);
  const [sources, setSources] = useState([]);
  const [selected, setSelected] = useState([]);
  const [dryRun, setDryRun] = useState(false);

  useEffect(() => {
    supabase.from('job_sources').select('key, name, enabled, kind').order('kind').order('key')
      .then(({ data }) => setSources(data || []));
  }, []);

  const run = async () => {
    setRunning(true);
    setOpen(false);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_URL}/api/admin/jobs/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({
          ...(selected.length ? { sources: selected } : {}),
          ...(dryRun ? { dryRun: true } : {}),
          // The two-phase sources fetch a description per job, so the default
          // 240s process budget is not enough when they are in scope.
          maxSeconds: 420,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success) throw new Error(body.error || 'Ingest failed');

      const t = body.totals || {};
      onDone(
        dryRun
          ? `Dry run: ${t.fetched} fetched, ${t.inserted} would be new — nothing written`
          : `Ingest done: ${t.fetched} fetched, ${t.inserted} new, ${t.queued} queued for review`
      );
    } catch (error) {
      onDone(`Ingest failed: ${error.message}`, 'error');
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="relative flex items-center gap-2">
      <button
        onClick={() => setOpen(o => !o)}
        disabled={running}
        className="flex items-center gap-1 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:text-gray-900 disabled:opacity-60"
      >
        {selected.length ? `${selected.length} source${selected.length > 1 ? 's' : ''}` : 'All sources'}
        {dryRun && <span className="text-[#8200EA] font-medium">· dry</span>}
        <ChevronDown size={14} />
      </button>

      {open && (
        <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50 w-64">
          <label className="flex items-center gap-2 text-sm text-gray-700 pb-2 mb-2 border-b border-gray-100">
            <input type="checkbox" checked={dryRun} onChange={e => setDryRun(e.target.checked)}
              className="accent-[#8200EA]" />
            Dry run — write nothing
          </label>
          {sources.map(source => (
            <label key={source.key} className="flex items-center gap-2 text-sm py-0.5 text-gray-700">
              <input
                type="checkbox"
                checked={selected.includes(source.key)}
                onChange={e => setSelected(prev =>
                  e.target.checked ? [...prev, source.key] : prev.filter(k => k !== source.key)
                )}
                className="accent-[#8200EA]"
              />
              <span className={source.enabled ? '' : 'text-gray-400'}>
                {source.name}{source.enabled ? '' : ' (disabled)'}
              </span>
            </label>
          ))}
          <p className="text-[11px] text-gray-400 mt-2">
            A disabled source stays disabled — the run skips it whether or not it is ticked here.
          </p>
        </div>
      )}

      <button
        onClick={run}
        disabled={running}
        className="flex items-center gap-2 px-4 py-2 bg-[#8200EA] text-white rounded-lg text-sm font-medium hover:bg-[#6d00c4] disabled:opacity-60"
      >
        <Play size={15} />
        {running ? 'Running ingest…' : dryRun ? 'Dry run' : 'Run ingest now'}
      </button>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="text-xs border border-gray-200 rounded px-2 py-1.5 bg-white text-gray-700"
    >
      {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

export default JobsManagement;
