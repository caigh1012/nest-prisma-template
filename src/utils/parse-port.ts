export function parsePort(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const port = Number.parseInt(value, 10);

  if (Number.isNaN(port)) {
    throw new Error('MINIO_PORT must be a valid number');
  }

  return port;
}
