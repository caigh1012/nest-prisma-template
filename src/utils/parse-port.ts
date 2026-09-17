export function parsePort(value: string | undefined, configKey = 'PORT') {
  if (!value) {
    return undefined;
  }

  const port = Number.parseInt(value, 10);

  if (Number.isNaN(port)) {
    throw new Error(`${configKey} must be a valid number`);
  }

  return port;
}
