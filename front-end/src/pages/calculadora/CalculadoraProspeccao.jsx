import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import PageHeader from '@/components/layout/PageHeader'
import ModuloDesoneracao from '@/components/calculadora/ModuloDesoneracao'
import ModuloLucroReal from '@/components/calculadora/ModuloLucroReal'
import ModuloPJ from '@/components/calculadora/ModuloPJ'

export default function CalculadoraProspeccao() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Calculadora de Prospecção"
        subtitle="Simulação de remuneração inteligente BluePay — os valores são ilustrativos e não são armazenados."
      />

      <Tabs defaultValue="desoneracao">
        <TabsList>
          <TabsTrigger value="desoneracao">Desoneração CLT</TabsTrigger>
          <TabsTrigger value="lucroreal">Lucro Real</TabsTrigger>
          <TabsTrigger value="pj">PJ &amp; Parceiros</TabsTrigger>
        </TabsList>

        <TabsContent value="desoneracao" className="mt-6">
          <ModuloDesoneracao />
        </TabsContent>
        <TabsContent value="lucroreal" className="mt-6">
          <ModuloLucroReal />
        </TabsContent>
        <TabsContent value="pj" className="mt-6">
          <ModuloPJ />
        </TabsContent>
      </Tabs>
    </div>
  )
}
