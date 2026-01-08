import type { Metadata } from 'next';
import Header from '@/components/common/Header';
import SustainabilityDashboardInteractive from './components/SustainabilityDashboardInteractive';
import type { TransportDataPoint } from '@/lib/optimizerApi';

export const metadata: Metadata = {
  title: 'Sustainability Impact Dashboard - ClinkerFlow',
  description: 'Analyze transportation emissions, carbon footprint trade-offs, and environmental impact across cement manufacturing operations.',
};

export default function SustainabilityImpactDashboardPage() {
  const mockTransportData: TransportDataPoint[] = [
    {
      id: 'rail-001',
      mode: 'rail',
      distance: 320,
      tonnage: 5000,
      co2PerTonKm: 0.032,
      totalEmissions: 51200,
      cost: 145000,
      carbonIntensity: 0.353,
    },
    {
      id: 'road-001',
      mode: 'road',
      distance: 280,
      tonnage: 3500,
      co2PerTonKm: 0.089,
      totalEmissions: 87220,
      cost: 178000,
      carbonIntensity: 0.490,
    },
    {
      id: 'rail-002',
      mode: 'rail',
      distance: 295,
      tonnage: 4500,
      co2PerTonKm: 0.030,
      totalEmissions: 39825,
      cost: 132000,
      carbonIntensity: 0.302,
    },
    {
      id: 'multimodal-001',
      mode: 'multimodal',
      distance: 410,
      tonnage: 4000,
      co2PerTonKm: 0.055,
      totalEmissions: 90200,
      cost: 168000,
      carbonIntensity: 0.420,
    },
    {
      id: 'road-002',
      mode: 'road',
      distance: 195,
      tonnage: 2800,
      co2PerTonKm: 0.092,
      totalEmissions: 50232,
      cost: 124000,
      carbonIntensity: 0.443,
    },
    {
      id: 'rail-003',
      mode: 'rail',
      distance: 385,
      tonnage: 5200,
      co2PerTonKm: 0.028,
      totalEmissions: 56056,
      cost: 158000,
      carbonIntensity: 0.304,
    },
    {
      id: 'multimodal-002',
      mode: 'multimodal',
      distance: 340,
      tonnage: 3800,
      co2PerTonKm: 0.058,
      totalEmissions: 74936,
      cost: 152000,
      carbonIntensity: 0.400,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-24 pb-12 px-lg">
        <div className="max-w-[1600px] mx-auto">
          <SustainabilityDashboardInteractive initialData={mockTransportData} />
        </div>
      </main>
    </div>
  );
}
