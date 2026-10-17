import { Global, Module } from "@nestjs/common"
import { CODE_RUNNER, RUNNER_HEALTH } from "./code-runner"
import { RunnerClient } from "./runner.client"

@Global()
@Module({
  providers: [
    RunnerClient,
    { provide: CODE_RUNNER, useExisting: RunnerClient },
    { provide: RUNNER_HEALTH, useExisting: RunnerClient },
  ],
  exports: [RunnerClient, CODE_RUNNER, RUNNER_HEALTH],
})
export class RunnerModule {}
