export function SimpleFeatures() {
  return (
    <section className="relative w-full bg-gradient-to-br from-white via-green-50 to-emerald-50 py-16 md:py-24 overflow-hidden">
      {/* Background elements */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-green-100/50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-emerald-100/50 to-transparent"></div>

        {/* Colorful floating shapes */}
        <div className="absolute top-20 left-10 w-20 h-20 bg-gradient-to-br from-green-300/30 to-emerald-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-32 h-32 bg-gradient-to-tr from-teal-300/30 to-green-400/20 rounded-full blur-xl animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40 bg-gradient-to-r from-emerald-200/20 to-green-300/20 rounded-full blur-2xl"></div>
      </div>

      <div className="container relative z-10 px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center mb-16">
          <div className="inline-block rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-1.5 text-sm font-medium text-green-800 shadow-md">
            Why Choose BTS?
          </div>
          <h2 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-green-700 via-green-600 to-emerald-600 bg-clip-text text-transparent sm:text-4xl md:text-5xl">
            Your Path to Success
          </h2>
          <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed">
            Discover the benefits that make our scholarship program unique and effective.
          </p>
        </div>

        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-white to-green-50/50 p-8 shadow-lg border border-green-100/50 transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl hover:shadow-green-200/40"
            >
              {/* Background gradient effect */}
              <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-400/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>

              {/* Icon with colorful background */}
              <div className="relative mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 p-4 text-white shadow-lg shadow-green-500/30 group-hover:shadow-green-500/50 transition-all duration-300">
                {feature.icon}
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </div>

              <h3 className="relative mb-3 text-xl font-bold text-green-900 group-hover:text-green-800 transition-colors">
                {feature.title}
              </h3>
              <p className="relative text-gray-600 leading-relaxed">{feature.description}</p>

              {/* Hover accent line */}
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-300 group-hover:w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    title: "Easy Application",
    description: "Simple online application process with step-by-step guidance and real-time status updates.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <path d="m9 15 2 2 4-4"></path>
      </svg>
    ),
  },
  {
    title: "Financial Support",
    description:
      "Comprehensive financial assistance covering tuition, books, and living expenses for qualified students.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M16 8h-6.5a2.5 2.5 0 0 0 0 5h3a2.5 2.5 0 0 1 0 5H6"></path>
        <path d="M12 18v2"></path>
        <path d="M12 4v2"></path>
      </svg>
    ),
  },
  {
    title: "Digital Verification",
    description: "Secure QR code system for easy verification and tracking of your scholarship status and benefits.",
    icon: (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect width="5" height="5" x="3" y="3" rx="1"></rect>
        <rect width="5" height="5" x="16" y="3" rx="1"></rect>
        <rect width="5" height="5" x="3" y="16" rx="1"></rect>
        <path d="M21 16h-3a2 2 0 0 0-2 2v3"></path>
        <path d="M21 21v.01"></path>
        <path d="M12 7v3a2 2 0 0 1-2 2H7"></path>
        <path d="M3 12h.01"></path>
        <path d="M12 3h.01"></path>
        <path d="M12 16v.01"></path>
        <path d="M16 12h1"></path>
        <path d="M21 12v.01"></path>
      </svg>
    ),
  },
]
