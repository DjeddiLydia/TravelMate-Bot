'use client';
import { useState } from 'react';

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
    const d1 = dateDebut || '';
    const d2 = dateFin || '';
    return `https://www.google.com/travel/flights?q=vols+de+${from}+vers+${to}+le+${d1}+retour+${d2}`;
  };

  return (
    <div className="bg-sky-500/10 border border-sky-400/30 rounded-2xl p-5 mb-5 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className="flex items-center gap-3 flex-1">
        <span className="text-3xl">✈️</span>
        <div>
          <div className="text-white font-bold text-sm mb-0.5">
            Vol estimé — {villeDepart} → {destination}
          </div>
          <div className="text-sky-200 text-sm">
            <span className="font-semibold">{vol.fourchette}</span>
            <span className="text-white/40 mx-2">·</span>
            {vol.type_vol}
            {vol.duree_estimee && <><span className="text-white/40 mx-2">·</span>{vol.duree_estimee}</>}
          </div>
          {vol.total_personnes && nbPersonnes > 1 && (
            <div className="text-sky-300 text-xs mt-1">Total {nbPersonnes} passagers : <span className="font-semibold">{vol.total_personnes}</span></div>
          )}
          <div className="text-white/30 text-xs mt-1">Estimation approximative — vérifiez les prix réels</div>
        </div>
      </div>
      <a
        href={buildGoogleFlightsUrl()}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm px-4 py-3 rounded-xl transition-all whitespace-nowrap"
      >
        <span>🔍</span> Voir les vols
      </a>
    </div>
  );
}

