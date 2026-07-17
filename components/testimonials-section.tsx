"use client"

import Image from "next/image"

export function TestimonialsSection() {
  const testimonials = [
    {
      quote: "This scholarship guided me through my journey as a medical technology student, helping me excel academically and preparing me for a meaningful career in the healthcare field.",
      name: "Loren Corro",
      role: "MEDTECH STUDENT",
      image: "/images/loren.jpg" // Replace with actual image path when available
    },
    {
      quote: "As a psychology student, this scholarship helped me excel academically and opened the door to valuable career opportunities.",
      name: "Jean Laurence Bautista",
      role: "PSYCHOLOGY STUDENT", 
      image: "/images/jean.jpg" // Replace with actual image path when available
    },
    {
      quote: "This scholarship supported my journey as an IT student",
      name: "Charmee Botero",
      role: "IT STUDENT",
      image: "/images/charm2.png" // Replace with actual image path when available
    }
  ]

  return (
    <section className="relative w-full bg-[#11773d] py-20 px-4 md:px-6 overflow-hidden">
      
      {/* Background Design Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        {/* Subtle grid pattern overlay */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:32px_32px]"></div>
        
        {/* Soft glowing background orbs */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[100px] transform -translate-y-1/2"></div>
        <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-teal-400/10 rounded-full blur-[120px] transform translate-y-1/3"></div>
      </div>

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Header Section */}
        <div className="flex flex-col items-center text-center mb-16 space-y-4">
          <div className="inline-block px-4 py-1.5 bg-white/10 border border-white/20 rounded-full shadow-sm backdrop-blur-sm">
            <span className="text-white text-xs font-bold tracking-widest uppercase">
              Success Stories
            </span>
          </div>
          
          <h2 className="text-4xl md:text-5xl font-black text-white tracking-tight drop-shadow-md">
            Hear From Our Scholars
          </h2>
          
          <p className="text-emerald-50 text-lg md:text-xl max-w-2xl mx-auto font-medium">
            Our scholarship program has helped hundreds of students achieve their dreams.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {testimonials.map((testimonial, index) => (
            <div 
              key={index} 
              className="bg-[#188b4f]/90 backdrop-blur-md rounded-2xl p-8 border border-white/10 shadow-2xl hover:bg-[#1b9a58] transition-colors duration-300 flex flex-col justify-between"
            >
              <div>
                {/* Quote Icon */}
                <svg 
                  className="w-8 h-8 text-emerald-200/50 mb-6" 
                  fill="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" />
                </svg>

                {/* Stars */}
                <div className="flex gap-1 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-5 h-5 text-yellow-400 drop-shadow-sm" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote Text */}
                <p className="text-white text-lg italic leading-relaxed mb-8 font-medium">
                  "{testimonial.quote}"
                </p>
              </div>

              {/* User Info Profile */}
              <div className="flex items-center gap-4 mt-auto">
                {/* 🔥 NEW: Added Next/Image component to display the profile picture */}
                <div className="relative w-12 h-12 flex-shrink-0 rounded-full border-2 border-white/30 overflow-hidden shadow-md bg-white/20">
                  <Image 
                    src={testimonial.image} 
                    alt={testimonial.name}
                    fill
                    className="object-cover"
                  />
                </div>
                <div>
                  <h4 className="text-white font-bold text-lg leading-tight drop-shadow-sm">
                    {testimonial.name}
                  </h4>
                  <p className="text-emerald-200 text-xs font-bold uppercase tracking-wide mt-1">
                    {testimonial.role}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
