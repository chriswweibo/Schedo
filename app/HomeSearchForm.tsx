'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/button'

export function HomeSearchForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [date, setDate] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (name) params.set('name', name)
    if (date) params.set('date', date)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <Input
        id="name"
        label="Provider name"
        placeholder="Search by provider name"
        value={name}
        onChange={(e) => setName(e.target.value)}
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
