export interface EnrichmentResult {
  imageUrl: string
  releaseYear: number | null
  synopsis: string
  genres: string[]
  sourceId: string
  extra: Record<string, any>
}
