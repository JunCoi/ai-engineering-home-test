import { Routes, Route, NavLink } from 'react-router-dom';
import TenantList from './pages/TenantList';
import TenantForm from './pages/TenantForm';
import Preview from './pages/Preview';
import Diff from './pages/Diff';
import History from './pages/History';

export default function App() {
  return (
    <>
      <nav className="nav">
        <NavLink to="/" className="nav-brand">Tenant Config Platform</NavLink>
        <div className="nav-links">
          <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Tenants
          </NavLink>
          <NavLink to="/diff" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
            Compare
          </NavLink>
        </div>
      </nav>
      <main>
        <Routes>
          <Route path="/" element={<TenantList />} />
          <Route path="/tenants/new" element={<TenantForm />} />
          <Route path="/tenants/:id/edit" element={<TenantForm />} />
          <Route path="/tenants/:id/preview" element={<Preview />} />
          <Route path="/tenants/:id/history" element={<History />} />
          <Route path="/diff" element={<Diff />} />
        </Routes>
      </main>
    </>
  );
}
