import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-3xl font-bold">404</h1>
      <p className="mt-2 text-gray-600">Page not found.</p>
      <Link to="/" className="mt-6 inline-block text-river-700 underline">
        Back home
      </Link>
    </div>
  );
}
