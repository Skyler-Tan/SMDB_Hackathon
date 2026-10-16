import { Link } from 'react-router-dom';
import { Recycle, MapPin, Users, ScanLine, Leaf, Droplets, Zap, ArrowRight, MessageCircle, Trophy, Lightbulb, Medal } from 'lucide-react';

const facts = [
  { icon: Droplets, title: 'Save water', text: 'Recycling paper can help reduce the water and energy needed to make new paper.' },
  { icon: Zap, title: 'Give materials a second life', text: 'Aluminium can be recycled repeatedly without losing its core properties.' },
  { icon: Leaf, title: 'Small actions add up', text: 'Sorting recyclables correctly helps keep useful materials out of landfill.' },
];
const quickLinks = [
  { to: '/scan', icon: ScanLine, title: 'Scan an item', desc: 'Identify how to sort it', color: 'bg-emerald-100 text-emerald-700' },
  { to: '/map', icon: MapPin, title: 'Find a centre', desc: 'Explore nearby drop-offs', color: 'bg-sky-100 text-sky-700' },
  { to: '/community', icon: Users, title: 'Join community', desc: 'Share tips and progress', color: 'bg-violet-100 text-violet-700' },
];

// Hard-coded leaderboard data. Replace with a real API call later.
const topRecyclers = [
  { rank: 1, name: 'Aisyah R.', items: 128, points: 1280 },
  { rank: 2, name: 'Wei Jie T.', items: 112, points: 1120 },
  { rank: 3, name: 'Priya K.', items: 97, points: 970 },
  { rank: 4, name: 'Daniel L.', items: 84, points: 840 },
  { rank: 5, name: 'Nurul H.', items: 76, points: 760 },
];

const rankStyles = {
  1: 'bg-amber-100 text-amber-700',
  2: 'bg-gray-200 text-gray-700',
  3: 'bg-orange-100 text-orange-700',
};

export default function Home() {
  return <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
    <section className="overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-700 via-green-600 via-75% to-green-500 p-6 text-white shadow-lg sm:p-8">
      <div className="max-w-2xl"><span className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-sm"><Leaf size={15}/> Small steps. Greener living.</span>
        <h2 className="text-3xl font-extrabold leading-tight sm:text-4xl">Make every item count.</h2>
        <p className="mt-3 max-w-xl text-green-50">Your everyday companion for recycling smarter, finding drop-off points and learning from a community that cares.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link to="/scan" className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-3 font-bold text-green-800 shadow hover:bg-green-50"><ScanLine size={18}/> Scan an item</Link><Link to="/community" className="inline-flex items-center gap-2 rounded-xl border border-white/50 px-4 py-3 font-semibold hover:bg-white/10">Explore community <ArrowRight size={17}/></Link></div>
      </div>
      <div className="mt-7 flex items-center gap-3 rounded-2xl bg-black/10 p-4 sm:max-w-md"><div className="rounded-xl bg-white/15 p-3"><Recycle size={28}/></div><div><p className="font-bold">Reuse. Recycle. Repeat.</p><p className="text-sm text-green-50">Better habits start with one choice.</p></div></div>
    </section>
    <section><div className="mb-3 flex items-end justify-between"><div><p className="text-sm font-semibold uppercase tracking-wider text-green-700">Get started</p><h3 className="text-xl font-bold">What would you like to do?</h3></div></div><div className="grid gap-3 sm:grid-cols-3">{quickLinks.map(({to,icon:Icon,title,desc,color})=><Link key={to} to={to} className="group rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl ${color}`}><Icon size={24}/></div><h4 className="font-bold">{title}</h4><p className="mt-1 text-sm text-gray-500">{desc}</p><ArrowRight size={18} className="mt-4 text-green-700 transition group-hover:translate-x-1"/></Link>)}</div></section>

    {/* Top recyclers (hard-coded) */}
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Medal className="text-green-700" size={22}/>
          <div>
            <h3 className="font-bold">Top recyclers</h3>
            <p className="text-sm text-gray-500">Our most active members this month</p>
          </div>
        </div>
      </div>
      <ol className="space-y-2">
        {topRecyclers.map(({ rank, name, items, points }) => (
          <li key={rank} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold ${rankStyles[rank] || 'bg-green-100 text-green-800'}`}>{rank}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-gray-900">{name}</p>
              <p className="text-sm text-gray-500">{items} items recycled</p>
            </div>
            <span className="shrink-0 font-bold text-green-700">{points.toLocaleString()} pts</span>
          </li>
        ))}
      </ol>
    </section>

    <section className="grid gap-4 md:grid-cols-5"><div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:col-span-2"><div className="mb-3 flex items-center gap-2"><Trophy className="text-amber-500" size={22}/><h3 className="font-bold">Top commentator spotlight</h3></div><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-lg">🌟</div><div><p className="font-semibold">Your name could be here next</p><p className="text-sm text-gray-500">Helpful comments make the community better.</p></div></div><Link to="/community" className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-green-700">Meet the community <ArrowRight size={15}/></Link><p className="mt-4 border-t border-gray-100 pt-3 text-xs text-gray-400">Community highlights will grow as members contribute.</p></div>
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm md:col-span-3"><div className="mb-4 flex items-center gap-2"><Lightbulb className="text-green-700" size={22}/><h3 className="font-bold">Quick eco facts</h3></div><div className="grid gap-4 sm:grid-cols-3">{facts.map(({icon:Icon,title,text})=><div key={title} className="rounded-xl bg-green-50 p-3"><Icon size={20} className="mb-2 text-green-700"/><p className="text-sm font-bold">{title}</p><p className="mt-1 text-xs leading-relaxed text-gray-600">{text}</p></div>)}</div></div></section>
    <div className="flex flex-col gap-3 rounded-2xl bg-gray-900 p-5 text-white sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><div className="rounded-xl bg-white/10 p-3"><MessageCircle size={22}/></div><div><h3 className="font-bold">Have a tip worth sharing?</h3><p className="text-sm text-gray-300">Inspire someone in the 34district community.</p></div></div><Link to="/community" className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-500 px-4 py-3 font-bold hover:bg-green-400">Create a post <ArrowRight size={17}/></Link></div>
  </div>;
}