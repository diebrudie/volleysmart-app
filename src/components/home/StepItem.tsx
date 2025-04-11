
interface StepItemProps {
  number: number;
  title: string;
  description: string;
}

const StepItem = ({ number, title, description }: StepItemProps) => {
  return (
    <li className="flex">
      <div className="flex-shrink-0">
        <div className="flex items-center justify-center h-12 w-12 rounded-md bg-volleyball-primary text-white text-xl font-bold">
          {number}
        </div>
      </div>
      <div className="ml-4">
        <h3 className="text-xl font-medium text-gray-900">{title}</h3>
        <p className="mt-2 text-gray-500">{description}</p>
      </div>
    </li>
  );
};

export default StepItem;
