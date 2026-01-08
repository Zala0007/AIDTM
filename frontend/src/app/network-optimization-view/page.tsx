import type { Metadata } from 'next';
import Header from '@/components/common/Header';
import NetworkOptimizationInteractive from './components/NetworkOptimizationInteractive';

export const metadata: Metadata = {
  title: 'Network Optimization View - ClinkerFlow',
  description:
    'Visualize and optimize clinker allocation between Integrated Units and Grinding Units with comprehensive flow mapping and transportation mode analysis.',
};

export default function NetworkOptimizationViewPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="pt-24 px-lg pb-xl">
        <div className="max-w-7xl mx-auto">
          <div className="animate-entrance">
            <NetworkOptimizationInteractive />
          </div>
        </div>
      </main>
    </div>
  );
}