import Link from 'next/link';

export default function Navbar() {
  return (
    <nav className="border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
            P
          </div>
          <span className="font-bold text-xl">PrepMeet</span>
        </Link>
        <div className="hidden md:flex items-center gap-6">
          <Link href="/features" className="text-sm text-gray-600 hover:text-gray-900 transition">
            Features
          </Link>
          <Link href="/pricing" className="text-sm text-gray-600 hover:text-gray-900 transition">
            Pricing
          </Link>
          <Link href="/enterprise" className="text-sm text-gray-600 hover:text-gray-900 transition">
            Enterprise
          </Link>
          <Link href="/security" className="text-sm text-gray-600 hover:text-gray-900 transition">
            Security
          </Link>
          <Link href="/blog" className="text-sm text-gray-600 hover:text-gray-900 transition">
            Blog
          </Link>
          <Link
            href="/download"
            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition"
          >
            Install Free
          </Link>
        </div>
      </div>
    </nav>
  );
}
