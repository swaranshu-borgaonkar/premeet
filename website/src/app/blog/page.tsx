import Navbar from '@/components/navbar';
import Footer from '@/components/footer';

export const metadata = {
  title: 'Blog — PrepMeet',
};

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="max-w-3xl mx-auto px-6 py-20">
        <h1 className="text-4xl font-bold mb-12">Blog</h1>
        <p className="text-gray-500 text-lg">
          Coming soon. We&apos;ll be sharing insights about session preparation,
          client management, and how AI can help service professionals work smarter.
        </p>
      </div>

      <Footer />
    </div>
  );
}
