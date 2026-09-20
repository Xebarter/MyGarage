'use client'

import { useMemo, useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Bell,
  CarFront,
  Check,
  ChevronDown,
  CircleDollarSign,
  Filter,
  Heart,
  LayoutDashboard,
  Menu,
  MoreHorizontal,
  Package,
  Plus,
  Search,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Users,
  X,
} from 'lucide-react'

const cars = [
  { id: 1, name: '2024 Mercedes-Benz G 580', type: 'Electric SUV', price: '$184,900', monthly: '$2,684/mo', mileage: '1,240 mi', location: 'New York, NY', image: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1200&q=85', tag: 'Just listed', accent: 'sage' },
  { id: 2, name: '2023 Porsche 911 Carrera GTS', type: 'Sports Coupe', price: '$178,500', monthly: '$2,591/mo', mileage: '3,810 mi', location: 'Los Angeles, CA', image: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85', tag: 'Curated pick', accent: 'red' },
  { id: 3, name: '2022 Range Rover Autobiography', type: 'Luxury SUV', price: '$129,900', monthly: '$1,887/mo', mileage: '8,420 mi', location: 'Austin, TX', image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=85', tag: 'Price drop', accent: 'gold' },
  { id: 4, name: '2024 BMW i7 xDrive60', type: 'Electric Sedan', price: '$119,800', monthly: '$1,741/mo', mileage: '2,105 mi', location: 'Chicago, IL', image: 'https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=1200&q=85', tag: 'New arrival', accent: 'blue' },
  { id: 5, name: '2021 Land Rover Defender 110', type: 'Adventure SUV', price: '$76,400', monthly: '$1,110/mo', mileage: '21,302 mi', location: 'Denver, CO', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=85', tag: 'Verified', accent: 'sage' },
  { id: 6, name: '2023 Audi RS 6 Avant', type: 'Performance Wagon', price: '$108,250', monthly: '$1,572/mo', mileage: '5,644 mi', location: 'Miami, FL', image: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?auto=format&fit=crop&w=1200&q=85', tag: 'Low miles', accent: 'red' },
]

const navItems = [
  { label: 'Overview', icon: LayoutDashboard },
  { label: 'Inventory', icon: CarFront },
  { label: 'Leads', icon: Users },
  { label: 'Orders', icon: Package },
  { label: 'Analytics', icon: BarChart3 },
]

function Logo() {
  return <div className="logo"><span className="logo-mark">A</span><span>ASTRA<span className="logo-dot">.</span></span></div>
}

function Pill({ children, tone = 'neutral' }: { children: React.ReactNode; tone?: string }) {
  return <span className={`pill pill-${tone}`}>{children}</span>
}

function CarCard({ car, onFavorite, favorite }: { car: typeof cars[number]; onFavorite: (id: number) => void; favorite: boolean }) {
  return (
    <article className="car-card">
      <div className="car-image-wrap">
        <img src={car.image} alt={car.name} className="car-image" />
        <div className="image-shade" />
        <Pill tone={car.accent}>{car.tag}</Pill>
        <button className={`favorite ${favorite ? 'is-favorite' : ''}`} onClick={() => onFavorite(car.id)} aria-label={`${favorite ? 'Remove' : 'Add'} ${car.name} to favorites`}>
          <Heart size={17} fill={favorite ? 'currentColor' : 'none'} />
        </button>
        <span className="photo-count">12 photos</span>
      </div>
      <div className="car-card-body">
        <div className="car-eyebrow">{car.type}<span className="dot-sep">·</span>{car.mileage}</div>
        <h3>{car.name}</h3>
        <div className="car-location">{car.location}</div>
        <div className="car-price-row"><div><strong>{car.price}</strong><span className="finance">or {car.monthly}</span></div><button className="circle-arrow" aria-label={`View ${car.name}`}><ArrowRight size={17} /></button></div>
      </div>
    </article>
  )
}

export function AdminView({ onBack = () => {} }: { onBack?: () => void }) {
  const [active, setActive] = useState('Overview')
  return <div className="admin-shell">
    <aside className="admin-sidebar">
      <Logo />
      <div className="admin-label">Management</div>
      <nav>{navItems.map(({ label, icon: Icon }) => <button key={label} className={active === label ? 'admin-nav active' : 'admin-nav'} onClick={() => setActive(label)}><Icon size={18} />{label}{label === 'Leads' && <span className="nav-badge">18</span>}</button>)}</nav>
      <div className="admin-label">Workspace</div>
      <button className="admin-nav"><Settings size={18} />Settings</button>
      <div className="admin-profile"><div className="avatar">JD</div><div><strong>Jordan Davis</strong><span>Administrator</span></div><MoreHorizontal size={17} /></div>
    </aside>
    <main className="admin-main">
      <header className="admin-topbar"><button className="back-link" onClick={onBack}><ArrowRight size={16} className="back-icon" /> Back to marketplace</button><div className="admin-top-actions"><button className="icon-button"><Bell size={18} /><i /></button><div className="avatar small">JD</div></div></header>
      <div className="admin-content">
        <div className="admin-heading"><div><div className="section-kicker">Monday, September 22, 2025</div><h1>{active === 'Overview' ? 'Good morning, Jordan.' : active}</h1><p>Here&apos;s what&apos;s happening across Astra Motors today.</p></div><button className="primary-button"><Plus size={17} /> Add vehicle</button></div>
        <div className="stat-grid"><div className="stat-card"><div className="stat-top"><span>Active inventory</span><CarFront size={18} /></div><strong>248</strong><span className="stat-change positive"><TrendingUp size={14} /> 12.4% <em>vs last month</em></span></div><div className="stat-card"><div className="stat-top"><span>Gross sales</span><CircleDollarSign size={18} /></div><strong>$2.84M</strong><span className="stat-change positive"><TrendingUp size={14} /> 8.7% <em>vs last month</em></span></div><div className="stat-card"><div className="stat-top"><span>New leads</span><Users size={18} /></div><strong>126</strong><span className="stat-change positive"><TrendingUp size={14} /> 18.2% <em>vs last month</em></span></div><div className="stat-card"><div className="stat-top"><span>Avg. days to sell</span><Sparkles size={18} /></div><strong>21.6 <small>days</small></strong><span className="stat-change neutral-change">↓ 3.4 days <em>vs last month</em></span></div></div>
        <div className="admin-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Sales performance</h2><p>Revenue generated over the past 30 days</p></div><button className="select-button">Last 30 days <ChevronDown size={15} /></button></div><div className="chart-area"><div className="chart-y"><span>$200k</span><span>$150k</span><span>$100k</span><span>$50k</span><span>$0</span></div><div className="chart"><div className="chart-grid-lines" /><svg viewBox="0 0 650 220" preserveAspectRatio="none" aria-label="Sales chart"><defs><linearGradient id="fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#bd3e3b" stopOpacity=".20" /><stop offset="1" stopColor="#bd3e3b" stopOpacity="0" /></linearGradient></defs><path d="M0 170 C28 160 38 132 64 145 S104 172 132 140 S174 110 198 127 S238 151 266 104 S308 91 330 106 S369 75 394 90 S425 126 448 80 S490 72 516 57 S547 80 570 42 S615 51 650 20 V220 H0 Z" fill="url(#fill)" /><path d="M0 170 C28 160 38 132 64 145 S104 172 132 140 S174 110 198 127 S238 151 266 104 S308 91 330 106 S369 75 394 90 S425 126 448 80 S490 72 516 57 S547 80 570 42 S615 51 650 20" fill="none" stroke="#bd3e3b" strokeWidth="3" /></svg><div className="chart-x"><span>Aug 24</span><span>Aug 31</span><span>Sep 07</span><span>Sep 14</span><span>Sep 21</span></div></div></div></section><section className="panel activity-panel"><div className="panel-heading"><div><h2>Recent activity</h2><p>Latest actions from your team</p></div><button className="text-button">View all <ArrowRight size={15} /></button></div><div className="activity-list"><div><div className="activity-icon green"><Check size={15} /></div><p><strong>Vehicle sold</strong><span>2022 Porsche Taycan 4S</span></p><time>2m ago</time></div><div><div className="activity-icon blue"><Users size={15} /></div><p><strong>New lead received</strong><span>Sarah Mitchell · G 580</span></p><time>18m ago</time></div><div><div className="activity-icon gold"><CircleDollarSign size={15} /></div><p><strong>Deposit received</strong><span>2023 Range Rover Sport</span></p><time>1h ago</time></div><div><div className="activity-icon red"><CarFront size={15} /></div><p><strong>Vehicle added</strong><span>2024 BMW i7 xDrive60</span></p><time>3h ago</time></div></div></section></div>
        <section className="panel inventory-panel"><div className="panel-heading"><div><h2>Inventory overview</h2><p>Recently updated vehicles in your catalog</p></div><button className="text-button">Manage inventory <ArrowRight size={15} /></button></div><div className="inventory-table"><div className="table-head"><span>Vehicle</span><span>Status</span><span>Price</span><span>Added</span><span /></div>{cars.slice(0, 4).map((car, i) => <div className="table-row" key={car.id}><div className="vehicle-cell"><img src={car.image} alt="" /><span><strong>{car.name}</strong><small>{car.type} · {car.mileage}</small></span></div><Pill tone={i === 1 ? 'gold' : 'sage'}>{i === 1 ? 'Reserved' : 'Active'}</Pill><strong>{car.price}</strong><span className="muted-text">{i + 1} day{i ? 's' : ''} ago</span><button className="more-button" aria-label="More actions"><MoreHorizontal size={18} /></button></div>)}</div></section>
      </div>
    </main>
  </div>
}

export default function Page() {
  const [admin, setAdmin] = useState(false)
  const [favorites, setFavorites] = useState<number[]>([])
  const [query, setQuery] = useState('')
  const [filterOpen, setFilterOpen] = useState(false)
  const [mobileMenu, setMobileMenu] = useState(false)
  const [category, setCategory] = useState('All vehicles')
  const filteredCars = useMemo(() => cars.filter(car => `${car.name} ${car.type}`.toLowerCase().includes(query.toLowerCase()) && (category === 'All vehicles' || car.type.toLowerCase().includes(category.toLowerCase().replace(' cars', '')))), [query, category])
  if (admin) return <AdminView onBack={() => setAdmin(false)} />
  return <div className="site-shell">
    <header className="site-header"><div className="header-inner"><Logo /><nav className={mobileMenu ? 'main-nav mobile-open' : 'main-nav'}><a className="active" href="#inventory">Browse inventory</a><a href="#how-it-works">How it works</a><a href="#sell">Sell your car</a></nav><div className="header-actions"><button className="admin-link" onClick={() => setAdmin(true)}>Admin portal <ArrowRight size={15} /></button><button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">{mobileMenu ? <X /> : <Menu />}</button></div></div></header>
    <main>
      <section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="eyebrow-line" /> The considered way to buy <span className="eyebrow-line" /></div><h1>Find the car<br /><i>worth driving.</i></h1><p>Premium cars, carefully curated. Every vehicle is inspected, verified, and ready for your next chapter.</p><div className="hero-search"><Search size={19} /><input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by make, model, or keyword" /><button onClick={() => document.getElementById('inventory')?.scrollIntoView({ behavior: 'smooth' })}>Explore cars <ArrowRight size={16} /></button></div><div className="hero-meta"><span><ShieldCheck size={15} /> Every car verified</span><span><Sparkles size={15} /> 7-day return promise</span></div></div><div className="hero-art"><div className="hero-car-glow" /><img src="https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=1600&q=90" alt="Black Mercedes-Benz G-Class in a studio" /><div className="hero-art-label"><span>Featured collection</span><strong>Electric, evolved.</strong><ArrowRight size={16} /></div></div></section>
      <section className="trust-bar"><span>TRUSTED BY DRIVERS WHO EXPECT MORE</span><div><b>road&amp;track</b><b className="trust-italic">car<span>and</span>driver</b><b>FORBES</b><b className="trust-light">MOTOR<span>1</span></b><b>HYPEBEAST</b></div></section>
      <section className="inventory-section" id="inventory"><div className="section-heading"><div><span className="section-kicker">The collection</span><h2>Good cars for<br /><em>great journeys.</em></h2></div><p>From everyday icons to rare finds, our collection is chosen for how it feels to own — not just how it looks on paper.</p></div><div className="inventory-toolbar"><div className="category-tabs">{['All vehicles', 'SUVs', 'Sports cars', 'Electric', 'Sedans'].map(tab => <button className={category === tab ? 'active' : ''} key={tab} onClick={() => setCategory(tab)}>{tab}</button>)}</div><button className={`filter-button ${filterOpen ? 'open' : ''}`} onClick={() => setFilterOpen(!filterOpen)}><SlidersHorizontal size={16} /> Filters <span>3</span></button></div>{filterOpen && <div className="filter-drawer"><div><label>Price range</label><select><option>Any price</option><option>Under $75,000</option><option>$75,000 – $150,000</option></select></div><div><label>Make</label><select><option>All makes</option><option>Mercedes-Benz</option><option>Porsche</option><option>BMW</option></select></div><button onClick={() => setFilterOpen(false)}>Apply filters <Check size={15} /></button></div>}<div className="car-grid">{filteredCars.map(car => <CarCard key={car.id} car={car} favorite={favorites.includes(car.id)} onFavorite={id => setFavorites(favorites.includes(id) ? favorites.filter(f => f !== id) : [...favorites, id])} />)}</div>{filteredCars.length === 0 && <div className="empty-state">No cars match that search. Try a different make or model.</div>}<div className="browse-more"><button className="outline-button">View all 248 vehicles <ArrowRight size={16} /></button><span>Updated daily · New arrivals every week</span></div></section>
      <section className="value-section" id="how-it-works"><div><span className="section-kicker">A better way forward</span><h2>Buying a car<br /><em>should feel good.</em></h2></div><div className="value-cards"><div><span>01</span><h3>Curated, not crowded.</h3><p>We handpick every car so you spend less time searching and more time finding the one.</p></div><div><span>02</span><h3>Confidence included.</h3><p>Our 150-point inspection and transparent history make every decision an easy one.</p></div><div><span>03</span><h3>Your time, respected.</h3><p>Buy online, at home, or in our studio. We move at your pace, never ours.</p></div></div></section>
    </main><footer><Logo /><span>© 2025 Astra Motors. Drive considered.</span><div><a href="#">Privacy</a><a href="#">Contact</a></div></footer>
  </div>
}
