'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Image from 'next/image'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://ignite-education-api.onrender.com'

const formatUpcomingTime = (dateStr: string) => {
  const date = new Date(dateStr)
  const hour = date.getHours()
  const period = hour >= 12 ? 'PM' : 'AM'
  const h = hour % 12 || 12
  const day = date.getDate()
  const month = date.toLocaleDateString('en-GB', { month: 'short' })
  return `${day}-${month} at ${h}${period}`
}

const DEFAULT_SIZE = 80

interface CoachAvailabilityProps {
  courseId: string
  imageUrl?: string
  coachName: string
  coachPosition?: string
}

export default function CoachAvailability({ courseId, imageUrl, coachName, coachPosition }: CoachAvailabilityProps) {
  const [nextUpcoming, setNextUpcoming] = useState<string | null>(null)
  const [avatarSize, setAvatarSize] = useState(DEFAULT_SIZE)
  const tagRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch(`${API_URL}/api/office-hours/status/${encodeURIComponent(courseId)}`)
      .then(res => res.json())
      .then(data => {
        if (data.upcoming?.length > 0) {
          setNextUpcoming(data.upcoming[0].starts_at)
        }
      })
      .catch(() => {})
  }, [courseId])

  const measureTag = useCallback(() => {
    if (tagRef.current) {
      const width = tagRef.current.offsetWidth
      if (width > 0) setAvatarSize(width)
    }
  }, [])

  useEffect(() => {
    measureTag()
  }, [nextUpcoming, measureTag])

  return (
    <div className="flex flex-col items-center flex-shrink-0" style={{ width: avatarSize }}>
      {imageUrl ? (
        <Image
          src={imageUrl}
          alt={`${coachName}${coachPosition ? `, ${coachPosition}` : ''} - Course instructor at Ignite Education`}
          width={avatarSize}
          height={avatarSize}
          className="rounded object-cover object-center"
          style={{ width: avatarSize, height: avatarSize }}
        />
      ) : (
        <div className="rounded bg-gray-200" style={{ width: avatarSize, height: avatarSize }} />
      )}
      {nextUpcoming && (
        <div className="flex flex-col items-center gap-0.5 mt-1">
          <span className="text-black font-light" style={{ fontSize: '0.8rem' }}>
            Available
          </span>
          <div ref={tagRef} className="bg-black rounded-[5px] px-2 py-0.5">
            <span className="text-white whitespace-nowrap" style={{ fontSize: '0.8rem', fontWeight: 500, letterSpacing: '-0.01em' }}>
              {formatUpcomingTime(nextUpcoming)}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
