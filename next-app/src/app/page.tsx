import Link from 'next/link'

const features = [
  {
    title: 'AI-Powered Planning',
    description: 'Our intelligent assistant helps you make decisions, suggests vendors, and keeps everything on track.',
    icon: '✨'
  },
  {
    title: 'Vendor Management',
    description: 'Keep all your vendor contacts, contracts, and communications in one place.',
    icon: '📋'
  },
  {
    title: 'Budget Tracking',
    description: 'Stay on top of your wedding budget with real-time tracking and smart suggestions.',
    icon: '💰'
  },
  {
    title: 'Timeline Builder',
    description: 'Create and manage your wedding day timeline with ease, from ceremony to reception.',
    icon: '⏰'
  }
];

export default function HomePage() {
  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-rose-50 to-teal-50 animate-gradient py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center animate-fade-in">
            <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-rose-500 to-teal-500 text-transparent bg-clip-text sm:text-6xl">
              Your Dream Wedding, Perfectly Planned
            </h1>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              AI-powered wedding planning that makes your special day effortless. From venue selection to timeline management, we've got you covered.
            </p>
            <div className="mt-10 flex items-center justify-center gap-x-6">
              <Link href="/signup" className="rounded-md bg-rose-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-rose-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 transition-all duration-200">
                Get Started
              </Link>
              <Link href="/login" className="rounded-md bg-teal-500 px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-teal-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-500 transition-all duration-200">
                Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 sm:py-32">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">Everything you need to plan your perfect day</h2>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              Our AI-powered platform makes wedding planning simple, organized, and stress-free.
            </p>
          </div>
          <div className="mx-auto mt-16 max-w-2xl sm:mt-20 lg:mt-24 lg:max-w-none">
            <dl className="grid max-w-xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-4">
              {features.map((feature) => (
                <div key={feature.title} className="animate-slide-up flex flex-col bg-white rounded-2xl p-6 shadow-sm ring-1 ring-gray-200 hover:shadow-lg transition-all duration-200">
                  <dt className="text-2xl font-semibold leading-7 text-gray-900 mb-4">
                    <span className="text-4xl mb-4 block">{feature.icon}</span>
                    {feature.title}
                  </dt>
                  <dd className="flex flex-auto flex-col text-base leading-7 text-gray-600">
                    <p className="flex-auto">{feature.description}</p>
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      {/* Demo Section */}
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-rose-50 to-teal-50 px-6 py-24 sm:py-32 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">See how it works</h2>
          <p className="mt-6 text-lg leading-8 text-gray-600">
            Watch how our AI-powered platform helps you plan your perfect wedding day in minutes.
          </p>
          <div className="mt-10 flex items-center justify-center">
            <div className="aspect-video w-full max-w-3xl rounded-2xl bg-gray-100 shadow-lg">
              {/* Placeholder for video - replace with actual video component */}
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Demo Video Coming Soon
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-12 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              Privacy Policy
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              Terms of Service
            </Link>
            <Link href="#" className="text-gray-400 hover:text-gray-500">
              Contact
            </Link>
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-xs leading-5 text-gray-500">
              &copy; {new Date().getFullYear()} Wedding Planner AI. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </main>
  )
}
