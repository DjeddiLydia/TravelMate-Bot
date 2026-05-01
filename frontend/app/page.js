'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

// ─── Modal Auth (login / register / forgot) ──────────────────────────────────
function AuthModal({ initialMode, onClose, onSuccess }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'register' | 'forgot'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const resetFields = () => { setEmail(''); setPassword(''); setError(''); setSuccess(''); };

  const switchMode = (m) => { setMode(m); resetFields(); };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      // ── Mot de passe oublié ──
      if (mode === 'forgot') {
        const res = await fetch(`${API}/forgot-password`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur');
        setSuccess('📧 Email envoyé ! Vérifie ta boîte mail (et les spams).');
        setLoading(false);
        return;
      }

      // ── Inscription ──
      if (mode === 'register') {
        const res = await fetch(`${API}/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || 'Erreur inscription');
      }

      // ── Connexion (après inscription ou directe) ──
      const formData = new URLSearchParams();
      formData.append('username', email);
      formData.append('password', password);
      const res = await fetch(`${API}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Identifiants incorrects');
      localStorage.setItem('tm_token', data.access_token);
      localStorage.setItem('tm_email', email);
      onSuccess(email, data.access_token);

    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  };

  const titles = {
    login: '👋 Se connecter',
    register: '✨ Créer un compte',
    forgot: '🔑 Mot de passe oublié',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-white/20 rounded-3xl p-8 w-full max-w-md shadow-2xl mx-4">
        <h2 className="text-2xl font-bold text-white mb-6 text-center">{titles[mode]}</h2>

        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={email}
            onChange={e => setEmail(e.target.value)}
          />

          {mode !== 'forgot' && (
            <input
              type="password"
              placeholder="Mot de passe"
              className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            />
          )}

          {mode === 'login' && (
            <button
              onClick={() => switchMode('forgot')}
              className="text-blue-400 hover:text-blue-300 text-sm text-right w-full transition-colors"
            >
              Mot de passe oublié ?
            </button>
          )}

          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          {success && <p className="text-green-400 text-sm text-center">{success}</p>}

          {!success && (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all"
            >
              {loading ? '⏳ Chargement...' : mode === 'register' ? "S'inscrire" : mode === 'forgot' ? 'Envoyer le lien' : 'Se connecter'}
            </button>
          )}

          {/* Liens de navigation entre modes */}
          <div className="text-center text-sm text-white/40 space-y-1">
            {mode === 'login' && (
              <p>Pas encore de compte ?{' '}
                <button onClick={() => switchMode('register')} className="text-blue-400 hover:text-blue-300 transition-colors">S'inscrire</button>
              </p>
            )}
            {mode === 'register' && (
              <p>Déjà un compte ?{' '}
                <button onClick={() => switchMode('login')} className="text-blue-400 hover:text-blue-300 transition-colors">Se connecter</button>
              </p>
            )}
            {mode === 'forgot' && (
              <p>
                <button onClick={() => switchMode('login')} className="text-blue-400 hover:text-blue-300 transition-colors">← Retour à la connexion</button>
              </p>
            )}
          </div>

          <button onClick={onClose} className="w-full text-white/30 hover:text-white/60 text-sm py-1 transition-colors">
            Annuler
          </button>
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
    fetch(`${API}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(data => { setHistory(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [token]);

  const formatDate = (iso) => new Date(iso).toLocaleDateString('fr-FR', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });

  const typeLabel = (type) => ({ itineraire: '🗺️ Itinéraire', suggestions: '🌍 Suggestions', variantes: '💼 Variantes' }[type] || type);
  const typeColor = (type) => ({
    itineraire: 'bg-blue-500/20 text-blue-300 border-blue-400/30',
    suggestions: 'bg-green-500/20 text-green-300 border-green-400/30',
    variantes: 'bg-purple-500/20 text-purple-300 border-purple-400/30',
  }[type] || 'bg-white/10 text-white/60');

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-slate-900 border-l border-white/10 h-full w-full max-w-lg shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-slate-900/95 backdrop-blur border-b border-white/10 px-6 py-5 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white">📚 Mes voyages</h2>
            <p className="text-white/40 text-sm mt-0.5">{history.length} voyage{history.length > 1 ? 's' : ''} sauvegardé{history.length > 1 ? 's' : ''}</p>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white text-2xl transition-colors">✕</button>
        </div>
        <div className="p-6 space-y-4">
          {loading && <div className="text-center text-white/40 py-12"><div className="text-4xl mb-3">⏳</div><p>Chargement...</p></div>}
          {!loading && history.length === 0 && (
            <div className="text-center text-white/40 py-12">
              <div className="text-4xl mb-3">✈️</div>
              <p>Aucun voyage pour l'instant.</p>
              <p className="text-sm mt-1">Génère un itinéraire pour le voir ici !</p>
            </div>
          )}
          {!loading && history.map((entry) => {
            const p = entry.params;
            const r = entry.result;
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
                <button onClick={() => { onReload(r); onClose(); }} className="mt-3 text-xs text-blue-400 hover:text-blue-300 font-semibold transition-colors">
                  Revoir ce voyage →
                </button>
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
  const [form, setForm] = useState({
    destination: '', date_debut: '', date_fin: '',
    budget: '', nb_personnes: 1, categorie: 'couple',
  });
  const [result, setResult] = useState(null);
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

  const handleLogout = () => {
    localStorage.removeItem('tm_token');
    localStorage.removeItem('tm_email');
    setUser(null); setToken(null);
  };

  const handleSubmit = async () => {
    setLoading(true); setResult(null); setError('');
    try {
      const body = {
        ...form,
        nb_personnes: parseInt(form.nb_personnes),
        budget: form.budget ? parseFloat(form.budget) : null,
        destination: form.destination || null,
      };
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`${API}/itineraire`, { method: 'POST', headers, body: JSON.stringify(body) });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError('Erreur : impossible de contacter le serveur.');
    }
    setLoading(false);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">

      {authModal && (
        <AuthModal initialMode={authModal} onClose={() => setAuthModal(null)} onSuccess={handleAuthSuccess} />
      )}
      {showHistory && token && (
        <HistoryPanel token={token} onClose={() => setShowHistory(false)} onReload={(r) => setResult(r)} />
      )}

      {/* Header */}
      <div className="flex justify-end items-center px-6 pt-5 gap-3">
        {user ? (
          <>
            <button onClick={() => setShowHistory(true)} className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold px-4 py-2 rounded-xl border border-white/20 transition-all">
              📚 Mes voyages
            </button>
            <div className="flex items-center gap-2 bg-white/10 text-white text-sm px-4 py-2 rounded-xl border border-white/20">
              <span className="text-blue-300">👤</span>
              <span className="max-w-[120px] truncate">{user}</span>
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
        <p className="text-blue-200 text-lg">Votre assistant voyage personnalisé par IA</p>
        {user
          ? <p className="text-white/30 text-sm mt-2">✅ Vos voyages sont sauvegardés automatiquement</p>
          : <p className="text-white/30 text-sm mt-2">💡 <button onClick={() => setAuthModal('register')} className="underline hover:text-white/60 transition-colors">Créez un compte</button> pour sauvegarder vos voyages</p>
        }
      </div>

      {/* Formulaire */}
      <div className="max-w-3xl mx-auto px-4 pb-16">
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl mb-8">

          <div className="mb-5">
            <label className="block text-sm font-semibold text-blue-200 mb-2">🌍 Destination <span className="text-white/40 font-normal">(laisser vide pour des suggestions)</span></label>
            <input type="text" placeholder="Ex: Rome, Paris, Tokyo..."
              className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.destination} onChange={e => setForm({ ...form, destination: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">📅 Date de départ</label>
              <input type="date" className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">📅 Date de retour</label>
              <input type="date" className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.date_fin} onChange={e => setForm({ ...form, date_fin: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">💶 Budget (€) <span className="text-white/40 font-normal">(vide = 3 variantes)</span></label>
              <input type="number" placeholder="Ex: 1000"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">👥 Nombre de personnes</label>
              <input type="number" min="1"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.nb_personnes} onChange={e => setForm({ ...form, nb_personnes: e.target.value })} />
            </div>
          </div>

          <div className="mb-7">
            <label className="block text-sm font-semibold text-blue-200 mb-2">🎭 Catégorie de voyageur</label>
            <select className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.categorie} onChange={e => setForm({ ...form, categorie: e.target.value })}>
              <option value="couple" className="text-black">👫 Couple</option>
              <option value="famille" className="text-black">👨‍👩‍👧‍👦 Famille</option>
              <option value="retraités" className="text-black">👴 Retraités</option>
              <option value="backpacker" className="text-black">🎒 Backpacker</option>
              <option value="groupe d'amis" className="text-black">🎉 Groupe d'amis</option>
            </select>
          </div>

          <button onClick={handleSubmit} disabled={loading || !form.date_debut || !form.date_fin}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg text-lg">
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                L'IA prépare votre voyage...
              </span>
            ) : '🗺️ Générer mon itinéraire'}
          </button>
        </div>

        {error && <div className="bg-red-500/20 border border-red-400 text-red-200 rounded-xl p-4 mb-6">{error}</div>}

        {result?.type === 'itineraire' && (
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-2">📍 {result.destination}</h2>
            <p className="text-blue-300 text-center mb-8">{result.categorie} • {result.nb_personnes} personne(s) • {result.budget_total}€</p>
            {result.jours.map((jour, i) => (
              <div key={i} className="mb-5 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center gap-3">
                  <span className="bg-white/20 text-white font-bold text-lg w-10 h-10 rounded-full flex items-center justify-center">{jour.numero}</span>
                  <div><div className="text-white font-bold text-lg">{jour.titre}</div><div className="text-blue-200 text-sm">{jour.date}</div></div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100">
                  <div className="p-5"><div className="text-orange-500 font-bold text-sm mb-2">🌅 Matin</div><p className="text-gray-600 text-sm leading-relaxed">{jour.matin}</p></div>
                  <div className="p-5"><div className="text-blue-500 font-bold text-sm mb-2">☀️ Après-midi</div><p className="text-gray-600 text-sm leading-relaxed">{jour.apresmidi}</p></div>
                  <div className="p-5"><div className="text-purple-500 font-bold text-sm mb-2">🌙 Soir</div><p className="text-gray-600 text-sm leading-relaxed">{jour.soir}</p></div>
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

        {result?.type === 'suggestions' && (
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-8">🌍 Nos suggestions pour vous</h2>
            <div className="grid grid-cols-1 gap-5">
              {result.suggestions.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-xl p-6 flex gap-5 items-start">
                  <div className="text-5xl">{s.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800">{s.destination} <span className="text-gray-400 font-normal text-base">— {s.pays}</span></h3>
                    <ul className="mt-2 space-y-1">{s.atouts.map((a, j) => <li key={j} className="text-gray-600 text-sm flex gap-2"><span className="text-blue-400">✓</span> {a}</li>)}</ul>
                    <div className="mt-3 inline-block bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">💶 {s.budget_estime}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result?.type === 'variantes' && (
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-8">💼 3 variantes pour {result.destination}</h2>
            {result.variantes.map((v, i) => (
              <div key={i} className="mb-6 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className={`px-6 py-4 flex items-center gap-3 ${i === 0 ? 'bg-green-600' : i === 1 ? 'bg-blue-600' : 'bg-purple-600'}`}>
                  <span className="text-2xl">{v.emoji}</span>
                  <div><div className="text-white font-bold text-lg">Budget {v.niveau}</div><div className="text-white/70 text-sm">{v.budget_total} • {v.description}</div></div>
                </div>
                {v.jours.slice(0, 2).map((jour, j) => (
                  <div key={j} className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-b border-gray-100">
                    <div className="p-4"><div className="text-orange-500 font-bold text-xs mb-1">🌅 Jour {jour.numero} — Matin</div><p className="text-gray-600 text-sm">{jour.matin}</p></div>
                    <div className="p-4"><div className="text-blue-500 font-bold text-xs mb-1">☀️ Après-midi</div><p className="text-gray-600 text-sm">{jour.apresmidi}</p></div>
                    <div className="p-4"><div className="text-purple-500 font-bold text-xs mb-1">🌙 Soir</div><p className="text-gray-600 text-sm">{jour.soir}</p></div>
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