import Link from 'next/link';

export const metadata = {
  title: 'Blog — PrepMeet',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link href="/" className="flex items-center gap-2 w-fit">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold text-sm">
              P
            </div>
            <span className="font-bold text-xl">PrepMeet</span>
          </Link>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-12">Blog</h1>
        <p className="text-gray-500 text-lg">
          Coming soon. We&apos;ll be sharing insights about session preparation,
          client management, and how AI can help service professionals work smarter.
        </p>
      </div>
    </div>
  );
}
