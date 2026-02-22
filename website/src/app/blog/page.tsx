import type { Metadata } from 'next';
import Link from 'next/link';
import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export const metadata: Metadata = {
  title: 'Blog — Insights for Service Professionals',
  description:
    'Insights on session preparation, client management, AI for service professionals, and practice growth from the PrepMeet team.',
  alternates: {
    canonical: 'https://prepmeet.com/blog',
  },
  openGraph: {
    title: 'PrepMeet Blog — Insights for Service Professionals',
    description:
      'Insights on session preparation, client management, AI for service professionals, and practice growth.',
    url: 'https://prepmeet.com/blog',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'PrepMeet Blog',
    description:
      'Insights on session preparation, client management, AI for service professionals, and practice growth.',
  },
};

const posts = [
  {
    slug: 'why-session-prep-matters',
    title: 'Why 2 Minutes of Session Prep Can Transform Your Client Relationships',
    excerpt:
      'A brief glance at context before a session can dramatically shift the quality of your interactions. Learn why the most effective therapists, lawyers, and doctors swear by pre-session preparation.',
    date: 'February 12, 2026',
    category: 'Productivity',
    readingTime: '6 min read',
  },
  {
    slug: 'ai-for-service-professionals',
    title: 'How AI Is Quietly Revolutionizing Service Professions',
    excerpt:
      'AI is not just for software engineers and data scientists. From automated intake summaries to intelligent scheduling, discover how service professionals are using AI to work smarter without sacrificing the human touch.',
    date: 'February 5, 2026',
    category: 'AI',
    readingTime: '7 min read',
  },
  {
    slug: 'reducing-no-shows',
    title: '5 Proven Strategies to Reduce Client No-Shows',
    excerpt:
      'No-shows cost service professionals thousands of dollars each year and disrupt carefully planned schedules. Here are five evidence-based strategies that actually move the needle.',
    date: 'January 28, 2026',
    category: 'Practice Management',
    readingTime: '5 min read',
  },
  {
    slug: 'hipaa-compliant-note-taking',
    title: 'A Guide to HIPAA-Compliant Digital Note-Taking for Healthcare Providers',
    excerpt:
      'Going digital with your clinical notes does not have to be a compliance nightmare. This guide breaks down what HIPAA actually requires and how to evaluate tools that meet the standard.',
    date: 'January 20, 2026',
    category: 'Compliance',
    readingTime: '8 min read',
  },
  {
    slug: 'from-paper-to-digital',
    title: 'Making the Switch: From Paper Notes to Digital Client Management',
    excerpt:
      'Still running your practice on paper files and sticky notes? You are not alone. Here is a practical, low-stress guide to going digital without losing what works.',
    date: 'January 14, 2026',
    category: 'Practice Management',
    readingTime: '6 min read',
  },
];

const categories = ['All', 'Productivity', 'AI', 'Compliance', 'Practice Management'];

const categoryColor: Record<string, string> = {
  Productivity: 'bg-green-50 text-green-700',
  AI: 'bg-purple-50 text-purple-700',
  Compliance: 'bg-orange-50 text-orange-700',
  'Practice Management': 'bg-blue-50 text-blue-700',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-5xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-4">Blog</h1>
        <p className="text-gray-500 text-lg mb-12 max-w-2xl">
          Insights on session preparation, client management, and how AI can
          help service professionals work smarter.
        </p>

        {/* Category filters — static display; all posts shown */}
        <div className="flex flex-wrap gap-2 mb-12">
          {categories.map((cat) => (
            <span
              key={cat}
              className={`px-4 py-1.5 rounded-full text-sm font-medium cursor-default ${
                cat === 'All'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200 transition'
              }`}
            >
              {cat}
            </span>
          ))}
        </div>

        {/* Post cards */}
        <div className="grid gap-8 sm:grid-cols-2">
          {posts.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block border border-gray-200 rounded-2xl p-6 hover:shadow-lg transition"
            >
              <div className="flex items-center gap-3 mb-4">
                <span
                  className={`text-xs font-medium px-2.5 py-0.5 rounded-full ${
                    categoryColor[post.category] ?? 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {post.category}
                </span>
                <span className="text-xs text-gray-400">{post.readingTime}</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition">
                {post.title}
              </h2>
              <p className="text-sm text-gray-500 leading-relaxed mb-4">
                {post.excerpt}
              </p>
              <p className="text-xs text-gray-400">{post.date}</p>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
