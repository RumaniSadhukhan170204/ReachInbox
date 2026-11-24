
import { NavLink } from "react-router-dom";
import {
  LayoutDashboard,
  Send,
  Clock,
  Settings,
  Mail,
  CheckCircle
} from "lucide-react";

export default function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <span className="brand-icon">
          <Mail size={21} />
        </span>
        <span>ReachInbox</span>
      </div>

      <p className="nav-label">WORKSPACE</p>

      <nav>
        <NavLink to="/" end>
          <LayoutDashboard size={18} /> Dashboard
        </NavLink>

        <NavLink to="/compose">
          <Send size={18} /> Compose
        </NavLink>

        <NavLink to="/scheduled">
          <Clock size={18} /> Scheduled
        </NavLink>

        <NavLink to="/sent">
          <CheckCircle size={18} /> Sent
        </NavLink>
      </nav>

      <div className="sidebar-bottom">
        <NavLink to="/settings">
          <Settings size={18} /> Settings
        </NavLink>
      </div>
    </aside>
  );
}
