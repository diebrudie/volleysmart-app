
import { LucideIcon } from "lucide-react";

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

const FeatureCard = ({ icon: Icon, title, description }: FeatureCardProps) => {
  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="h-12 w-12 bg-volleyball-primary/10 rounded-lg flex items-center justify-center mb-5">
        <Icon className="h-6 w-6 text-volleyball-primary" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900">{title}</h3>
      <p className="mt-2 text-gray-500">{description}</p>
    </div>
  );
};

export default FeatureCard;
