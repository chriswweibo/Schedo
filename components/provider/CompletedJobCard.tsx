import Image from 'next/image'
import { Card } from '@/components/ui/Card'
import { format } from 'date-fns'

interface CompletedJobCardProps {
  title: string
  description?: string | null
  imageUrl?: string | null
  completedAt: string | Date
}

export function CompletedJobCard({ title, description, imageUrl, completedAt }: CompletedJobCardProps) {
  return (
    <Card className="overflow-hidden">
      {imageUrl && (
        <div className="relative h-40 w-full">
          <Image src={imageUrl} alt={title} fill className="object-cover" />
        </div>
      )}
      <div className="p-4">
        <p className="font-semibold">{title}</p>
        {description && <p className="mt-1 text-sm text-stone-500">{description}</p>}
        <p className="mt-2 text-xs text-stone-400">
          {format(new Date(completedAt), 'MMMM yyyy')}
        </p>
      </div>
    </Card>
  )
}
