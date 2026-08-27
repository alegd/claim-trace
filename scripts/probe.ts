import { embed } from '../src/lib/llm'

async function runProbe(): Promise<void> {
  const [vector] = await embed(['hello'])
  console.log(vector.length)
}

runProbe()
