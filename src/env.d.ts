// Lets tools without Vue support (oxlint type-aware) type .vue imports, vue-tsc resolves the real files
declare module "*.vue" {
  import type { DefineComponent } from "vue"
  const component: DefineComponent
  export default component
}
