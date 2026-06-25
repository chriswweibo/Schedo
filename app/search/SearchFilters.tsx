'use client'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Field } from '@/components/ui/field'
import { Button } from '@/components/ui/button'

interface SearchFiltersProps {
  initialValues: { keyword?: string; name?: string; date?: string }
}

export function SearchFilters({ initialValues }: SearchFiltersProps) {
  const router = useRouter()
  const [keyword, setKeyword] = useState(initialValues.keyword ?? '')
  const [name, setName] = useState(initialValues.name ?? '')
  const [date, setDate] = useState(initialValues.date ?? '')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (keyword) params.set('keyword', keyword)
    if (name) params.set('name', name)
    if (date) params.set('date', date)
    router.push(`/search?${params.toString()}`)
  }

  return (
    <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-2">
      <Field
        label="Service type"
        placeholder="e.g. Plumber"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        className="w-48"
      />
      <Field
        label="Provider name"
        placeholder="Provider name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="w-40"
      />
      <Field type="date" aria-label="Date" value={date} onChange={(e) => setDate(e.target.value)} className="w-40" />
      <Button type="submit">Search</Button>
    </form>
  )
}
