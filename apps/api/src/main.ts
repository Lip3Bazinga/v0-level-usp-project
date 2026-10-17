import "reflect-metadata"
import { NestFactory } from "@nestjs/core"
import type { NestExpressApplication } from "@nestjs/platform-express"
import { AppModule } from "./app.module"
import { configureApp } from "./bootstrap"

async function main() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bufferLogs: true, bodyParser: false })
  const env = configureApp(app)
  await app.listen(env.PORT, "0.0.0.0")
}

void main()
