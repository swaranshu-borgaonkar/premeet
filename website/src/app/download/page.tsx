import { redirect } from 'next/navigation';

export default function DownloadPage() {
  // Redirect to Chrome Web Store once published
  // For now, redirect to home
  redirect('/');
}
