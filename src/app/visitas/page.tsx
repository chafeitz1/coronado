import { Metadata } from 'next'
import TrackingPage from '@/components/tracking/TrackingPage'

export const metadata: Metadata = { title: 'Visitas — Bonsai' }

export default function VisitasPage() {
  return <TrackingPage />
}
