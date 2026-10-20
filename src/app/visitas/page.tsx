import { Metadata } from 'next'
import TrackingPage from '@/components/tracking/TrackingPage'

export const metadata: Metadata = { title: 'Tracking Assist. — Bonsai' }

export default function VisitasPage() {
  return <TrackingPage />
}