function LieuChip({ lieu, destination }) {
  const cfg = TYPE_CONFIG[lieu.type] || TYPE_CONFIG['autre'];
  const query = encodeURIComponent(`${lieu.nom} ${destination || ''}`);
  const url = `https://www.google.com/maps/search/${query}`;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${cfg.color}`}
      title={lieu.prix ? `${lieu.prix}` : ''}
    >
      <span>{cfg.emoji}</span>
      <span>{lieu.nom}</span>
      {lieu.prix && <span className="opacity-60">· {lieu.prix}</span>}
      <span className="opacity-40 text-[10px]">↗</span>
    </a>
  );
}

export default function Home() {
  const PREFERENCES = [
    { value: 'nature',       emoji: '🌿', label: 'Nature' },
    { value: 'gastronomie',  emoji: '🍽️', label: 'Gastronomie' },
    { value: 'culture',      emoji: '🏛️', label: 'Culture & Histoire' },
    { value: 'shopping',     emoji: '🛍️', label: 'Shopping' },
    { value: 'nightlife',    emoji: '🎉', label: 'Vie nocturne' },
    { value: 'aventure',     emoji: '🏄', label: 'Aventure & Sport' },
    { value: 'detente',      emoji: '🧘', label: 'Détente & Bien-être' },
    { value: 'photo',        emoji: '📸', label: 'Photographie' },
  ];

  const [form, setForm] = useState({
    destination: '',
    ville_depart: '',
    date_debut: '',
    date_fin: '',
    budget: '',
    nb_personnes: 1,
    categorie: 'couple',
    niveau_budget: 'moyen',
    preferences: [],
  });

  const togglePref = (value) => {
    setForm(f => ({
      ...f,
      preferences: f.preferences.includes(value)
        ? f.preferences.filter(p => p !== value)
        : [...f.preferences, value],
    }));
  };
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const callAPI = async (overrides = {}) => {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const body = {
        ...form,
        nb_personnes: parseInt(form.nb_personnes),
        budget: form.budget ? parseFloat(form.budget) : null,
        destination: form.destination || null,
        ville_depart: form.ville_depart || null,
        niveau_budget: form.niveau_budget,
        preferences: form.preferences,
        ...overrides,
      };
      const res = await fetch('http://127.0.0.1:8000/itineraire', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setError("Erreur : impossible de contacter le serveur.");
    }
    setLoading(false);
  };

  const handleSubmit = () => callAPI();

  const handleSelectDestination = (destination) => {
    setForm(f => ({ ...f, destination }));
    callAPI({ destination });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900">

      {/* Header */}
      <div className="text-center py-12 px-4">
        <div className="text-6xl mb-4">✈️</div>
        <h1 className="text-5xl font-extrabold text-white mb-3 tracking-tight">
          Travel<span className="text-blue-400">Mate</span> Bot
        </h1>
        <p className="text-blue-200 text-lg">Votre assistant voyage personnalisé par IA</p>
      </div>

      <div className="max-w-3xl mx-auto px-4 pb-16">

        {/* Formulaire */}
        <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl mb-8">

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">
                🌍 Destination <span className="text-white/40 font-normal">(vide = suggestions)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Rome, Paris, Tokyo..."
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.destination}
                onChange={e => setForm({...form, destination: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">
                🛫 Ville de départ <span className="text-white/40 font-normal">(pour estimer le vol)</span>
              </label>
              <input
                type="text"
                placeholder="Ex: Alger, Paris, Lyon..."
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.ville_depart}
                onChange={e => setForm({...form, ville_depart: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">📅 Date de départ</label>
              <input type="date"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.date_debut}
                onChange={e => setForm({...form, date_debut: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">📅 Date de retour</label>
              <input type="date"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.date_fin}
                onChange={e => setForm({...form, date_fin: e.target.value})}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-5">
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">
                💶 Budget (€) <span className="text-white/40 font-normal">(vide = 3 variantes)</span>
              </label>
              <input type="number" placeholder="Ex: 1000"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.budget}
                onChange={e => setForm({...form, budget: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-blue-200 mb-2">👥 Nombre de personnes</label>
              <input type="number" min="1"
                className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
                value={form.nb_personnes}
                onChange={e => setForm({...form, nb_personnes: e.target.value})}
              />
            </div>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-blue-200 mb-2">🎭 Catégorie de voyageur</label>
            <select
              className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.categorie}
              onChange={e => setForm({...form, categorie: e.target.value})}
            >
              <option value="couple" className="text-black">👫 Couple</option>
              <option value="famille" className="text-black">👨‍👩‍👧‍👦 Famille</option>
              <option value="retraités" className="text-black">👴 Retraités</option>
              <option value="backpacker" className="text-black">🎒 Backpacker</option>
              <option value="groupe d'amis" className="text-black">🎉 Groupe d'amis</option>
            </select>
          </div>

          <div className="mb-5">
            <label className="block text-sm font-semibold text-blue-200 mb-3">
              🎯 Vos centres d'intérêt <span className="text-white/40 font-normal">(plusieurs choix possibles)</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PREFERENCES.map(pref => {
                const checked = form.preferences.includes(pref.value);
                return (
                  <button
                    key={pref.value}
                    type="button"
                    onClick={() => togglePref(pref.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all ${
                      checked
                        ? 'border-blue-400 bg-blue-500/30 text-white shadow-md scale-[1.03]'
                        : 'border-white/20 bg-white/10 text-white/70 hover:border-white/40 hover:text-white'
                    }`}
                  >
                    <span>{pref.emoji}</span>
                    <span>{pref.label}</span>
                    {checked && <span className="ml-auto text-blue-300 text-xs">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mb-7">
            <label className="block text-sm font-semibold text-blue-200 mb-3">💸 Niveau de budget</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'réduit', label: 'Réduit', emoji: '💰', desc: 'Auberges, transports en commun, restos locaux' },
                { value: 'moyen', label: 'Moyen', emoji: '🏨', desc: 'Hôtels 3★, confort standard, restaurants mid-range' },
                { value: 'premium', label: 'Premium', emoji: '✨', desc: 'Hôtels 5★, vols, restaurants gastronomiques' },
              ].map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm({...form, niveau_budget: opt.value})}
                  className={`rounded-xl p-4 border-2 text-left transition-all ${
                    form.niveau_budget === opt.value
                      ? 'border-blue-400 bg-blue-500/30 shadow-lg scale-[1.03]'
                      : 'border-white/20 bg-white/10 hover:border-white/40'
                  }`}
                >
                  <div className="text-2xl mb-1">{opt.emoji}</div>
                  <div className="text-white font-bold text-sm">{opt.label}</div>
                  <div className="text-white/50 text-xs mt-1 leading-tight">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading || !form.date_debut || !form.date_fin}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-500 disabled:to-gray-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-[1.02] shadow-lg text-lg"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-3">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                </svg>
                L'IA prépare votre voyage...
              </span>
            ) : '🗺️ Générer mon itinéraire'}
          </button>
        </div>

        {error && <div className="bg-red-500/20 border border-red-400 text-red-200 rounded-xl p-4 mb-6">{error}</div>}

        {/* Résultat : Itinéraire classique */}
        {result?.type === 'itineraire' && (
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-2">📍 {result.destination}</h2>
            <p className="text-blue-300 text-center mb-4">
              {result.categorie} • {result.nb_personnes} personne(s) • {result.budget_total}€
              {result.niveau_budget && <span className="ml-2 inline-block bg-blue-500/30 border border-blue-400 text-blue-200 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">{result.niveau_budget}</span>}
            </p>

            <VolBlock
              vol={result.vol_estime}
              villeDepart={result.ville_depart}
              destination={result.destination}
              dateDebut={result.date_debut}
              dateFin={result.date_fin}
              nbPersonnes={result.nb_personnes}
            />

            {result.hebergement && (
              <div className="bg-white/10 border border-white/20 rounded-2xl px-6 py-4 mb-6 flex items-center gap-3">
                <span className="text-2xl">🏨</span>
                <div>
                  <div className="text-white/60 text-xs font-semibold uppercase tracking-wide mb-0.5">Hébergement recommandé</div>
                  <div className="text-white font-medium text-sm">{result.hebergement}</div>
                </div>
              </div>
            )}

            {result.jours.map((jour, i) => (
              <div key={i} className="mb-5 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-4 flex items-center gap-3">
                  <span className="bg-white/20 text-white font-bold text-lg w-10 h-10 rounded-full flex items-center justify-center">{jour.numero}</span>
                  <div>
                    <div className="text-white font-bold text-lg">{jour.titre}</div>
                    <div className="text-blue-200 text-sm">{jour.date}</div>
                  </div>
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
                          {jour.lieux
                            .filter(l => l.moment === slot.moment)
                            .map((l, k) => <LieuChip key={k} lieu={l} destination={result.destination} />)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}

            {/* Budget */}
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

            {/* Conseils */}
            {result.conseils && (
              <div className="bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-xl font-bold text-amber-600 mb-4">💡 Conseils pratiques</h3>
                <ul className="space-y-2">
                  {result.conseils.map((c, i) => (
                    <li key={i} className="flex gap-3 text-gray-700 text-sm">
                      <span className="text-amber-500 font-bold mt-0.5">→</span>
                      <span>{c}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Résultat : Suggestions de destinations */}
        {result?.type === 'suggestions' && (
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-2">🌍 Nos suggestions pour vous</h2>
            {result.niveau_budget && (
              <p className="text-center mb-8">
                <span className="inline-block bg-blue-500/30 border border-blue-400 text-blue-200 text-sm font-semibold px-3 py-1 rounded-full capitalize">
                  Budget {result.niveau_budget}
                </span>
              </p>
            )}
            <div className="grid grid-cols-1 gap-5">
              {result.suggestions.map((s, i) => (
                <div
                  key={i}
                  onClick={() => handleSelectDestination(s.destination)}
                  className="bg-white rounded-2xl shadow-xl p-6 flex gap-5 items-start cursor-pointer hover:shadow-2xl hover:scale-[1.02] transition-all border-2 border-transparent hover:border-blue-400 group"
                >
                  <div className="text-5xl">{s.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-gray-800">{s.destination} <span className="text-gray-400 font-normal text-base">— {s.pays}</span></h3>
                      <span className="text-blue-500 text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Voir l'itinéraire →</span>
                    </div>
                    <ul className="mt-2 space-y-1">
                      {s.atouts.map((a, j) => (
                        <li key={j} className="text-gray-600 text-sm flex gap-2">
                          <span className="text-blue-400">✓</span> {a}
                        </li>
                      ))}
                    </ul>
                    {s.lieux_incontournables && s.lieux_incontournables.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1">
                        {s.lieux_incontournables.map((lieu, k) => (
                          <span key={k} className="bg-blue-50 text-blue-700 text-xs font-medium px-2 py-1 rounded-lg border border-blue-200">
                            📍 {lieu}
                          </span>
                        ))}
                      </div>
                    )}
                    {s.restaurant_recommande && (
                      <div className="mt-2 flex items-start gap-2 text-xs text-gray-600 bg-orange-50 border border-orange-200 rounded-lg px-3 py-2">
                        <span>🍽️</span>
                        <span>{s.restaurant_recommande}</span>
                      </div>
                    )}
                    <div className="mt-3 inline-block bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                      💶 {s.budget_estime}
                    </div>
                    {s.pourquoi_ce_niveau && (
                      <p className="mt-2 text-xs text-gray-500 italic">{s.pourquoi_ce_niveau}</p>
                    )}
                    {s.vol_estime && (
                      <div className="mt-3 flex items-center justify-between bg-sky-50 border border-sky-200 rounded-xl px-4 py-3">
                        <div>
                          <div className="text-sky-700 font-bold text-sm">✈️ Vol estimé depuis {form.ville_depart}</div>
                          <div className="text-sky-600 text-xs mt-0.5">
                            {s.vol_estime.fourchette} · {s.vol_estime.type_vol}
                            {s.vol_estime.duree_estimee && ` · ${s.vol_estime.duree_estimee}`}
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/travel/flights?q=vols+de+${encodeURIComponent(form.ville_depart)}+vers+${encodeURIComponent(s.destination)}+le+${form.date_debut}+retour+${form.date_fin}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={e => e.stopPropagation()}
                          className="ml-3 bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold px-3 py-2 rounded-lg transition-all whitespace-nowrap"
                        >
                          Voir les vols →
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Résultat : Variantes de budget */}
        {result?.type === 'variantes' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-3xl font-bold text-white">💼 3 variantes pour {result.destination}</h2>
              <button
                onClick={() => { setForm(f => ({ ...f, destination: '' })); setResult(null); }}
                className="text-blue-300 hover:text-white text-sm font-semibold border border-blue-400/40 hover:border-white/60 px-4 py-2 rounded-xl transition-all"
              >
                ← Retour aux suggestions
              </button>
            </div>
            <VolBlock
              vol={result.vol_estime}
              villeDepart={form.ville_depart}
              destination={result.destination}
              dateDebut={form.date_debut}
              dateFin={form.date_fin}
              nbPersonnes={parseInt(form.nb_personnes)}
            />
            {result.variantes.map((v, i) => (
              <div key={i} className="mb-6 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className={`px-6 py-4 flex items-center gap-3 ${i === 0 ? 'bg-green-600' : i === 1 ? 'bg-blue-600' : 'bg-purple-600'}`}>
                  <span className="text-2xl">{v.emoji}</span>
                  <div>
                    <div className="text-white font-bold text-lg">Budget {v.niveau}</div>
                    <div className="text-white/70 text-sm">{v.budget_total} • {v.description}</div>
                  </div>
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
                            {jour.lieux
                              .filter(l => l.moment === slot.moment)
                              .map((l, k) => <LieuChip key={k} lieu={l} destination={result.destination} />)}
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