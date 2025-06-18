'use client';

import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';

// Dynamically import Plotly to avoid SSR issues
const Plot = dynamic(() => import('react-plotly.js'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-arena-secondary animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-arena-text-muted">Loading chart...</div>
    </div>
  )
});

interface PlotlyChartProps {
  data: any[];
  layout?: any;
  config?: any;
  className?: string;
}

export function PlotlyChart({ data, layout = {}, config = {}, className = "h-96" }: PlotlyChartProps) {
  const defaultLayout = {
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    font: {
      color: '#e0e0e0',
      family: 'Inter, system-ui, sans-serif'
    },
    xaxis: {
      gridcolor: '#333333',
      zerolinecolor: '#333333',
      tickcolor: '#666666',
      linecolor: '#333333',
      ...layout.xaxis
    },
    yaxis: {
      gridcolor: '#333333',
      zerolinecolor: '#333333',
      tickcolor: '#666666',
      linecolor: '#333333',
      ...layout.yaxis
    },
    legend: {
      font: { color: '#e0e0e0' },
      bgcolor: 'rgba(26, 26, 26, 0.8)',
      bordercolor: '#333333',
      borderwidth: 1,
      ...layout.legend
    },
    margin: {
      l: 50,
      r: 30,
      t: 50,
      b: 50,
      ...layout.margin
    },
    ...layout
  };

  const defaultConfig = {
    displayModeBar: false,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    displaylogo: false,
    toImageButtonOptions: {
      format: 'png',
      filename: 'arena-terminal-chart',
      height: 500,
      width: 700,
      scale: 1
    },
    ...config
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      className={`${className} w-full`}
    >
      <Plot
        data={data}
        layout={defaultLayout}
        config={defaultConfig}
        style={{ width: '100%', height: '100%' }}
        useResizeHandler={true}
      />
    </motion.div>
  );
}