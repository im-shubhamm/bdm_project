import { BrowserRouter, NavLink, Route, Routes } from 'react-router-dom';
import Home from './pages/Home.jsx';
import Categories from './pages/Categories.jsx';
import Regions from './pages/Regions.jsx';
import Customers from './pages/Customers.jsx';
import Discounts from './pages/Discounts.jsx';
import Methodology from './pages/Methodology.jsx';

const links = [
  ['/', 'Overview'],
  ['/categories', 'Categories'],
  ['/regions', 'Regions'],
  ['/customers', 'Customers'],
  ['/discounts', 'Discounts'],
  ['/methodology', 'Method'],
];

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="topbar">
          <div className="brand">
            <strong>Superstore Pulse</strong>
            <span>BDM · Sales & profitability intelligence</span>
          </div>
          <nav className="nav">
            {links.map(([to, label]) => (
              <NavLink key={to} to={to} end={to === '/'} className={({ isActive }) => (isActive ? 'active' : undefined)}>
                {label}
              </NavLink>
            ))}
          </nav>
          <div className="team">
            Shubham · Arkadip Siddha · Advitya Ranjan · Chayan Das
          </div>
        </header>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="/regions" element={<Regions />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/discounts" element={<Discounts />} />
          <Route path="/methodology" element={<Methodology />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
