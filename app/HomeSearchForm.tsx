'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export function HomeSearchForm() {
  const router = useRouter()
  const [keyword, setKeyword] = useState('')
  const [location, setLocation] = useState('')
  const [date, setDate] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (location) params.set('location', location)
    if (date) params.set('date', date)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Input
        id="keyword"
        label="Service"
        placeholder="What service do you need?"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="flex-1"
      />
      <Input
        id="location"
        label="Location"
        placeholder="Location"
        value={location}
        onChange={(e) => setLocation(e.target.value)}
        className="flex-1"
      />
      <Input
        id="date"
        label="Date"
        type="date"
        value={date}
        min={new Date().toISOString().split('T')[0]}
        onChange={(e) => setDate(e.target.value)}
        className="w-40"
      />
      <Button type="submit" className="shrink-0">
        Search
      </Button>
    </form>
  )
}
