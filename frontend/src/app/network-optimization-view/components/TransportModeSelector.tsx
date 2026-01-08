'use client';


import Icon from '@/components/ui/AppIcon';

export type TransportMode = 'all' | 'rail' | 'road';

interface TransportModeOption {
  id: TransportMode;
  label: string;
  icon: string;
  color: string;
}

interface TransportModeSelectorProps {
  selectedMode: TransportMode;
  onModeChange: (mode: TransportMode) => void;
  className?: string;
}

const TransportModeSelector = ({
  selectedMode,
  onModeChange,
  className = '',
}: TransportModeSelectorProps) => {
  const modes: TransportModeOption[] = [
    {
      id: 'all',
      label: 'All Modes',
      icon: 'Squares2X2Icon',
      color: 'text-foreground',
    },
    {
      id: 'rail',
      label: 'T1 (Rail)',
      icon: 'TrainIcon',
      color: 'text-accent',
    },
    {
      id: 'road',
      label: 'T2 (Road)',
      icon: 'TruckIcon',
      color: 'text-warning',
    },
  ];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {modes.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          className={`flex items-center gap-2 px-4 py-2 rounded-md font-body font-medium text-sm transition-smooth interactive-lift focus-ring ${
            selectedMode === mode.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-foreground hover:bg-muted border border-border'
          }`}
          aria-label={`Filter by ${mode.label}`}
        >
          <Icon
            name={mode.icon as any}
            size={18}
            className={selectedMode === mode.id ? '' : mode.color}
          />
          <span>{mode.label}</span>
        </button>
      ))}
    </div>
  );
};

export default TransportModeSelector;