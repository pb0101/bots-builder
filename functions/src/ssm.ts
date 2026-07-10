import { SSMClient, GetParameterCommand } from "@aws-sdk/client-ssm";

const ssm = new SSMClient({});
const cache = new Map<string, string>();

/** Read a SecureString param once per container lifetime. */
export async function getParam(name: string): Promise<string> {
  const hit = cache.get(name);
  if (hit) return hit;
  const res = await ssm.send(
    new GetParameterCommand({ Name: name, WithDecryption: true })
  );
  const value = res.Parameter?.Value;
  if (!value) throw new Error(`SSM parameter ${name} is empty`);
  cache.set(name, value);
  return value;
}
