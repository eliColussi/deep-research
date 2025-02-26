import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-br from-rose-50 to-teal-50">
      <div className="z-10 max-w-5xl w-full items-center justify-between text-sm lg:flex">
        <div className="w-full text-center lg:text-left">
          <h1 className="text-6xl font-bold bg-gradient-to-r from-rose-500 to-teal-500 text-transparent bg-clip-text mb-4">
            AI Wedding Planner
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Your personal AI assistant for crafting the perfect wedding, powered by deep research and expert knowledge.
          </p>
          <div className="flex flex-col lg:flex-row gap-4 justify-center lg:justify-start">
            <Link 
              href="/login"
              className="px-8 py-3 bg-gradient-to-r from-rose-500 to-teal-500 text-white rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Get Started
            </Link>
            <Link 
              href="/about"
              className="px-8 py-3 border border-gray-300 rounded-lg font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </div>

      <div className="mt-16 grid text-center lg:max-w-5xl lg:w-full lg:mb-0 lg:grid-cols-3 lg:text-left gap-8">
        {[
          {
            title: 'Smart Planning',
            desc: 'AI-powered suggestions for venues, vendors, and timelines based on your preferences.'
          },
          {
            title: 'Deep Research',
            desc: 'Comprehensive analysis of options and trends to make informed decisions.'
          },
          {
            title: 'Expert Guidance',
            desc: 'Step-by-step assistance through every phase of wedding planning.'
          }
        ].map((feature, i) => (
          <div
            key={i}
            className="group rounded-lg border border-transparent px-5 py-4 transition-colors hover:border-gray-300 hover:bg-gray-100"
          >
            <h2 className="mb-3 text-2xl font-semibold text-gray-800">
              {feature.title}
            </h2>
            <p className="m-0 max-w-[30ch] text-sm opacity-70">
              {feature.desc}
            </p>
          </div>
        ))}
      </div>
    </main>
  )
}
