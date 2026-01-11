import { User, Bot, Wrench } from 'lucide-react';

interface FloatingContextBadgeProps {
  eventType: string | null;
}

export function FloatingContextBadge({ eventType }: FloatingContextBadgeProps) {
  if (!eventType) return null;

  const getBadgeConfig = () => {
    switch (eventType) {
      case 'user':
        return {
          icon: <User className="w-4 h-4" />,
          label: 'User',
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
        };
      case 'assistant':
        return {
          icon: <Bot className="w-4 h-4" />,
          label: 'Assistant',
          bgColor: 'bg-purple-500',
          textColor: 'text-white',
        };
      case 'tool_use':
        return {
          icon: <Wrench className="w-4 h-4" />,
          label: 'Tool',
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
        };
      case 'tool_result':
        return {
          icon: <Wrench className="w-4 h-4" />,
          label: 'Result',
          bgColor: 'bg-gray-400',
          textColor: 'text-white',
        };
      case 'thinking':
        return {
          icon: <Bot className="w-4 h-4" />,
          label: 'Thinking',
          bgColor: 'bg-gray-300',
          textColor: 'text-gray-700',
        };
      default:
        return null;
    }
  };

  const config = getBadgeConfig();
  if (!config) return null;

  return (
    <div className="fixed top-20 right-6 z-50 pointer-events-none">
      <div
        className={`${config.bgColor} ${config.textColor} rounded-full px-3 py-2 shadow-lg flex items-center gap-2 text-sm font-medium animate-in fade-in slide-in-from-right-2 duration-200`}
      >
        {config.icon}
        <span className="hidden sm:inline">{config.label}</span>
      </div>
    </div>
  );
}
