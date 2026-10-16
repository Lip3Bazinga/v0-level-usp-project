import { Global, Module } from "@nestjs/common"
import { RunnerClient } from "./runner.client"

@Global()
@Module({ providers: [RunnerClient], exports: [RunnerClient] })
export class RunnerModule {}
