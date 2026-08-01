import Link from "next/link";
import { Search } from "lucide-react";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-[#FAFAFA] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 bg-[rgba(0,47,167,0.08)] rounded-2xl flex items-center justify-center mx-auto mb-5">
          <Search className="w-8 h-8 text-[#002FA7]" />
        </div>
        <p className="text-sm font-bold text-[#002FA7] uppercase tracking-widest mb-2">
          404
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-[#171717]">
          Page not found
        </h1>
        <p className="text-sm text-[#737373] mt-2">
          The page you are looking for does not exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            href="/dashboard"
            className="inline-block bg-[#002FA7] hover:bg-[#002482] text-white font-semibold py-2 px-4 rounded-xl text-sm transition-all"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
