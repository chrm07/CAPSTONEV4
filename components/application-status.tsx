"use client"

import { CheckCircle, Clock, XCircle, FileText, FileQuestion, Info } from "lucide-react"

// Import or define the type to match dashboard logic
export type DerivedAppStatus = 
  | "not_started" 
  | "incomplete" 
  | "ready_to_submit" 
  | "submitted" 
  | "approved" 
  | "rejected"

interface ApplicationStatusProps {
  status: DerivedAppStatus
}

export function ApplicationStatus({ status }: ApplicationStatusProps) {
  // 🔥 Now with 4 explicit steps
  const steps = [
    { id: "not_submitted", label: "Not Submitted" },
    { id: "submitted", label: "Submitted" },
    { id: "review", label: "Under Review" },
    { id: "decision", label: "Decision" },
  ]

  const getStepState = (stepId: string) => {
    const isInitial = ["not_started", "incomplete", "ready_to_submit"].includes(status)

    // Stage 1: Not Submitted
    if (stepId === "not_submitted") {
      return isInitial ? "current" : "completed"
    }

    // Stage 2: Submitted
    if (stepId === "submitted") {
      if (isInitial) return "inactive"
      return (status === "submitted" || status === "approved" || status === "rejected") ? "completed" : "inactive"
    }

    // Stage 3: Under Review
    if (stepId === "review") {
      if (status === "approved" || status === "rejected") return "completed"
      if (status === "submitted") return "current"
      return "inactive"
    }

    // Stage 4: Decision
    if (stepId === "decision") {
      if (status === "approved") return "completed"
      if (status === "rejected") return "rejected"
      return "inactive"
    }

    return "inactive"
  }

  return (
    <div className="relative flex items-center justify-between w-full px-1 py-4 mt-2">
      {/* Background Progress Line */}
      <div className="absolute top-[30px] left-8 right-8 h-0.5 bg-gray-100 z-0">
        <div 
          className="h-full transition-all duration-700 bg-emerald-500" 
          style={{ 
            // Logic for 4 nodes: 0% -> 33% -> 66% -> 100%
            width: ["not_started", "incomplete", "ready_to_submit"].includes(status) ? "0%" : 
                   status === "submitted" ? "66%" : "100%" 
          }}
        />
      </div>

      {steps.map((step) => {
        const state = getStepState(step.id)

        return (
          <div key={step.id} className="relative flex flex-col items-center z-10 bg-transparent px-1">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-500 bg-white ${
                state === "completed"
                  ? "border-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.2)]"
                  : state === "rejected"
                  ? "border-red-500"
                  : state === "current"
                  ? "border-amber-500 animate-pulse"
                  : "border-gray-200"
              }`}
            >
              {state === "completed" ? (
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              ) : state === "current" ? (
                // Use a folder/question icon for unsubmitted state
                step.id === "not_submitted" ? <FileQuestion className="h-4 w-4 text-amber-500" /> : <Clock className="h-4 w-4 text-amber-500" />
              ) : state === "rejected" ? (
                <XCircle className="h-4 w-4 text-red-500" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-gray-200" />
              )}
            </div>
            
            <span
              className={`mt-2 text-[9px] font-black uppercase tracking-tighter text-center leading-none transition-colors duration-500 ${
                state === "completed"
                  ? "text-emerald-600"
                  : state === "rejected"
                  ? "text-red-600"
                  : state === "current"
                  ? "text-amber-600"
                  : "text-gray-400"
              }`}
            >
              {step.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}