'use client';
import { useState, useEffect } from 'react';

const TYPE_CONFIG = {
  restaurant: { emoji: '🍽️', color: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100' },
  bar:        { emoji: '🍸', color: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100' },
  musée:      { emoji: '🏛️', color: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100' },
  parc:       { emoji: '🌿', color: 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100' },
  monument:   { emoji: '🗼', color: 'bg-yellow-50 border-yellow-200 text-yellow-700 hover:bg-yellow-100' },
  marché:     { emoji: '🛍️', color: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100' },
  spa:        { emoji: '🧘', color: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100' },
  hôtel:      { emoji: '🏨', color: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100' },
  autre:      { emoji: '📍', color: 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100' },
};

function VolBlock({ vol, villeDepart, destination, dateDebut, dateFin, nbPersonnes }) {
  if (!vol) return null;
  const buildGoogleFlightsUrl = () => {
    const from = encodeURIComponent(villeDepart || '');
    const to = encodeURIComponent(destination || '');
    const params = new URLSearchParams({ hl: "fr", curr: "EUR" }); return `https://www.google.com/travel/flights/search?q=vol+${encodeURIComponent(villeDepart)}+${encodeURIComponent(destination)}&${params}`;
  };
  return (
    <div className="bg-sky-500/10 border border-sky-400/30 rounded-2xl p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1">
        <span className="text-3xl">✈️</span>
        <div>
          <div className="text-white font-bold text-sm mb-0.5">Vol estimé — {villeDepart} → {destination}</div>
          <div className="text-sky-200 text-sm">
            <span className="font-semibold">{vol.fourchette}</span>
            <span className="text-white/40 mx-2">·</span>{vol.type_vol}
            {vol.duree_estimee && <><span className="text-white/40 mx-2">·</span>{vol.duree_estimee}</>}
          </div>
          {vol.total_personnes && nbPersonnes > 1 && (
            <div className="text-sky-300 text-xs mt-1">Total {nbPersonnes} passagers : <span className="font-semibold">{vol.total_personnes}</span></div>
          )}
          <div className="text-white/30 text-xs mt-1">Estimation approximative — vérifiez les prix réels</div>
        </div>
      </div>
      <a href={buildGoogleFlightsUrl()} target="_blank" rel="noopener noreferrer"
        className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm px-4 py-3 rounded-xl transition-all whitespace-nowrap">
        <span>🔍</span> Voir les vols
      </a>
    </div>
  );
}

function LieuChip({ lieu, destination }) {
  const cfg = TYPE_CONFIG[lieu.type] || TYPE_CONFIG['autre'];
  const query = encodeURIComponent(`${lieu.nom} ${destination || ''}`);
  return (
    <a href={`https://www.google.com/maps/search/${query}`} target="_blank" rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${cfg.color}`}>
      <span>{cfg.emoji}</span><span>{lieu.nom}</span>
      {lieu.prix && <span className="opacity-60">· {lieu.prix}</span>}
      <span className="opacity-40 text-[10px]">↗</span>
    </a>
  );
}

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ─── Badge composants ─────────────────────────────────────────────────────────
function BadgeRequired() {
  return <span className="ml-2 text-[10px] font-bold uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-400/40 px-1.5 py-0.5 rounded-md">Obligatoire</span>;
}
function BadgeOptional({ hint }) {
  return (
    <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider bg-white/10 text-white/40 border border-white/20 px-1.5 py-0.5 rounded-md" title={hint}>
      Optionnel
    </span>
  );
}

// ─── Tooltip d'info ───────────────────────────────────────────────────────────
function InfoBubble({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative inline-block ml-1.5">
      <button
        type="button"
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        className="w-4 h-4 rounded-full bg-white/20 text-white/60 text-[10px] font-bold inline-flex items-center justify-center hover:bg-blue-400/40 transition-colors"
      >?</button>
      {show && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 border border-white/20 text-white/80 text-xs rounded-xl px-3 py-2 shadow-xl z-50 leading-relaxed">
          {text}
        </span>
      )}
    </span>
  );
}

// ─── Séparateur de section ────────────────────────────────────────────────────
function SectionTitle({ step, label, sub }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-7 h-7 rounded-full bg-blue-500/30 border border-blue-400/50 text-blue-300 text-xs font-bold flex items-center justify-center flex-shrink-0">{step}</div>
      <div>
        <div className="text-white font-bold text-sm">{label}</div>
        {sub && <div className="text-white/40 text-xs mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Bloc résumé logique ──────────────────────────────────────────────────────
function LogicSummary({ destination, budget }) {
  let icon, text, color;
  if (!destination && !budget) {
    icon = '🌍'; color = 'border-green-400/30 bg-green-500/10 text-green-200';
    text = 'Sans destination ni budget → l\'IA suggère le TOP 3 des destinations selon vos préférences';
  } else if (destination && !budget) {
    icon = '💼'; color = 'border-purple-400/30 bg-purple-500/10 text-purple-200';
    text = `Destination "${destination}" sans budget → l\'IA génère 3 variantes (Réduit / Moyen / Premium)`;
  } else if (destination && budget) {
    icon = '🗺️'; color = 'border-blue-400/30 bg-blue-500/10 text-blue-200';
    text = `Destination "${destination}" + budget ${budget}€ → itinéraire complet jour par jour`;
  } else {
    icon = '💡'; color = 'border-white/20 bg-white/5 text-white/40';
    text = 'Renseignez les champs ci-dessous pour voir ce que l\'IA va générer';
  }
  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3 mb-6 ${color}`}>
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <span className="text-sm leading-relaxed">{text}</span>
    </div>
  );
}

// ─── Modal Auth ───────────────────────────────────────────────────────────────
function AuthModal({ initialMode, onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const resetFields = () => { setEmail(''); setPassword(''); setError(''); setSuccess(''); };
  const switchMode = (m) => { setMode(m); resetFields(); };

  const handleSubmit = async () => {
    setLoading(true); setError(''); setSuccess('');
    try {
      if (mode === 'forgot') {
        const res = await fetch(`${API}/forgot-password`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur');
        setSuccess('📧 Email envoyé ! Vérifie ta boîte mail (et les spams).');
        setLoading(false); return;
      }
      if (mode === 'register') {
        const res = await fetch(`${API}/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur inscription');
      }
      const formData = new URLSearchParams();
      formData.append('username', email); formData.append('password', password);
      const res = await fetch(`${API}/login`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Identifiants incorrects');
      localStorage.setItem('tm_token', data.access_token);
      localStorage.setItem('tm_email', email);
      onSuccess(email, data.access_token);
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const titles = { login: '👋 Se connecter', register: '✨ Créer un compte', forgot: '🔑 Mot de passe oublié' };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/20 rounded-3xl p-8 w-full max-w-md shadow-2xl mx-4">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">{titles[mode]}</h2>
        <div className="space-y-4">
          <input type="email" placeholder="Email" className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={email} onChange={e => setEmail(e.target.value)} />
          {mode !== 'forgot' && (
            <input type="password" placeholder="Mot de passe" className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSubmit()} />
          )}
          {mode === 'login' && <button onClick={() => switchMode('forgot')} className="text-blue-400 hover:text-blue-300 text-sm text-right w-full">Mot de passe oublié ?</button>}
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {success && <p className="text-green-400 text-sm text-center">{success}</p>}
          {!success && (
            <button onClick={handleSubmit} disabled={loading} className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all">
              {loading ? '⏳ Chargement...' : mode === 'register' ? "S'inscrire" : mode === 'forgot' ? 'Envoyer le lien' : 'Se connecter'}
            </button>
          )}
          <div className="text-center text-sm text-white/40 space-y-1">
            {mode === 'login' && <p>Pas encore de compte ? <button onClick={() => switchMode('register')} className="text-blue-400 hover:text-blue-300">S'inscrire</button></p>}
            {mode === 'register' && <p>Déjà un compte ? <button onClick={() => switchMode('login')} className="text-blue-400 hover:text-blue-300">Se connecter</button></p>}
            {mode === 'forgot' && <p><button onClick={() => switchMode('login')} className="text-blue-400 hover:text-blue-300">← Retour à la connexion</button></p>}
          </div>
          <button onClick={onClose} className="w-full text-white/30 hover:text-white/60 text-sm py-1 transition-colors">Annuler</button>
        </div>
      </div>
    </div>
  );
}

// ─── Panneau Historique ───────────────────────────────────────────────────────
function HistoryPanel({ token, onClose, onReload }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API}/history`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json()).then(data => { setHistory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const formatDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const typeLabel = (type) => ({ itineraire: '🗺️ Itinéraire', suggestions: '🌍 Suggestions', variantes: '💼 Variantes' }[type] || type);
  const typeColor = (type) => ({ itineraire: 'bg-blue-500/20 text-blue-300 border-blue-400/30', suggestions: 'bg-green-500/20 text-green-300 border-green-400/30', variantes: 'bg-purple-500/20 text-purple-300 border-purple-400/30' }[type] || 'bg-white/10 text-white/60');

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border-l border-white/10 h-full w-full max-w-lg shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-white/10 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">📚 Mes voyages</h2>
            <p className="text-white/40 text-sm mt-0.5">{history.length} voyage{history.length > 1 ? 's' : ''} sauvegardé{history.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {loading && <div className="text-center text-white/40 py-12"><div className="text-4xl mb-3">⏳</div><p>Chargement...</p></div>}
          {!loading && history.length === 0 && (
            <div className="text-center text-white/40 py-12"><div className="text-4xl mb-3">✈️</div><p>Aucun voyage pour l'instant.</p></div>
          )}
          {!loading && history.map((entry) => {
            const p = entry.params; const r = entry.result;
            return (
              <div key={entry.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-colors">
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${typeColor(r.type)}`}>{typeLabel(r.type)}</span>
                  <span className="text-white/30 text-xs">{formatDate(entry.date)}</span>
                </div>
                <p className="text-white font-semibold text-lg">{r.destination || '🌍 Suggestions de destinations'}</p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-lg">📅 {p.date_debut} → {p.date_fin}</span>
                  <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-lg">👥 {p.nb_personnes} pers.</span>
                  <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-lg">🎭 {p.categorie}</span>
                  {p.budget && <span className="text-xs bg-white/10 text-white/60 px-2 py-1 rounded-lg">💶 {p.budget}€</span>}
                </div>
                <button onClick={() => { onReload(r); onClose(); }} className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">Revoir ce voyage →</button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Page principale ──────────────────────────────────────────────────────────
export default function Home() {
  const PREFERENCES = [
    { value: 'nature',      emoji: '🌿', label: 'Nature' },
    { value: 'gastronomie', emoji: '🍽️', label: 'Gastronomie' },
    { value: 'culture',     emoji: '🏛️', label: 'Culture & Histoire' },
    { value: 'shopping',    emoji: '🛍️', label: 'Shopping' },
    { value: 'nightlife',   emoji: '🎉', label: 'Vie nocturne' },
    { value: 'aventure',    emoji: '🏄', label: 'Aventure & Sport' },
    { value: 'detente',     emoji: '🧘', label: 'Détente & Bien-être' },
    { value: 'photo',       emoji: '📸', label: 'Photographie' },
  ];

  const [form, setForm] = useState({
    destination: '', ville_depart: '', date_debut: '', date_fin: '',
    budget: '', nb_personnes: 1, categorie: 'couple', niveau_budget: 'moyen', preferences: [],
  });

  const togglePref = (value) => setForm(f => ({
    ...f, preferences: f.preferences.includes(value) ? f.preferences.filter(p => p !== value) : [...f.preferences, value],
  }));

  const [result, setResult] = useState(null);
  const [lastSuggestions, setLastSuggestions] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [authModal, setAuthModal] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const savedToken = localStorage.getItem('tm_token');
    const savedEmail = localStorage.getItem('tm_email');
    if (savedToken && savedEmail) { setToken(savedToken); setUser(savedEmail); }
  }, []);

  const handleAuthSuccess = (email, tok) => { setUser(email); setToken(tok); setAuthModal(null); };
  const handleLogout = () => { localStorage.removeItem('tm_token'); localStorage.removeItem('tm_email'); setUser(null); setToken(null); };

  const callAPI = async (overrides = {}) => {
    setLoading(true); setResult(null); setError('');
    try {
      const body = { ...form, ...overrides, nb_personnes: parseInt(form.nb_personnes), budget: form.budget ? parseFloat(form.budget) : null, destination: (overrides.destination ?? form.destination) || null };
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API}/itineraire`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      setResult(data);
      if (data.type === 'suggestions') setLastSuggestions(data);
    } catch (e) { setError('Erreur : impossible de contacter le serveur.'); }
    setLoading(false);
  };

  const handleSubmit = () => callAPI();
  const handleSelectDestination = (destination) => { setForm(f => ({ ...f, destination })); callAPI({ destination }); };

  // ─── Bouton CTA dynamique selon l'état du formulaire ──────────────────────
  const getCtaLabel = () => {
    if (loading) return null;
    if (!form.destination && !form.budget) return '🌍 Suggérer des destinations';
    if (form.destination && !form.budget) return '💼 Voir 3 variantes de budget';
    return '🗺️ Générer mon itinéraire complet';
  };

  const canSubmit = form.date_debut && form.date_fin;

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">

      {authModal && <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} onSuccess={handleAuthSuccess} />}
      {showHistory && token && <HistoryPanel token={token} onClose={() => setShowHistory(false)} onReload={(r) => setResult(r)} />}

      {/* Header */}
      <div className="flex justify-end items-center px-6 pt-5 gap-3">
        {user ? (
          <>
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/20 transition-all">📚 Mes voyages</button>
            <div className="flex items-center gap-2 bg-white/10 text-white text-sm px-4 py-2 rounded-xl border border-white/20">
              <span className="text-blue-300">👤</span><span className="max-w-[120px] truncate">{user}</span>
            </div>
            <button onClick={handleLogout} className="text-white/40 hover:text-white/80 text-sm px-3 py-2 rounded-xl transition-colors">Déconnexion</button>
          </>
        ) : (
          <>
            <button onClick={() => setAuthModal('login')} className="bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/20 transition-all">Se connecter</button>
            <button onClick={() => setAuthModal('register')} className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-all">S'inscrire</button>
          </>
        )}
      </div>

      {/* Hero */}
      <div className="text-center py-10 px-4">
        <div className="text-6xl mb-4">✈️</div>
        <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">Travel<span className="text-blue-400">Mate</span> Bot</h1>
        <p className="text-blue-200 text-lg">Votre assistant voyage personnel</p>
        {user
          ? <p className="text-white/30 text-sm mt-2">✅ Vos voyages sont sauvegardés automatiquement</p>
          : <p className="text-white/30 text-sm mt-2">💡 <button onClick={() => setAuthModal('register')} className="underline hover:text-white/60 transition-colors">Créez un compte</button> pour sauvegarder vos voyages</p>
        }
      </div>

      {/* Formulaire */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl mb-8">

          {/* ── SECTION 1 : Quand ? ── */}
          <div className="mb-7">
            <SectionTitle step="1" label="Quand partez-vous ?" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                  Date de départ <BadgeRequired />
                </label>
                <input type="date"
                  className={`w-full bg-white/10 border rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all ${!form.date_debut ? 'border-red-400/50' : 'border-white/20'}`}
                  value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} />
              </div>
              <div>
                <label className="flex items-center text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                  Date de retour <BadgeRequired />
                </label>
                <input type="date"
                  className={`w-full bg-white/10 border rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all ${!form.date_fin ? 'border-red-400/50' : 'border-white/20'}`}
                  value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mb-7" />

          {/* ── SECTION 2 : Où ? ── */}
          <div className="mb-7">
            <SectionTitle step="2" label="Où voulez-vous aller ?" sub="Laissez vide si vous voulez qu'on vous suggère une destination" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                  Destination
                  <BadgeOptional hint="Laissez vide → nous vous suggérons le TOP 3 des destinations" />
                  <InfoBubble text="Vide = suggestions de destinations. Rempli sans budget = 3 variantes. Rempli avec budget = itinéraire complet." />
                </label>
                <input type="text" placeholder="Ex: Rome, Tokyo, Lisbonne..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />
              </div>
              <div>
                <label className="flex items-center text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                  Ville de départ
                  <BadgeOptional hint="Pour estimer le prix du vol aller-retour" />
                </label>
                <input type="text" placeholder="Ex: Paris, Lyon, Alger..."
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.ville_depart} onChange={e => setForm({ ...form, ville_depart: e.target.value })} />
                <p className="text-white/30 text-xs mt-1.5 pl-1">✈️ Permet d'estimer le vol aller-retour</p>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mb-7" />

          {/* ── SECTION 3 : Qui ? ── */}
          <div className="mb-7">
            <SectionTitle step="3" label="Qui voyage ?" />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="flex items-center text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                  Nombre de personnes <BadgeRequired />
                </label>
                <input type="number" min="1"
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.nb_personnes} onChange={e => setForm({ ...form, nb_personnes: e.target.value })} />
              </div>
              <div>
                <label className="flex items-center text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                  Catégorie de voyageur <BadgeRequired />
                </label>
                <select className="w-full bg-slate-800 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })}>
                  <option value="couple">👫 Couple</option>
                  <option value="famille">👨‍👩‍👧‍👦 Famille</option>
                  <option value="retraités">👴 Retraités</option>
                  <option value="backpacker">🎒 Backpacker</option>
                  <option value="groupe d'amis">🎉 Groupe d'amis</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 mb-7" />

          {/* ── SECTION 4 : Budget ── */}
          <div className="mb-7">
            <SectionTitle step="4" label="Quel budget ?" sub="Laissez vide pour obtenir 3 variantes automatiques" />

            <div className="mb-4">
              <label className="flex items-center text-xs font-semibold text-white/70 uppercase tracking-wide mb-2">
                Budget total en €
                <BadgeOptional hint="Laissez vide → 3 variantes générées automatiquement" />
              </label>
              <div className="relative">
                <input type="number" placeholder="Ex: 1200"
                  className="w-full bg-white/10 border border-white/20 rounded-xl p-4 pr-12 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 font-bold">€</span>
              </div>
              {!form.budget ? (
                <p className="text-amber-300/70 text-xs mt-2 pl-1">
                  💡 Sans budget → nous générons automatiquement <strong>3 variantes</strong> (Économique / Confort / Premium) pour comparer
                </p>
              ) : (
                <p className="text-green-300/70 text-xs mt-2 pl-1">
                  ✅ Votre itinéraire sera calé calé sur <strong>{form.budget}€</strong> au total
                </p>
              )}
            </div>

            {/* Niveau de confort — visible uniquement si budget renseigné */}
            {form.budget && (
              <div className="mt-4 pt-4 border-t border-white/10">
                <label className="flex items-center text-xs font-semibold text-white/70 uppercase tracking-wide mb-3">
                  Niveau de confort pour cet itinéraire
                  <BadgeRequired />
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'réduit',  label: 'Économique', emoji: '💰', desc: 'Auberges, transports en commun, restos locaux' },
                    { value: 'moyen',   label: 'Confort',    emoji: '🏨', desc: 'Hôtels 3★, taxis occasionnels, restaurants mid-range' },
                    { value: 'premium', label: 'Premium',    emoji: '✨', desc: 'Hôtels 4-5★, taxis/vols, restaurants gastronomiques' },
                  ].map(opt => (
                    <button key={opt.value} type="button" onClick={() => setForm({ ...form, niveau_budget: opt.value })}
                      className={`rounded-xl p-4 border-2 text-left transition-all ${form.niveau_budget === opt.value ? 'border-blue-400 bg-blue-500/30 shadow-lg scale-[1.03]' : 'border-white/20 bg-white/5 hover:border-white/40 hover:bg-white/10'}`}>
                      <div className="text-2xl mb-1">{opt.emoji}</div>
                      <div className="text-white font-bold text-sm">{opt.label}</div>
                      <div className="text-white/40 text-xs mt-1 leading-tight">{opt.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-white/10 mb-7" />

          {/* ── SECTION 5 : Centres d'intérêt ── */}
          <div className="mb-7">
            <SectionTitle step="5" label="Vos centres d'intérêt" sub="Facultatif — votre programme sera adapté à vos goûts" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PREFERENCES.map(pref => {
                const checked = form.preferences.includes(pref.value);
                return (
                  <button key={pref.value} type="button" onClick={() => togglePref(pref.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${checked ? 'border-blue-400 bg-blue-500/30 text-white shadow-md scale-[1.03]' : 'border-white/20 bg-white/5 text-white/60 hover:border-white/40 hover:text-white hover:bg-white/10'}`}>
                    <span>{pref.emoji}</span><span>{pref.label}</span>
                    {checked && <span className="ml-auto text-blue-300 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── CTA ── */}
          {!canSubmit && (
            <p className="text-center text-red-300/80 text-sm mb-3">⚠️ Renseignez les dates de départ et de retour pour continuer</p>
          )}
          <button onClick={handleSubmit} disabled={loading || !canSubmit}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-bold py-5 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg text-lg">
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Préparation de votre voyage...
              </span>
            ) : getCtaLabel()}
          </button>
        </div>

        {error && <div className="bg-red-500/20 border border-red-400 text-red-200 rounded-xl p-4 mb-6">{error}</div>}

        {/* ── Résultats itinéraire ── */}
        {result?.type === 'itineraire' && (
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-2">📍 {result.destination}</h2>
            <p className="text-blue-300 text-center mb-4">
              {result.categorie} • {result.nb_personnes} personne(s) • {result.budget_total}€
              {result.niveau_budget && <span className="ml-2 inline-block bg-blue-500/30 border border-blue-400 text-blue-200 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">{result.niveau_budget}</span>}
            </p>
            <VolBlock vol={result.vol_estime} villeDepart={form.ville_depart} destination={result.destination} dateDebut={form.date_debut} dateFin={form.date_fin} nbPersonnes={result.nb_personnes} />
            {result.hebergement && (
              <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 mb-6 flex items-center gap-3">
                <span className="text-2xl">🏨</span>
                <div><div className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-0.5">Hébergement recommandé</div><div className="text-white font-medium text-sm">{result.hebergement}</div></div>
              </div>
            )}
            {result.jours.map((jour, i) => (
              <div key={i} className="mb-5 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center gap-3">
                  <span className="bg-white/20 text-white font-bold text-lg w-10 h-10 rounded-full flex items-center justify-center">{jour.numero}</span>
                  <div><div className="text-white font-bold text-lg">{jour.titre}</div><div className="text-blue-200 text-sm">{jour.date}</div></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  {[
                    { label: '🌅 Matin', color: 'text-orange-500', text: jour.matin, moment: 'matin' },
                    { label: '☀️ Après-midi', color: 'text-blue-500', text: jour.apresmidi, moment: 'apresmidi' },
                    { label: '🌙 Soir', color: 'text-purple-500', text: jour.soir, moment: 'soir' },
                  ].map(slot => (
                    <div key={slot.moment} className="p-5">
                      <div className={`${slot.color} font-bold text-sm mb-2`}>{slot.label}</div>
                      <p className="text-gray-600 text-sm leading-relaxed mb-3">{slot.text}</p>
                      {jour.lieux && (
                        <div className="flex flex-wrap gap-1.5">
                          {jour.lieux.filter(l => l.moment === slot.moment).map((l, k) => <LieuChip key={k} lieu={l} destination={result.destination} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            {result.budget_detail && (
              <div className="bg-white rounded-2xl shadow-xl p-6 mb-5">
                <h3 className="text-xl font-bold text-green-700 mb-4">💰 Budget détaillé</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(result.budget_detail).map(([key, val]) => (
                    <div key={key} className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                      <div className="text-xs text-gray-500 capitalize mb-1">{key}</div>
                      <div className="font-bold text-green-700">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {result.conseils && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-amber-600 mb-4">💡 Conseils pratiques</h3>
                <ul className="space-y-2">
                  {result.conseils.map((c, i) => (
                    <li key={i} className="flex gap-3 text-gray-700 text-sm"><span className="text-amber-500 font-bold mt-0.5">→</span><span>{c}</span></li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Résultats suggestions ── */}
        {result?.type === 'suggestions' && (
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-2">🌍 Nos suggestions pour vous</h2>
            {result.niveau_budget && (
              <p className="text-center mb-8">
                <span className="inline-block bg-blue-500/30 border border-blue-400 text-blue-200 text-sm font-semibold px-3 py-1 rounded-full capitalize">Budget {result.niveau_budget}</span>
              </p>
            )}
            <div className="grid grid-cols-1 gap-5">
              {result.suggestions.map((s, i) => (
                <div key={i} onClick={() => handleSelectDestination(s.destination)}
                  className="bg-white rounded-2xl shadow-xl p-6 flex gap-5 items-start cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all border-2 border-transparent hover:border-blue-400 group">
                  <div className="text-5xl">{s.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800">{s.destination} <span className="text-gray-400 font-normal text-base">— {s.pays}</span></h3>
                      <span className="text-blue-500 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Voir l'itinéraire →</span>
                    </div>
                    <ul className="mt-2 space-y-1">{s.atouts.map((a, j) => <li key={j} className="text-gray-600 text-sm flex gap-2"><span className="text-blue-400">✓</span> {a}</li>)}</ul>
                    <div className="mt-3 inline-block bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">💶 {s.budget_estime}</div>
                    {s.vol_estime && (
                      <div className="mt-3 flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                        <div>
                          <div className="text-sky-700 font-bold text-sm">✈️ Vol estimé depuis {form.ville_depart}</div>
                          <div className="text-sky-600 text-xs mt-0.5">{s.vol_estime.fourchette} · {s.vol_estime.type_vol}{s.vol_estime.duree_estimee && ` · ${s.vol_estime.duree_estimee}`}</div>
                        </div>
                        <a href={`https://www.google.com/travel/flights/search?q=vol+${encodeURIComponent(form.ville_depart)}+${encodeURIComponent(s.destination)}`}
                          target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                          className="ml-3 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all whitespace-nowrap">Voir les vols →</a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Résultats variantes ── */}
        {result?.type === 'variantes' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-3xl font-bold text-white">💼 3 variantes pour {result.destination}</h2>
              {lastSuggestions && (
                <button onClick={() => { setForm(f => ({ ...f, destination: '', budget: '' })); setResult(lastSuggestions); }}
                  className="text-blue-300 hover:text-white text-sm font-semibold border border-blue-400/40 hover:border-white/60 px-4 py-2 rounded-xl transition-all">← Retour aux suggestions</button>
              )}
            </div>
            <VolBlock vol={result.vol_estime} villeDepart={form.ville_depart} destination={result.destination} dateDebut={form.date_debut} dateFin={form.date_fin} nbPersonnes={parseInt(form.nb_personnes)} />
            {result.variantes.map((v, i) => (
              <div key={i} className="mb-6 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className={`px-6 py-4 flex items-center gap-3 ${i === 0 ? 'bg-green-600' : i === 1 ? 'bg-blue-600' : 'bg-purple-600'}`}>
                  <span className="text-2xl">{v.emoji}</span>
                  <div><div className="text-white font-bold text-lg">Budget {v.niveau}</div><div className="text-white/70 text-sm">{v.budget_total} • {v.description}</div></div>
                </div>
                {v.jours.map((jour, j) => (
                  <div key={j} className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-b border-gray-100">
                    {[
                      { label: `🌅 Jour ${jour.numero} — Matin`, color: 'text-orange-500', text: jour.matin, moment: 'matin' },
                      { label: '☀️ Après-midi', color: 'text-blue-500', text: jour.apresmidi, moment: 'apresmidi' },
                      { label: '🌙 Soir', color: 'text-purple-500', text: jour.soir, moment: 'soir' },
                    ].map(slot => (
                      <div key={slot.moment} className="p-4">
                        <div className={`${slot.color} font-bold text-xs mb-1`}>{slot.label}</div>
                        <p className="text-gray-600 text-sm mb-2">{slot.text}</p>
                        {jour.lieux && (
                          <div className="flex flex-wrap gap-1.5">
                            {jour.lieux.filter(l => l.moment === slot.moment).map((l, k) => <LieuChip key={k} lieu={l} destination={result.destination} />)}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}