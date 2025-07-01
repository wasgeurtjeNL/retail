import Link from "next/link";

export default function CTA() {
  return (
    <div className="bg-pink-600">
      <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:py-16 lg:px-8 lg:flex lg:items-center lg:justify-between">
        <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
          <span className="block">Klaar om je omzet te verhogen?</span>
          <span className="block text-pink-200">Word vandaag nog lid van ons retailnetwerk.</span>
        </h2>
        <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
          <div className="inline-flex rounded-md shadow">
            <Link
              href="/register"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-pink-600 bg-white hover:bg-pink-50"
            >
              Aan de slag
            </Link>
          </div>
          <div className="ml-3 inline-flex rounded-md shadow">
            <Link
              href="/contact"
              className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-pink-800 hover:bg-pink-900"
            >
              Contact Verkoop
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
} 