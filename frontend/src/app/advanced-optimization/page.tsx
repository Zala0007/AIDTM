import type { Metadata } from 'next';
import Header from '@/components/common/Header';
import AdvancedOptimizationInteractive from './components/AdvancedOptimizationInteractive';

export const metadata: Metadata = {
  title: 'Advanced Optimization - ClinkerFlow',
  description: 'Industry-grade MILP optimization with intelligent data generation and comprehensive analytics for clinker supply chain management.',
};

export default function AdvancedOptimizationPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-lg">
        <div className="max-w-7xl mx-auto">
          <AdvancedOptimizationInteractive />
        </div>
      </main>
    </div>
  );
}
