import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useContext } from 'react';
import { AppContext } from '../context/AppContext';

const navItems = [
  { to: '/mentor/dashboard', icon: 'dashboard', label: 'Dashboard' },
  { to: '/mentor/peserta', icon: 'groups', label: 'Anggota Gugus' },
  { to: '/mentor/scanner-qr', icon: 'qr_code_scanner', label: 'Scanner QR' },
  { to: '/mentor/absensi-manual', icon: 'person_add', label: 'Absensi Manual' },
];

export default function MentorLayout() {
  const { currentUser, setCurrentUser } = useContext(AppContext);
  const navigate = useNavigate();

  const handleLogout = (e) => {
    e.preventDefault();
    setCurrentUser(null);
    navigate('/login-mentor');
  };

  return (
    <div className="bg-background font-body-md text-on-background min-h-screen">
      <aside className="fixed left-0 top-0 h-full w-[280px] bg-[#0d1b4d] z-50 flex flex-col shadow-2xl">
        <div className="p-gutter mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-white/10 flex items-center justify-center">
            <span className="material-symbols-outlined text-white">badge</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-headline-sm leading-tight">PKKMB</span>
            <span className="text-on-primary-container text-label-sm">ATTENDANCE</span>
          </div>
        </div>
        <div className="flex-1 px-4 overflow-y-auto space-y-6 pb-8">
          <div className="space-y-1">
            <p className="px-4 text-label-sm text-on-primary-container uppercase tracking-widest mb-2">
              Mentor
            </p>
            <nav className="space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center px-4 py-3 rounded-xl transition-all group ${
                      isActive
                        ? 'bg-secondary-container text-on-secondary-container'
                        : 'text-white/70 hover:bg-white/10 hover:text-white'
                    }`
                  }
                >
                  <span className="material-symbols-outlined mr-3">{item.icon}</span>
                  <span className="text-body-md">{item.label}</span>
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
        <div className="p-4 mt-auto border-t border-white/10">
          <button onClick={handleLogout} className="w-full flex items-center justify-between gap-3 px-4 py-2 rounded-xl hover:bg-white/10 transition-colors text-left cursor-pointer">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center ring-2 ring-white/20 shrink-0">
                <span className="material-symbols-outlined text-on-primary text-[18px]">person</span>
              </div>
              <div className="overflow-hidden">
                <p className="text-white text-label-md truncate">{currentUser?.name || 'Mentor Budi'}</p>
                <p className="text-white/50 text-label-sm truncate">{currentUser?.email || 'mentor@univ.ac.id'}</p>
              </div>
            </div>
            <span className="material-symbols-outlined text-white/50 hover:text-white">logout</span>
          </button>
        </div>
      </aside>
      <div className="pl-[280px] min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}
