type Props = {
  lat: number
  lng: number
  title?: string
}

export default function OsmLocationMap({ lat, lng, title }: Props) {
  const delta = 0.018
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - delta}%2C${lat - delta}%2C${lng + delta}%2C${lat + delta}&layer=mapnik&marker=${lat}%2C${lng}`

  return (
    <iframe
      title={title || 'Project location map'}
      className="absolute inset-0 h-full w-full border-0"
      src={src}
    />
  )
}
