export function FeaturesSection() {
  return (
    <section className="relative w-full bg-white py-16 md:py-24 overflow-hidden">
      {/* Background patterns */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-green-50 to-transparent"></div>
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-green-50 to-transparent"></div>
        <div className="absolute right-0 top-1/4 h-64 w-64 rounded-full bg-gradient-to-br from-green-200 to-emerald-100 opacity-20 blur-3xl"></div>
        <div className="absolute left-0 bottom-1/4 h-64 w-64 rounded-full bg-gradient-to-tr from-teal-200 to-green-100 opacity-20 blur-3xl"></div>
      </div>

      <div className="container relative z-10 px-4 md:px-6">
        <div className="flex flex-col items-center justify-center space-y-4 text-center">
          <div className="space-y-2">
            <div className="inline-block rounded-full bg-gradient-to-r from-green-100 to-emerald-100 px-4 py-1.5 text-sm font-medium text-green-800 shadow-md">
              Program Benefits
            </div>
            <h2 className="text-3xl font-bold tracking-tighter bg-gradient-to-r from-green-800 via-green-600 to-emerald-600 bg-clip-text text-transparent sm:text-4xl md:text-5xl">
              Why Choose Our Scholarship?
            </h2>
            <p className="max-w-[900px] text-gray-600 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
              Our scholarship program offers comprehensive support to help you achieve your educational goals.
            </p>
          </div>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 py-12 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative overflow-hidden rounded-xl border border-green-100 bg-gradient-to-br from-white to-green-50 p-6 shadow-lg transition-all duration-300 hover:-translate-y-2 hover:shadow-xl hover:shadow-green-200/40"
            >
              {/* Background gradient blob */}
              <div className="absolute -right-4 -bottom-4 h-32 w-32 rounded-full bg-gradient-to-br from-green-200 to-emerald-100 opacity-30 blur-xl transition-all duration-300 group-hover:opacity-50"></div>

              {/* Icon with gradient background */}
              <div className="relative mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-green-500 to-emerald-400 p-3 text-white shadow-lg shadow-green-200/50">
                {feature.icon}
                <div className="absolute inset-0 rounded-xl bg-white opacity-0 transition-opacity duration-300 group-hover:opacity-20"></div>
              </div>

              <h3 className="relative mb-2 text-xl font-bold text-green-900">{feature.title}</h3>
              <p className="relative text-gray-600">{feature.description}</p>

              {/* Hover indicator */}
              <div className="absolute bottom-0 left-0 h-1 w-0 bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-300 group-hover:w-full"></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const features = [
  {
    title: "Financial Support",
    description: "Receive comprehensive financial assistance for tuition, books, and living expenses.",
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
    title: "Mentorship",
    description: "Connect with experienced mentors who will guide you through your academic journey.",
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
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
        <circle cx="9" cy="7" r="4"></circle>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
      </svg>
    ),
  },
  {
    title: "Career Opportunities",
    description: "Access exclusive job placements and internship opportunities with our partner companies.",
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
        <rect width="20" height="14" x="2" y="7" rx="2"></rect>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
      </svg>
    ),
  },
  {
    title: "Digital Verification",
    description: "Secure QR code system for easy verification and tracking of your scholarship status.",
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
  {
    title: "Community Support",
    description: "Join a vibrant community of scholars and alumni for networking and support.",
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
        <path d="M18 8a6 6 0 0 0-6-6 6 6 0 0 0-6 6c0 7-3 9-3 9h18s-3-2-3-9"></path>
        <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
      </svg>
    ),
  },
  {
    title: "Easy Application",
    description: "Simple and straightforward application process with real-time status updates.",
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
]
