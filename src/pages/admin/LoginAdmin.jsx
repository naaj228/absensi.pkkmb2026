import { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

export default function LoginAdmin() {
  const { login } = useContext(AppContext);
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const success = await login(nim, password, 'admin');
      setIsLoading(false);
      if (success) {
        navigate('/admin/dashboard');
      } else {
        alert('Email/Password Admin salah atau tidak terdaftar di Supabase!');
      }
    } catch (err) {
      setIsLoading(false);
      alert(err.message || 'Terjadi kesalahan login.');
    }
  };

  return (
    <div className="w-full min-h-screen bg-surface-container-lowest flex flex-col">
      <main className="flex-1 flex flex-col">
        <div className="flex flex-col lg:flex-row flex-1 min-h-screen">
          {/* Left Side: Brand Panel (Minimalist) */}
          <div className="hidden lg:flex lg:w-1/2 bg-[#101935] text-white p-12 flex-col justify-between relative overflow-hidden min-h-screen">
<div className="absolute -right-24 -top-24 w-96 h-96 bg-[#1D2B53] rounded-full blur-[100px] pointer-events-none"></div>
<div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[#0E1528] rounded-full blur-[100px] pointer-events-none"></div>
<div className="relative z-10 flex items-center gap-3">
<div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
<span className="material-symbols-outlined text-[24px]">qr_code_2</span>
</div>
<span className="font-display-lg text-headline-sm font-semibold tracking-wider">PKKMB ABSENSI</span>
</div>
<div className="relative z-10 space-y-4 max-w-md">
<span className="bg-primary/20 text-primary-fixed-dim px-3 py-1 rounded-full text-label-md font-semibold tracking-wider uppercase">Portal Administrator</span>
<h1 className="text-display-lg font-bold font-display-lg leading-tight">Monitor Kehadiran Maba</h1>
</div>
<div className="relative z-10 flex items-center justify-between text-label-md text-on-surface-variant/60 font-body-sm">
<span>v1.0.0</span>
<span>PKKMB Universitas</span>
</div>
</div>
          {/* Right Side: Form Panel */}
          <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-12 relative bg-surface-container-lowest min-h-screen">
            <div className="w-full max-w-md">
<div className="flex flex-col gap-2 mb-8 text-center lg:text-left">
<h2 className="text-headline-lg font-bold font-display-lg text-on-surface tracking-tight" id="login-title">Login Administrator</h2>
</div>
<form className="space-y-6" onSubmit={handleLoginSubmit}>
<div className="space-y-5">
{/* NIM Input */}
<div>
<label className="block text-label-md font-label-md text-on-surface mb-2" htmlFor="nim">Email / Username</label>
<div className="relative group">
<span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px]">person</span>
<input className="w-full pl-12 pr-4 py-4 bg-surface rounded-xl border border-outline-variant/50 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/30" id="nim" name="username" placeholder="Masukkan email atau username admin..." required type="text" value={nim} onChange={(e) => setNim(e.target.value)} />
</div>
</div>
{/* Password Input */}
<div>
<label className="block text-label-md font-label-md text-on-surface mb-2" htmlFor="password">Password</label>
<div className="relative group">
<span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-on-surface-variant group-focus-within:text-primary transition-colors text-[20px]">lock</span>
<input className="w-full pl-12 pr-12 py-4 bg-surface rounded-xl border border-outline-variant/50 text-body-md font-body-md text-on-surface focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-on-surface-variant/30" id="password" name="password" placeholder="••••••••" required type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} />
<button className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer" type="button" onClick={() => setShowPassword(!showPassword)}>
<span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
</button>
</div>
</div>
</div>
{/* Submit Button */}
<div>
<button disabled={isLoading} className="group relative w-full flex justify-center py-4 px-4 rounded-xl text-label-md font-label-md text-on-primary bg-primary hover:bg-primary-fixed focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary focus:ring-offset-surface-container transition-all shadow-[0_4px_14px_0_rgba(184,196,255,0.2)] hover:shadow-[0_6px_20px_rgba(184,196,255,0.3)] hover:-translate-y-0.5 overflow-hidden disabled:opacity-50" type="submit">
<div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
<span className="flex items-center gap-2 relative z-10">
<svg className={`animate-spin -ml-1 mr-2 h-5 w-5 text-on-primary ${isLoading ? 'block' : 'hidden'}`} fill="none" id="login-spinner" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
<circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
<path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
</svg>
<span className="" id="login-btn-text">{isLoading ? 'Menghubungkan...' : 'Masuk'}</span>
<span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
</span>
</button>
</div>
</form>
</div>
{/* Footer */}
<div className="absolute bottom-6 left-0 right-0 text-center px-6">
<p className="text-label-md text-on-surface-variant/60 font-body-sm">
© 2026 Universitas. Hak Cipta Dilindungi.
</p>
</div>
          </div>
        </div>
      </main>
      <style>{`
          @keyframes spin-slow {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
          }
          .animate-spin-slow {
              animation: spin-slow 20s linear infinite;
          }
          @keyframes shimmer {
              100% { transform: translateX(100%); }
          }
      `}</style>
    </div>
  );
}
