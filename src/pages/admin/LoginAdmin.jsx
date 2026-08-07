import { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppContext } from '../../context/AppContext';

export default function LoginAdmin() {
  const { login, currentUser } = useContext(AppContext);
  const [nim, setNim] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser && currentUser.role === 'admin') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [currentUser, navigate]);

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
    <div className="w-full min-h-screen bg-[#ffffff] flex flex-col font-sans">
      <main className="flex-1 flex flex-col">
        <div className="flex flex-col lg:flex-row flex-1 min-h-screen">
          {/* Left Side: Brand Panel */}
          <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#012060] to-[#a50022] text-white p-16 flex-col justify-between relative overflow-hidden min-h-screen">
            {/* Interactive Animated Background Elements */}
            <div className="absolute -right-24 -top-24 w-96 h-96 bg-[#c5a86d]/15 rounded-full blur-[100px] pointer-events-none animate-float-1"></div>
            <div className="absolute -left-24 -bottom-24 w-96 h-96 bg-[#ffffff]/10 rounded-full blur-[100px] pointer-events-none animate-float-2"></div>
            
            <div className="relative z-10 flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#012060] to-[#c5a86d] flex items-center justify-center shadow-lg shadow-[#012060]/30 transform hover:scale-105 transition-transform duration-300">
                <span className="material-symbols-outlined text-[26px] text-white">qr_code_2</span>
              </div>
              <span className="font-display-lg text-headline-sm font-bold tracking-wider">PKKMB ABSENSI</span>
            </div>
            
            <div className="relative z-10 space-y-5 max-w-md">
              <span className="inline-block bg-[#c5a86d]/20 text-[#c5a86d] px-4 py-1.5 rounded-full text-label-md font-bold tracking-widest uppercase border border-[#c5a86d]/30">Portal Administrator</span>
              <h1 className="text-display-lg font-bold font-display-lg leading-tight tracking-tight">Monitor Kehadiran Mahasiswa Baru</h1>
            </div>
            
            <div className="relative z-10 flex items-center justify-between text-label-md text-slate-300 font-body-sm">
              <span>v1.0.0</span>
              <span className="text-[#c5a86d] font-semibold">PKKMB Universitas</span>
            </div>
          </div>

          {/* Right Side: Form Panel (Light Theme) */}
          <div className="flex-1 flex flex-col justify-center items-center p-8 sm:p-16 relative bg-[#ffffff] min-h-screen">
            {/* Subtle background glow */}
            <div className="absolute top-[20%] right-[10%] w-72 h-72 bg-[#012060]/3 rounded-full blur-[80px] pointer-events-none"></div>
            <div className="absolute bottom-[20%] left-[10%] w-72 h-72 bg-[#a50022]/3 rounded-full blur-[80px] pointer-events-none"></div>

            <div className="w-full max-w-md relative z-10">
              <div className="flex flex-col gap-2 mb-10 text-center lg:text-left">
                <span className="lg:hidden w-12 h-12 rounded-xl bg-gradient-to-br from-[#012060] to-[#a50022] flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-white text-[24px]">qr_code_2</span>
                </span>
                <span className="lg:hidden text-[#c5a86d] text-label-sm font-bold tracking-widest uppercase mb-1">Portal Administrator</span>
                <h2 className="text-headline-lg font-bold font-display-lg text-[#012060] tracking-tight" id="login-title">Login Admin</h2>
              </div>

              <form className="space-y-6" onSubmit={handleLoginSubmit}>
                <div className="space-y-5">
                  {/* Email Input */}
                  <div>
                    <label className="block text-label-md font-label-md text-[#7b7b7b] mb-2" htmlFor="nim">Email Admin</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#7b7b7b]/60 group-focus-within:text-[#012060] transition-colors text-[20px]">mail</span>
                      <input 
                        className="w-full pl-12 pr-4 py-4 bg-[#ffffff] rounded-xl border border-[#7b7b7b]/30 text-body-md font-body-md text-[#012060] placeholder:text-[#7b7b7b]/40 focus:outline-none focus:border-[#012060] focus:ring-4 focus:ring-[#012060]/10 transition-all hover:border-[#7b7b7b]/50" 
                        id="nim" 
                        name="username" 
                        placeholder="Masukkan email admin Anda..." 
                        required 
                        type="email" 
                        value={nim} 
                        onChange={(e) => setNim(e.target.value)} 
                      />
                    </div>
                  </div>

                  {/* Password Input */}
                  <div>
                    <label className="block text-label-md font-label-md text-[#7b7b7b] mb-2" htmlFor="password">Password</label>
                    <div className="relative group">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#7b7b7b]/60 group-focus-within:text-[#012060] transition-colors text-[20px]">lock</span>
                      <input 
                        className="w-full pl-12 pr-12 py-4 bg-[#ffffff] rounded-xl border border-[#7b7b7b]/30 text-body-md font-body-md text-[#012060] placeholder:text-[#7b7b7b]/40 focus:outline-none focus:border-[#012060] focus:ring-4 focus:ring-[#012060]/10 transition-all hover:border-[#7b7b7b]/50" 
                        id="password" 
                        name="password" 
                        placeholder="••••••••" 
                        required 
                        type={showPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                      />
                      <button 
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-[#7b7b7b] hover:text-[#012060] transition-colors cursor-pointer" 
                        type="button" 
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <span className="material-symbols-outlined text-[20px]">{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button 
                    disabled={isLoading} 
                    className="group relative w-full flex justify-center py-4 px-4 rounded-xl text-label-md font-bold text-[#ffffff] bg-[#012060] hover:bg-[#a50022] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#012060] focus:ring-offset-[#ffffff] transition-all shadow-[0_4px_14px_0_rgba(1,32,96,0.2)] hover:shadow-[0_6px_20px_rgba(165,0,34,0.3)] hover:-translate-y-0.5 active:scale-[0.98] overflow-hidden disabled:opacity-50 cursor-pointer" 
                    type="submit"
                  >
                    <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]"></div>
                    <span className="flex items-center gap-2 relative z-10">
                      <svg className={`animate-spin -ml-1 mr-2 h-5 w-5 text-[#ffffff] ${isLoading ? 'block' : 'hidden'}`} fill="none" id="login-spinner" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor"></path>
                      </svg>
                      <span id="login-btn-text">{isLoading ? 'Menghubungkan...' : 'Masuk'}</span>
                      <span className="material-symbols-outlined text-[18px] group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </span>
                  </button>
                </div>
              </form>

              {/* Portal Switch Link */}
              <div className="mt-10 pt-6 border-t border-[#7b7b7b]/10 text-center lg:text-left">
                <p className="text-body-sm text-[#7b7b7b]">
                  Bukan Administrator? {' '}
                  <button 
                    onClick={() => navigate('/login-mentor')} 
                    className="text-[#012060] hover:text-[#a50022] font-bold underline decoration-2 underline-offset-4 transition-colors cursor-pointer"
                  >
                    Masuk sebagai Mentor
                  </button>
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="absolute bottom-6 left-0 right-0 text-center px-6">
              <p className="text-label-md text-[#7b7b7b]/60 font-body-sm">
                © 2026 Universitas. Hak Cipta Dilindungi.
              </p>
            </div>
          </div>
        </div>
      </main>

      <style>{`
        @keyframes float {
          0% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
          100% { transform: translateY(0px) rotate(360deg); }
        }
        .animate-float-1 {
          animation: float 15s ease-in-out infinite;
        }
        .animate-float-2 {
          animation: float 20s ease-in-out infinite 2.5s;
        }
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
