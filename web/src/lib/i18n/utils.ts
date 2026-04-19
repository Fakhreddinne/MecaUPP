type MessageTree = Record<string, unknown>;

export function formatMessage(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
}

export function getByPath<T>(object: MessageTree, path: string): T {
  const result = path.split(".").reduce<unknown>((current, key) => {
    if (!current || typeof current !== "object") {
      return undefined;
    }

    return (current as MessageTree)[key];
  }, object);

  return result as T;
}
