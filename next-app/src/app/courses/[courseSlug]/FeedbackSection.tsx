interface FeedbackSectionProps {
  courseTitle: string
}

export default function FeedbackSection({ courseTitle }: FeedbackSectionProps) {
  return (
    <div className="mt-9 mb-8">
      <h2 className="font-bold text-gray-900 mb-2" style={{ fontSize: '28px', letterSpacing: '-0.02em' }}>
        Feedback
      </h2>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/trustpilot-logo.svg"
        alt="Trustpilot"
        width={160}
        height={39}
        className="mb-3"
      />
      <div className="bg-[#F0F0F2] p-6 rounded-lg">
        <p className="text-black text-lg font-medium">
          &ldquo;The {courseTitle} course was great! For someone new to the topic, this is a great introduction and allowed me to connect with the community&rdquo;
        </p>
      </div>
    </div>
  )
}
