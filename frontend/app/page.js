'use client';
import { useState } from 'react';

export default function Home() {
  const [form, setForm] = useState({
    destination: '',
    date_debut: '',
    date_fin: '',
    budget: '',
    nb_personnes: 1,
    categorie: 'couple'
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async () => {
    setLoading(true);
    setResult(null);
    setError('');
    try {
      const body = {
        ...form,
        nb_personnes: parseInt(form.nb_personnes),
        budget: form.budget ? parseFloat(form.budget) : null,
        destination: form.destination || null,
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

          <div className="mb-5">
            <label className="block text-sm font-semibold text-blue-200 mb-2">
              🌍 Destination <span className="text-white/40 font-normal">(laisser vide pour des suggestions)</span>
            </label>
            <input
              type="text"
              placeholder="Ex: Rome, Paris, Tokyo..."
              className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
              value={form.destination}
              onChange={e => setForm({...form, destination: e.target.value})}
            />
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

          <div className="mb-7">
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
            <p className="text-blue-300 text-center mb-8">{result.categorie} • {result.nb_personnes} personne(s) • {result.budget_total}€</p>

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
                  <div className="p-5">
                    <div className="text-orange-500 font-bold text-sm mb-2">🌅 Matin</div>
                    <p className="text-gray-600 text-sm leading-relaxed">{jour.matin}</p>
                  </div>
                  <div className="p-5">
                    <div className="text-blue-500 font-bold text-sm mb-2">☀️ Après-midi</div>
                    <p className="text-gray-600 text-sm leading-relaxed">{jour.apresmidi}</p>
                  </div>
                  <div className="p-5">
                    <div className="text-purple-500 font-bold text-sm mb-2">🌙 Soir</div>
                    <p className="text-gray-600 text-sm leading-relaxed">{jour.soir}</p>
                  </div>
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
            <h2 className="text-3xl font-bold text-white text-center mb-8">🌍 Nos suggestions pour vous</h2>
            <div className="grid grid-cols-1 gap-5">
              {result.suggestions.map((s, i) => (
                <div key={i} className="bg-white rounded-2xl shadow-xl p-6 flex gap-5 items-start">
                  <div className="text-5xl">{s.emoji}</div>
                  <div className="flex-1">
                    <h3 className="text-xl font-bold text-gray-800">{s.destination} <span className="text-gray-400 font-normal text-base">— {s.pays}</span></h3>
                    <ul className="mt-2 space-y-1">
                      {s.atouts.map((a, j) => (
                        <li key={j} className="text-gray-600 text-sm flex gap-2">
                          <span className="text-blue-400">✓</span> {a}
                        </li>
                      ))}
                    </ul>
                    <div className="mt-3 inline-block bg-green-100 text-green-700 text-sm font-semibold px-3 py-1 rounded-full">
                      💶 {s.budget_estime}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Résultat : Variantes de budget */}
        {result?.type === 'variantes' && (
          <div>
            <h2 className="text-3xl font-bold text-white text-center mb-8">💼 3 variantes pour {result.destination}</h2>
            {result.variantes.map((v, i) => (
              <div key={i} className="mb-6 bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className={`px-6 py-4 flex items-center gap-3 ${i === 0 ? 'bg-green-600' : i === 1 ? 'bg-blue-600' : 'bg-purple-600'}`}>
                  <span className="text-2xl">{v.emoji}</span>
                  <div>
                    <div className="text-white font-bold text-lg">Budget {v.niveau}</div>
                    <div className="text-white/70 text-sm">{v.budget_total} • {v.description}</div>
                  </div>
                </div>
                {v.jours.slice(0, 2).map((jour, j) => (
                  <div key={j} className="grid grid-cols-1 md:grid-cols-3 gap-0 divide-y md:divide-y-0 md:divide-x divide-gray-100 border-b border-gray-100">
                    <div className="p-4">
                      <div className="text-orange-500 font-bold text-xs mb-1">🌅 Jour {jour.numero} — Matin</div>
                      <p className="text-gray-600 text-sm">{jour.matin}</p>
                    </div>
                    <div className="p-4">
                      <div className="text-blue-500 font-bold text-xs mb-1">☀️ Après-midi</div>
                      <p className="text-gray-600 text-sm">{jour.apresmidi}</p>
                    </div>
                    <div className="p-4">
                      <div className="text-purple-500 font-bold text-xs mb-1">🌙 Soir</div>
                      <p className="text-gray-600 text-sm">{jour.soir}</p>
                    </div>
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