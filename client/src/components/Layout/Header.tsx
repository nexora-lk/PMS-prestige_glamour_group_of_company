import { useAuth } from '../../context/AuthContext';

interface HeaderProps {
  collapsed: boolean;
  title: string;
  subtitle?: string;
}

export default function Header({ collapsed, title, subtitle }: HeaderProps) {
  const { user } = useAuth();

  return (
    <header className={`header${collapsed ? ' collapsed' : ''}`}>
      <div className="header-left">
        <div className="header-title">
          <h1>{title}</h1>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>

      <div className="header-right">
        <div className="header-user">
          <div className="header-avatar">
            {user?.name?.charAt(0) || 'A'}
          </div>
          <div className="header-user-info">
            <div className="header-user-name">{user?.name || 'Admin'}</div>
            <div className="header-user-role">{user?.role || 'Super Admin'}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
