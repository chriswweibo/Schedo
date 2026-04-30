'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

interface SearchFiltersProps {
  initialValues: { keyword?: string; location?: string; date?: string }
}

export function SearchFilters({ initialValues }: SearchFiltersProps) {
  const router = useRouter()
  const [keyword, setKeyword] = useState(initialValues.keyword ?? '')
  const [location, setLocation] = useState(initialValues.location ?? '')
  const [date, setDate] = useState(initialValues.date ?? '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (location) params.set('location', location)
    if (date) params.set('date', date)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-2">
      <Input
        placeholder="Service type"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="w-48"
      />
      <Input
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="w-48"
      />
      <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
      <Button type="submit">Search</Button>
    </form>
  )
}
