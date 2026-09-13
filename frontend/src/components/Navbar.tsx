import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export function Navbar() {
  const { session, profile, signOut } = useAuth();
  const navigate = useNavigate();

  async function handleSignOut() {
    await signOut();
    navigate('/');
  }

  return (
    <header className="bg-river-700 text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/" className="text-lg font-semibold tracking-tight">
          Riverside Community Hub
        </Link>
        <div className="flex items-center gap-5 text-sm">
          <Link to="/facilities" className="hover:text-river-100">
            Facilities
          </Link>
          <Link to="/donate" className="hover:text-river-100">
            Donate
          </Link>
          {session && (
            <Link to="/my-bookings" className="hover:text-river-100">
              My Bookings
            </Link>
          )}
          {(profile?.role === 'staff' || profile?.role === 'admin') && (
            <Link to="/staff" className="hover:text-river-100">
              Staff Dashboard
            </Link>
          )}
          {profile?.role === 'admin' && (
            <Link to="/admin" className="hover:text-river-100">
              Admin
            </Link>
          )}
          {session ? (
            <>
              <Link to="/profile" className="hover:text-river-100">
                {profile?.full_name || 'Profile'}
              </Link>
              <button
                onClick={handleSignOut}
                className="rounded bg-river-600 px-3 py-1.5 hover:bg-river-500"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-river-100">
                Log in
              </Link>
              <Link
                to="/signup"
                className="rounded bg-white px-3 py-1.5 font-medium text-river-700 hover:bg-river-100"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
