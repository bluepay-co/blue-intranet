import { useEffect, useState, useCallback } from 'react'
import { Newspaper } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import PageHeader from '@/components/layout/PageHeader'
import PostCard from '@/components/blog/PostCard'
import { listarFeed } from '@/api/modules/blog'

export default function Blog() {
  const [posts, setPosts]         = useState([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro]           = useState('')

  const buscar = useCallback(async () => {
    setErro('')
    try {
      const data = await listarFeed()
      setPosts(data)
    } catch {
      setErro('Não foi possível carregar o blog. Tente novamente.')
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { buscar() }, [buscar])

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Blog"
        subtitle="Novidades e comunicados do time de Marketing."
      />

      {carregando && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <div className="h-52 rounded-t-xl bg-muted" />
              <CardContent className="space-y-2 py-4">
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {!carregando && erro && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <p className="text-sm text-destructive">{erro}</p>
            <Button variant="outline" size="sm" onClick={buscar}>
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && posts.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid size-12 place-items-center rounded-full bg-muted">
              <Newspaper className="size-6 text-muted-foreground" />
            </div>
            <p className="font-medium">Nenhuma publicação ainda</p>
            <p className="text-sm text-muted-foreground">
              Em breve o Marketing trará novidades por aqui.
            </p>
          </CardContent>
        </Card>
      )}

      {!carregando && !erro && posts.length > 0 && (
        <div className="mx-auto flex w-full max-w-xl flex-col gap-6">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} onReagir={buscar} />
          ))}
        </div>
      )}
    </div>
  )
}
