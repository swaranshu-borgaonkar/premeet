import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-100 py-16">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Product</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <Link href="/features" className="block hover:text-gray-900 transition">Features</Link>
              <Link href="/pricing" className="block hover:text-gray-900 transition">Pricing</Link>
              <Link href="/download" className="block hover:text-gray-900 transition">Download</Link>
              <Link href="/roi-calculator" className="block hover:text-gray-900 transition">ROI Calculator</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Solutions</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <Link href="/enterprise" className="block hover:text-gray-900 transition">Enterprise</Link>
              <Link href="/hipaa" className="block hover:text-gray-900 transition">HIPAA Compliance</Link>
              <Link href="/security" className="block hover:text-gray-900 transition">Security</Link>
              <Link href="/contact-sales" className="block hover:text-gray-900 transition">Contact Sales</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Resources</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <Link href="/blog" className="block hover:text-gray-900 transition">Blog</Link>
              <Link href="/privacy" className="block hover:text-gray-900 transition">Privacy Policy</Link>
              <Link href="/terms" className="block hover:text-gray-900 transition">Terms of Service</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-4">Company</h4>
            <div className="space-y-3 text-sm text-gray-600">
              <Link href="/contact-sales" className="block hover:text-gray-900 transition">Contact Us</Link>
              <Link href="/admin" className="block hover:text-gray-900 transition">Admin Portal</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-100 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-xs">
              P
            </div>
            <span className="font-semibold">PrepMeet</span>
          </div>
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} PrepMeet. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
