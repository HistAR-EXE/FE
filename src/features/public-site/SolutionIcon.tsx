const paths: Record<string, string[]> = {
  museum: ['M3 9 12 3l9 6H3Z', 'M5 11v8m5-8v8m4-8v8m5-8v8M3 21h18'],
  '360': ['M3 12a9 9 0 1 0 9-9', 'M3 4v6h6', 'M12 6v12m-6-6h12', 'M12 3c5 5 5 13 0 18'],
  layers: ['m12 3 10 5-10 5L2 8l10-5Z', 'm2 12 10 5 10-5', 'm2 16 10 5 10-5'],
  record_voice_over: ['M5 4h14v11H9l-4 4V4Z', 'M9 8v3m3-5v7m3-5v3', 'M17 18h4m-2-2v4'],
  analytics: ['M4 3v18h17', 'M8 16v-4m5 4V8m5 8V5', 'm7 8 5-4 5-1'],
}

export function SolutionIcon({ name }: { name: string }) {
  return <span className="heritage-solution-icon" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{(paths[name] ?? paths.layers).map((d, i) => <path key={i} d={d} />)}</svg></span>
}
