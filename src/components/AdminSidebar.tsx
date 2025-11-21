import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  ListOrdered, 
  Car, 
  BarChart3, 
  Settings,
  LogOut,
  ChevronLeft,
  Menu
} from 'lucide-react';

export function AdminSidebar() {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  
  const isActive = (path: string) => {
    return location.pathname === path;
  };

  const toggleSidebar = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <>
      <div className={`bg-slate-900 text-white min-h-screen fixed left-0 top-0 bottom-0 flex flex-col transition-all duration-300 ${isCollapsed ? 'w-20' : 'w-64'}`}>
        <div className="p-6 border-b border-slate-800">
          {!isCollapsed && (
            <>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <LayoutDashboard className="w-8 h-8 text-orange-500" />
                <span>Admin Panel</span>
              </h1>
              <p className="text-slate-400 text-sm mt-1">MyGarage Management</p>
            </>
          )}
          {isCollapsed && (
            <div className="flex justify-center">
              <LayoutDashboard className="w-8 h-8 text-orange-500" />
            </div>
          )}
        </div>
        
        <nav className="flex-1 py-6">
          <ul className="space-y-1 px-4">
            <li>
              <Link 
                to="/admin" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/admin') 
                    ? 'bg-orange-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <LayoutDashboard className="w-5 h-5" />
                {!isCollapsed && <span>Dashboard</span>}
              </Link>
            </li>
            
            <li>
              <Link 
                to="/admin/products" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/admin/products') 
                    ? 'bg-orange-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Package className="w-5 h-5" />
                {!isCollapsed && <span>Products</span>}
              </Link>
            </li>
            
            <li>
              <Link 
                to="/admin/categories" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/admin/categories') 
                    ? 'bg-orange-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Car className="w-5 h-5" />
                {!isCollapsed && <span>Categories</span>}
              </Link>
            </li>
            
            <li>
              <Link 
                to="/admin/orders" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/admin/orders') 
                    ? 'bg-orange-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <ListOrdered className="w-5 h-5" />
                {!isCollapsed && <span>Orders</span>}
              </Link>
            </li>
            
            <li>
              <Link 
                to="/admin/reports" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/admin/reports') 
                    ? 'bg-orange-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                {!isCollapsed && <span>Reports</span>}
              </Link>
            </li>
          </ul>
        </nav>
        
        <div className="p-4 border-t border-slate-800">
          <ul className="space-y-1">
            <li>
              <Link 
                to="/admin/settings" 
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive('/admin/settings') 
                    ? 'bg-orange-600 text-white' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Settings className="w-5 h-5" />
                {!isCollapsed && <span>Settings</span>}
              </Link>
            </li>
            
            <li>
              <Link 
                to="/" 
                className="flex items-center gap-3 px-4 py-3 rounded-lg text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
              >
                <LogOut className="w-5 h-5" />
                {!isCollapsed && <span>Back to Store</span>}
              </Link>
            </li>
          </ul>
        </div>
        
        {/* Collapse/Expand button */}
        <button
          onClick={toggleSidebar}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className={`absolute -right-3 top-16 bg-slate-800 text-white rounded-full p-1 shadow-lg hover:bg-slate-700 transition-all duration-300 ${
            hovered ? 'scale-110' : ''
          }`}
        >
          {isCollapsed ? (
            <Menu className="w-5 h-5 text-white" />
          ) : (
            <ChevronLeft 
              className={`w-5 h-5 text-white transition-transform duration-300 ${
                hovered ? 'scale-110' : ''
              }`} 
            />
          )}
        </button>
      </div>
      
      {/* Overlay for collapsed state on mobile */}
      {isCollapsed && (
        <div className="fixed inset-0 bg-transparent z-20 md:hidden" onClick={() => setIsCollapsed(false)} />
      )}
    </>
  );
}