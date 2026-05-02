'use client';
import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

function ResetForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get('token');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');

  const handleReset = async () => {
    if (password !== confirm) { setMessage('Les mots de passe ne correspondent pas.'); setStatus('error'); return; }
    if (password.length < 6) { setMessage('Minimum 6 caractères.'); setStatus('error'); return; }
    setStatus('loading');
    try {
      const res = await fetch(`${API}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setStatus('success');
      setTimeout(() => router.push('/'), 3000);
    } catch (e) {
      setMessage(e.message);
      setStatus('error');
    }
  };

  if (!token) return (
    <div className="text-white text-center">
      <div className="text-5xl mb-4">❌</div>
      <p>Lien invalide.</p>
    </div>
  );

  return (
    <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl w-full max-w-md">
      <div className="text-center mb-6">
        <div className="text-5xl mb-3">🔑</div>
        <h1 className="text-2xl font-bold text-white">Nouveau mot de passe</h1>
        <p className="text-white/40 text-sm mt-2">Choisissez un nouveau mot de passe pour votre compte TravelMate.</p>
      </div>
      {status === 'success' ? (
        <div className="text-center py-4">
          <div className="text-5xl mb-3">✅</div>
          <p className="text-green-300 font-semibold text-lg">Mot de passe mis à jour !</p>
          <p className="text-white/40 text-sm mt-2">Redirection vers l'accueil dans 3 secondes...</p>
        </div>
      ) : (
        <div className="space-y-4">
          <input
            type="password"
            placeholder="Nouveau mot de passe (min. 6 caractères)"
            className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
          <input
            type="password"
            placeholder="Confirmer le mot de passe"
            className="w-full bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-400"
            value={confirm}
            onChange={e => setConfirm(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleReset()}
          />
          {status === 'error' && <p className="text-red-400 text-sm text-center">{message}</p>}
          <button
            onClick={handleReset}
            disabled={status === 'loading'}
            className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 disabled:opacity-50 text-white font-bold py-4 rounded-xl transition-all"
          >
            {status === 'loading' ? '⏳ Mise à jour...' : 'Confirmer le nouveau mot de passe'}
          </button>
          <button onClick={() => router.push('/')} className="w-full text-white/30 hover:text-white/60 text-sm py-1 transition-colors">
            ← Retour à l'accueil
          </button>
        </div>
      )}
    </div>
  );
}

export default function ResetPage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-indigo-900 flex items-center justify-center px-4">
      <Suspense fallback={
        <div className="text-white text-center">
          <div className="text-4xl mb-3">⏳</div>
          <p>Chargement...</p>
        </div>
      }>
        <ResetForm />
      </Suspense>
    </main>
  );
}