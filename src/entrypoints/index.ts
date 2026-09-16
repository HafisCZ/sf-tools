import "~/styles/main.css"
import IndexPage from "~/pages/index/IndexPage.vue"
import { createPage } from "~/pages/pages"

void createPage({ name: "index" }, IndexPage)
