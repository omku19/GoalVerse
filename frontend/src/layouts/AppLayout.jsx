import { Outlet, useNavigate } from "react-router-dom";
import Footer from "../components/Footer.jsx";
import Header from "../components/Header.jsx";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../hooks/useAuth.js";

export default function AppLayout() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex min-h-screen text-slate-950" style={{ background: 'var(--gv-bg)' }}>
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Header user={user} onLogout={handleLogout} />
        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
}
