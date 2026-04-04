import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { EntitiesCsvImporter } from "@/components/entities-csv-importer"
import { ContractsCsvImporter } from "@/components/contracts-csv-importer"

export default function ImportarPage() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">Importación Masiva</h1>
        <p className="text-muted-foreground">
          Cargá múltiples registros desde archivos CSV. Descargá la plantilla, completá los datos y subí el archivo.
        </p>
      </div>

      <Tabs defaultValue="arrendatarios">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="arrendatarios">Arrendatarios</TabsTrigger>
          <TabsTrigger value="arrendadores">Arrendadores</TabsTrigger>
          <TabsTrigger value="garantes">Garantes</TabsTrigger>
          <TabsTrigger value="contratos">Contratos</TabsTrigger>
        </TabsList>

        <TabsContent value="arrendatarios" className="mt-4">
          <EntitiesCsvImporter type="tenants" />
        </TabsContent>
        <TabsContent value="arrendadores" className="mt-4">
          <EntitiesCsvImporter type="landlords" />
        </TabsContent>
        <TabsContent value="garantes" className="mt-4">
          <EntitiesCsvImporter type="guarantors" />
        </TabsContent>
        <TabsContent value="contratos" className="mt-4">
          <ContractsCsvImporter />
        </TabsContent>
      </Tabs>
    </div>
  )
}
