import { Link } from 'react-router-dom';

export function Landing() {
  return (
    <div>
      <section className="bg-river-600 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h1 className="text-4xl font-bold tracking-tight">Welcome to Riverside Community Hub</h1>
          <p className="mx-auto mt-4 max-w-2xl text-river-50">
            Youth programmes, a community gym, meeting and event spaces, and a food-parcel donation
            drive — all in one place. Become a member, book a facility, or support our work today.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link to="/signup" className="rounded bg-white px-5 py-2.5 font-semibold text-river-700">
              Become a member
            </Link>
            <Link
              to="/donate"
              className="rounded border border-white px-5 py-2.5 font-semibold text-white hover:bg-river-500"
            >
              Donate now
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <h2 className="text-2xl font-semibold">Our programmes</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: 'Youth Programmes',
              body: 'After-school activities, mentorship and skills workshops for young people in our community.',
            },
            {
              title: 'Community Gym',
              body: 'A small, well-equipped gym open to members for fitness and wellbeing.',
            },
            {
              title: 'Meeting & Event Rooms',
              body: 'Bookable rooms for community groups, meetings, and events of all sizes.',
            },
          ].map((p) => (
            <div key={p.title} className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-river-700">{p.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{p.body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
