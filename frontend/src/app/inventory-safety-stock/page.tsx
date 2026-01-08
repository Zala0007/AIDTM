import type { Metadata } from 'next';
import InventorySafetyStockInteractive from './components/InventorySafetyStockInteractive';

export const metadata: Metadata = {
  title: 'Inventory & Safety Stock Intelligence - ClinkerFlow',
  description: 'Monitor inventory levels, safety stock baselines, and risk thresholds across all cement manufacturing units with comprehensive time-series analysis and real-time alerts.',
};

export default function InventorySafetyStockPage() {
  return <InventorySafetyStockInteractive />;
}