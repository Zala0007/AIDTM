import type { Metadata } from 'next';
import Header from '@/components/common/Header';
import ScenarioRiskInteractive from './components/ScenarioRiskInteractive';

export const metadata: Metadata = {
  title: 'Scenario Risk Analysis - ClinkerFlow',
  description: 'Compare multiple optimization scenarios and analyze cost-risk trade-offs for strategic cement manufacturing planning.',
};

export default function ScenarioRiskAnalysisPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-lg">
        <div className="max-w-7xl mx-auto">
          <ScenarioRiskInteractive />
        </div>
      </main>
    </div>
  );
}