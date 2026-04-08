import { Request, Response } from 'express';

interface Metric {
  name: string;
  help: string;
  type: 'counter' | 'gauge' | 'histogram';
  values: Map<string, number>;
}

const registry = new Map<string, Metric>();

function getOrCreate(name: string, help: string, type: Metric['type']): Metric {
  if (!registry.has(name)) {
    registry.set(name, { name, help, type, values: new Map() });
  }
  return registry.get(name)!;
}

export function incCounter(name: string, labels: Record<string, string> = {}, help = '') {
  const m = getOrCreate(name, help, 'counter');
  const key = Object.entries(labels).sort().map(([k, v]) => `${k}="${v}"`).join(',');
  m.values.set(key, (m.values.get(key) || 0) + 1);
}

export function setGauge(name: string, value: number, labels: Record<string, string> = {}, help = '') {
  const m = getOrCreate(name, help, 'gauge');
  const key = Object.entries(labels).sort().map(([k, v]) => `${k}="${v}"`).join(',');
  m.values.set(key, value);
}

export function metricsHandler(_req: Request, res: Response) {
  const lines: string[] = [];
  for (const [, metric] of registry) {
    if (metric.help) lines.push(`# HELP ${metric.name} ${metric.help}`);
    lines.push(`# TYPE ${metric.name} ${metric.type}`);
    for (const [labels, value] of metric.values) {
      const labelStr = labels ? `{${labels}}` : '';
      lines.push(`${metric.name}${labelStr} ${value}`);
    }
  }
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(lines.join('\n') + '\n');
}
